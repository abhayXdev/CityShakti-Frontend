"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { Complaint, Notification } from "@/lib/data"

import { loginApi, getComplaintsApi, getWardComplaintsApi, updateComplaintStatusApi, getMeApi, createComplaintApi, upvoteComplaintApi, adminAssignComplaintApi, addProgressUpdateApi, closeComplaintApi, reEscalateComplaintApi } from "@/lib/api"

type AuthUser = {
  role: "citizen" | "officer" | "sudo"
  name: string
  id: string
  token: string
  ward?: string
  department?: string
} | null

type AppContextType = {
  user: AuthUser
  login: (role: "citizen" | "officer" | "sudo", username: string, password: string) => Promise<boolean>
  logout: () => void
  complaints: Complaint[]
  wardComplaints: Complaint[]
  outOfBoundComplaints: Complaint[]
  notifications: Notification[]
  updateComplaintStatus: (id: string, status: Complaint["status"]) => void
  closeComplaint: (id: string) => Promise<void>
  reEscalateComplaint: (id: string) => Promise<void>
  createComplaint: (payload: { title: string; description: string; ward: string; category: string; latitude?: number; longitude?: number; photo_url?: string }) => Promise<void>
  upvoteComplaint: (id: string) => Promise<boolean>
  adminAssignComplaint: (id: string, assignedTo: string, department: string) => Promise<void>
  addProgressUpdate: (id: string, payload: { phase: string, note?: string, photo_url?: string }) => Promise<void>
  addNotification: (notification: Notification) => void
  markNotificationRead: (id: string) => void
  activeView: string
  setActiveView: (view: string) => void
  token: string | null
  upvotedIds: Set<string>
  isRestoring: boolean
}

const AppContext = createContext<AppContextType | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null)
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [wardComplaints, setWardComplaints] = useState<Complaint[]>([])
  const [outOfBoundComplaints, setOutOfBoundComplaints] = useState<Complaint[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [activeView, setActiveView] = useState("dashboard")
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set())
  const [isRestoring, setIsRestoring] = useState(true)

  // Session persistence on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("token")
    if (savedToken && !user) {
      // Attempt to restore session
      getMeApi(savedToken)
        .then((profile) => {
          setUser({
            role: profile.role as "citizen" | "officer" | "sudo",
            name: profile.full_name,
            id: String(profile.id),
            token: savedToken,
            ward: profile.ward || undefined,
            department: profile.department || undefined,
          })

          // Re-fetch base data
          getComplaintsApi(savedToken).then(setComplaints).catch(console.error)

          if (profile.role === "citizen") {
            const ward = profile.ward || "Ward 4"
            getWardComplaintsApi(savedToken, ward)
              .then(setWardComplaints)
              .catch(console.error)

            // Fetch User's previously upvoted complaint IDs from backend
            // This is done here as well as in login to cover session restoration
            fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/complaints/user/upvotes`, {
              headers: { Authorization: `Bearer ${savedToken}` }
            })
              .then(res => res.ok ? res.json() : Promise.reject(res))
              .then(votedIds => setUpvotedIds(new Set(votedIds.map(String))))
              .catch(e => console.error("Failed to load upvoted IDs on restore", e));
          }

          if (profile.role === "officer") {
            getComplaintsApi(savedToken, true)
              .then(setOutOfBoundComplaints)
              .catch(console.error)
          }
        })
        .catch((err) => {
          console.error("Failed to restore session", err)
          localStorage.removeItem("token")
        })
        .finally(() => {
          setIsRestoring(false)
        })
    } else {
      setIsRestoring(false)
    }
  }, [])

  // Generate dynamic notifications from real database records
  useEffect(() => {
    const sourceData = user?.role === "sudo" ? complaints : wardComplaints;
    const generatedNotifs: Notification[] = [];

    sourceData.forEach(c => {
      generatedNotifs.push({
        id: `notif-new-${c.id}`,
        type: "new-complaint",
        message: `New issue "${c.title}" reported in ${c.location.area}.`,
        timestamp: c.createdAt,
        read: false
      });
      if (c.status === "resolved") {
        generatedNotifs.push({
          id: `notif-res-${c.id}`,
          type: "resolved",
          message: `Complaint "${c.title}" was successfully resolved!`,
          timestamp: c.updatedAt || c.createdAt,
          read: false
        });
      }
    });

    generatedNotifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setNotifications(generatedNotifs.slice(0, 20));
  }, [complaints, wardComplaints, user?.role]);

  const login = useCallback(
    async (role: string, username: string, password: string): Promise<boolean> => {
      try {
        const data = await loginApi(username, password, role as "citizen" | "officer" | "sudo")
        const token = data.access_token

        // Fetch real user profile to get role, name, id
        let profile: { role: string; full_name: string; id: number; ward?: string; department?: string } | null = null
        try {
          profile = await getMeApi(token)
        } catch {
          // fallback if /me fails
        }

        // Frontend guard: if actual role doesn't match selected tab, reject immediately
        if (profile && profile.role !== role) {
          const correct = profile.role === "sudo" ? "Sudo" : (profile.role === "officer" ? "Officer" : "Citizen")
          throw new Error(`This account is registered as '${profile.role}'. Please select the '${correct}' tab to sign in.`)
        }

        // Store token for session persistence
        localStorage.setItem("token", token)

        setUser({
          role: (profile?.role || role || "citizen") as "citizen" | "officer" | "sudo",
          name: profile?.full_name || username,
          id: String(profile?.id || username),
          token,
          ward: (profile as any)?.ward || undefined,
          department: (profile as any)?.department || undefined,
        })

        // Fetch the user's complaints
        const liveComplaints = await getComplaintsApi(token)
        setComplaints(liveComplaints)

        // If the user is a citizen, fetch the community ward complaints
        if ((profile?.role || role) === "citizen") {
          try {
            const userWard = (profile as any)?.ward || (liveComplaints.length > 0 ? liveComplaints[0].location.area : "Ward 4")
            const wComplaints = await getWardComplaintsApi(token, userWard)
            setWardComplaints(wComplaints)

            // Fetch User's previously upvoted complaint IDs from backend
            try {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/complaints/user/upvotes`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (res.ok) {
                const votedIds = await res.json();
                setUpvotedIds(new Set(votedIds.map(String)));
              }
            } catch (e) {
              console.error("Failed to load user upvotes on login", e);
            }
          } catch (err) {
            console.error("Failed to load community complaints", err)
          }
        }

        if ((profile?.role || role) === "officer") {
          try {
            const oobComplaints = await getComplaintsApi(token, true)
            setOutOfBoundComplaints(oobComplaints)
          } catch (err) {
            console.error("Failed to load out of bound complaints", err)
          }
        }

        return true
      } catch (err: any) {
        console.error("Login failed", err)
        // Re-throw with the specific error message so the UI can display it
        throw new Error(err?.message || "Login failed. Please try again.")
      }
    },
    []
  )
  const logout = useCallback(() => {
    localStorage.removeItem("token")
    setUser(null)
    setComplaints([])
    setWardComplaints([])
    setOutOfBoundComplaints([])
    setUpvotedIds(new Set())
    setActiveView("dashboard")
  }, [])

  const updateComplaintStatus = useCallback(
    async (id: string, status: Complaint["status"]) => {
      // Optimistic update
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c
        )
      )

      if (!user?.token) return

      try {
        await updateComplaintStatusApi(user.token, id, status)
      } catch (err) {
        console.error("Failed to update status on server", err)
      }
    },
    [user]
  )

  const closeComplaint = useCallback(
    async (id: string) => {
      // Optimistic update
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status: "closed", updatedAt: new Date().toISOString() } : c
        )
      )

      if (!user?.token) return

      try {
        await closeComplaintApi(user.token, id)
      } catch (err) {
        console.error("Failed to close complaint on server", err)
      }
    },
    [user]
  )

  const reEscalateComplaint = useCallback(
    async (id: string) => {
      // Optimistic update
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status: "in-progress", updatedAt: new Date().toISOString() } : c
        )
      )

      if (!user?.token) return

      try {
        await reEscalateComplaintApi(user.token, id)
      } catch (err) {
        console.error("Failed to re-escalate complaint on server", err)
        throw err
      }
    },
    [user]
  )

  const createComplaint = useCallback(
    async (payload: { title: string; description: string; ward: string; category: string; latitude?: number; longitude?: number; photo_url?: string }) => {
      if (!user?.token) throw new Error("Not logged in")
      const newComplaint = await createComplaintApi(user.token, payload)
      setComplaints((prev) => [newComplaint, ...prev])
    },
    [user]
  )

  const upvoteComplaint = useCallback(async (id: string) => {
    if (!user?.token) return false

    // Check if upvoted in this session to prevent spam
    if (upvotedIds.has(id)) {
      console.warn("Already upvoted this session")
      return false
    }

    // Add to local session tracker to instantly block duplicate clicks
    setUpvotedIds(prev => new Set(prev).add(id))

    // Optimistically update both personal and community arrays
    const optimisticUpdate = (c: Complaint) => c.id === id ? { ...c, upvotes: (c.upvotes || 0) + 1, impactScore: (c.impactScore || 0) + 0.5 } : c
    setComplaints((prev) => prev.map(optimisticUpdate))
    setWardComplaints((prev) => prev.map(optimisticUpdate))

    try {
      await upvoteComplaintApi(user.token, id)
      return true
    } catch (err) {
      console.error("Failed to upvote", err)
      // Revert optimistic update and session tracker on failure
      setUpvotedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      const revertUpdate = (c: Complaint) => c.id === id ? { ...c, upvotes: Math.max(0, (c.upvotes || 0) - 1), impactScore: Math.max(0, (c.impactScore || 0) - 0.5) } : c
      setComplaints((prev) => prev.map(revertUpdate))
      setWardComplaints((prev) => prev.map(revertUpdate))
      return false
    }
  }, [user, upvotedIds])

  const adminAssignComplaint = useCallback(async (id: string, assignedTo: string, department: string) => {
    if (!user?.token) return
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, assignedOfficer: assignedTo, department: department, status: c.status === "pending" ? "in-progress" : c.status } : c
      )
    )
    try {
      await adminAssignComplaintApi(user.token, id, assignedTo, department)
    } catch (err) {
      console.error("Failed to assign", err)
    }
  }, [user])

  const addProgressUpdate = useCallback(async (id: string, payload: { phase: string, note?: string, photo_url?: string }) => {
    if (!user?.token) return
    try {
      await addProgressUpdateApi(user.token, id, payload)
    } catch (err) {
      console.error("Failed to add progress", err)
      throw err
    }
  }, [user])

  const addNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => [notification, ...prev])
  }, [])

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  return (
    <AppContext.Provider
      value={{
        user,
        login,
        logout,
        complaints,
        wardComplaints,
        outOfBoundComplaints,
        notifications,
        updateComplaintStatus,
        closeComplaint,
        reEscalateComplaint,
        createComplaint,
        upvoteComplaint,
        adminAssignComplaint,
        addProgressUpdate,
        addNotification,
        markNotificationRead,
        activeView,
        setActiveView,
        token: user?.token || null,
        upvotedIds,
        isRestoring,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
