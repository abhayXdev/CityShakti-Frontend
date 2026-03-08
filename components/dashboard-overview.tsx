"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useApp } from "@/lib/app-context"
import { getStats, type ComplaintDetail, type Complaint } from "@/lib/data"
import { getComplaintDetailApi, getPendingOfficersApi, approveOfficerApi, rejectOfficerApi, deleteOfficerApi, getAdminDirectoryApi, suspendOfficerApi, unsuspendOfficerApi } from "@/lib/api"
import { fetchPincodeFromCoordinates } from "@/lib/pincode"
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ChevronUp,
  AlertCircle,
  Plus,
  XCircle,
  Image as ImageIcon,
  Shield,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import confetti from "canvas-confetti"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { formatDistanceToNow, isPast, format } from "date-fns"
import { cn } from "@/lib/utils"
import { MapPin, Maximize2 } from "lucide-react"

function AnimatedCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])

  return <span>{count.toLocaleString()}</span>
}

const RANGOLI_PATTERN = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ff9933' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`

const priorityColors = {
  high: "bg-[#FF9933]/10 text-[#FF9933] border-[#FF9933]/20",
  medium: "bg-[#F4B400]/10 text-[#F4B400] border-[#F4B400]/20",
  low: "bg-[#2B6CEE]/10 text-[#2B6CEE] border-[#2B6CEE]/20",
}

const statusColors = {
  pending: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  "in-progress": "bg-[#2B6CEE]/10 text-[#2B6CEE]",
  resolved: "bg-[#F4B400]/10 text-[#F4B400]",
  escalated: "bg-red-500/10 text-red-500",
  closed: "bg-[#138808]/20 text-[#138808] font-semibold border-[#138808]/30",
}

export function DashboardOverview({ isTrackingOnly = false }: { isTrackingOnly?: boolean }) {
  const { user, complaints, wardComplaints, outOfBoundComplaints, createComplaint, updateComplaintStatus, closeComplaint, reEscalateComplaint, addProgressUpdate, upvoteComplaint, upvotedIds, dashboardStats } = useApp()

  // Use backend stats for officers/sudo if available, otherwise fallback to local calculation
  const stats = (user?.role === "officer" || user?.role === "sudo") && dashboardStats
    ? dashboardStats
    : getStats(complaints)

  const isCitizen = user?.role === "citizen"

  if (user?.role === "sudo") {
    return <SudoDashboard />
  }

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    latitude: "" as string | number,
    longitude: "" as string | number,
    photo_url: "",
    incident_ward: "",
  })

  // Complaint Detail State
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null)
  const [complaintDetail, setComplaintDetail] = useState<ComplaintDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Image Viewer State
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerImage, setViewerImage] = useState<string | null>(null)

  const [progressPhase, setProgressPhase] = useState("update")
  const [progressNote, setProgressNote] = useState("")
  const [updateFile, setUpdateFile] = useState<File | null>(null)
  const [uploadingUpdateImage, setUploadingUpdateImage] = useState(false)
  const [isActionPending, setIsActionPending] = useState(false)

  useEffect(() => {
    if (selectedComplaintId && user?.token) {
      setLoadingDetail(true)
      getComplaintDetailApi(user.token, selectedComplaintId)
        .then(data => setComplaintDetail(data))
        .catch(err => console.error("Failed to load details", err))
        .finally(() => setLoadingDetail(false))
    } else {
      setComplaintDetail(null)
    }
  }, [selectedComplaintId, user?.token])

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = Number(position.coords.latitude.toFixed(6))
          const lon = Number(position.coords.longitude.toFixed(6))

          let incidentWard = ""
          try {
            const pin = await fetchPincodeFromCoordinates(lat, lon, user?.ward)
            if (pin) incidentWard = pin
          } catch (e) { console.error(e) }

          setFormData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lon,
            incident_ward: incidentWard
          }))
        },
        (error) => {
          console.error("Error getting location:", error)
          alert("Could not automatically fetch location. Please ensure location services are enabled or enter manually.")
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      )
    } else {
      alert("Geolocation is not supported by this browser.")
    }
  }

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (!user?.ward) {
        alert("Your profile is missing a strict PIN Code region. Please update your profile.")
        setIsSubmitting(false)
        return
      }

      let finalPhotoUrl = formData.photo_url

      // Handle actual image file upload to ImgBB if a file was selected
      if (selectedFile) {
        setUploadingImage(true)
        const imgData = new FormData()
        imgData.append("image", selectedFile)

        // Note: In a real production app, this key should be in an env var.
        // Using the ImgBB API key from environment variables.
        const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
        if (!apiKey) {
          alert("Image upload failed: ImgBB API key is missing. Please check your .env configuration.");
          setUploadingImage(false);
          setIsSubmitting(false);
          return;
        }

        const uploadRes = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
          method: "POST",
          body: imgData
        })

        if (uploadRes.ok) {
          const json = await uploadRes.json()
          finalPhotoUrl = json.data.url
        }
        setUploadingImage(false)
      }

      const payload: any = {
        title: formData.title,
        category: formData.category,
        ward: user.ward,
        description: formData.description,
      }
      if (formData.latitude !== "") payload.latitude = Number(formData.latitude)
      if (formData.longitude !== "") payload.longitude = Number(formData.longitude)
      if (formData.incident_ward !== "") payload.incident_ward = formData.incident_ward
      if (finalPhotoUrl.trim() !== "") payload.photo_url = finalPhotoUrl.trim()

      await createComplaint(payload)
      setIsDialogOpen(false)
      setFormData({ title: "", category: "", description: "", latitude: "", longitude: "", photo_url: "", incident_ward: "" })
      setSelectedFile(null)
    } catch (error: any) {
      console.error("Failed to submit complaint:", error)

      // Interactive Duplicate Recognition
      if (error.isDuplicate && error.details?.existing_complaint) {
        const existing = error.details.existing_complaint;
        const isOwn = error.details.is_own_duplicate;

        if (isOwn) {
          alert(`You have already reported this identical problem: "${existing.title}" (Status: ${existing.status}).\n\nWe are already tracking it for you in your dashboard!`);
          setIsDialogOpen(false);
          setFormData({ title: "", category: "", description: "", latitude: "", longitude: "", photo_url: "", incident_ward: "" });
          setSelectedFile(null);
          return;
        }

        const confirmUpvote = window.confirm(
          `A similar issue was already reported nearby: "${existing.title}" (Status: ${existing.status}).\n\nWould you like to UPVOTE the existing problem instead of creating a duplicate?`
        );

        if (confirmUpvote) {
          try {
            await upvoteComplaint(existing.id);
            alert("Success! You've upvoted the existing issue. This helps the authorities prioritize it faster.");
            setIsDialogOpen(false);
            setFormData({ title: "", category: "", description: "", latitude: "", longitude: "", photo_url: "", incident_ward: "" });
            setSelectedFile(null);
            return; // Exit without showing generic error
          } catch (upvoteErr) {
            console.error("Auto-upvote failed", upvoteErr);
          }
        }
      }

      alert(`Submission Failed: ${error?.message || "Please check your inputs and try again."}`)
      setUploadingImage(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const statCards = [
    {
      title: "Total Complaints",
      value: stats.total,
      icon: ClipboardList,
      trend: "+12%",
      trendUp: true,
      color: "text-chart-1",
      bg: "bg-chart-1/10",
    },
    {
      title: "Resolved",
      value: stats.resolved,
      icon: CheckCircle2,
      trend: "+8%",
      trendUp: true,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      title: "Pending",
      value: stats.pending,
      icon: Clock,
      trend: "-3%",
      trendUp: false,
      color: "text-chart-4",
      bg: "bg-chart-4/10",
    },
    {
      title: "Escalated",
      value: stats.escalated,
      icon: AlertTriangle,
      trend: "+2%",
      trendUp: true,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
  ]

  const recentComplaints = [...complaints]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15)

  // Generate trend line data by grouping citizen complaints by day
  const getDailyChartData = () => {
    const data: Record<string, { date: string, complaints: number, resolved: number }> = {}
    const today = new Date()

    // Initialize last 14 days
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      data[dateStr] = { date: dateStr, complaints: 0, resolved: 0 }
    }

    // Source data should be community-wide for global charts
    const sourceData = isCitizen && wardComplaints.length > 0 ? wardComplaints : complaints;

    sourceData.forEach((c: Complaint) => {
      const d = new Date(c.createdAt)
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      if (data[dateStr]) {
        data[dateStr].complaints += 1
        if (c.status === "resolved" || c.status === "closed") data[dateStr].resolved += 1
      }
    })

    return Object.values(data)
  }

  const dailyChartData = isCitizen ? getDailyChartData() : []

  return (
    <div className="flex flex-col gap-6">
      {/* Stat cards (Admin Only) */}
      {!isCitizen ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, idx) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <Card
                className="group relative overflow-hidden border-none bg-white/70 backdrop-blur-xl shadow-lg dark:bg-stone-900/60 dark:border dark:border-stone-800 transition-all duration-500 hover:shadow-[#FF9933]/10 hover:shadow-2xl"
              >
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: RANGOLI_PATTERN }} />
                <CardContent className="p-6">
                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                        {stat.title}
                      </span>
                      <span className="text-4xl font-extrabold text-[#0a0e1a] dark:text-white tabular-nums">
                        <AnimatedCounter target={stat.value} />
                      </span>
                    </div>
                    <div className={cn("rounded-2xl p-3 shadow-xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6",
                      stat.title === "Total Complaints" ? "bg-gradient-to-br from-[#FF9933] to-[#F4B400] text-white shadow-[#FF9933]/20" :
                        stat.title === "Resolved" ? "bg-gradient-to-br from-[#138808] to-[#22c55e] text-white shadow-green-500/20" :
                          stat.title === "Escalated" ? "bg-gradient-to-br from-red-500 to-orange-600 text-white shadow-red-500/20" :
                            "bg-gradient-to-br from-[#2B6CEE] to-indigo-600 text-white shadow-blue-500/20"
                    )}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 relative z-10">
                    <div
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
                        stat.trendUp ? "bg-green-100 text-green-700 dark:bg-green-900/30" : "bg-red-100 text-red-700 dark:bg-red-900/30"
                      )}
                    >
                      {stat.trendUp ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3 rotate-90" />
                      )}
                      {stat.trend}
                    </div>
                    <span className="text-[10px] font-medium text-stone-400 uppercase tracking-tighter">vs last month</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {!isTrackingOnly && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-3xl border-none bg-[#0a0e1a] p-8 md:p-14 shadow-2xl transition-all duration-700 hover:shadow-[#FF9933]/10"
            >
              {/* Animated background elements */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF9933]/20 blur-[120px] -mr-32 -mt-32 rounded-full animate-pulse" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#138808]/10 blur-[100px] -ml-24 -mb-24 rounded-full" />
              <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay" style={{ backgroundImage: RANGOLI_PATTERN, backgroundSize: '200px' }} />

              <div className="relative z-10 max-w-2xl">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 text-white uppercase italic">
                    Welcome, <span className="text-[#FF9933] drop-shadow-sm">{user?.name}</span>
                  </h1>
                </motion.div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-lg text-stone-400 mb-10 text-balance leading-relaxed font-medium"
                >
                  The <span className="text-white font-bold tracking-widest text-sm bg-white/10 px-2 py-0.5 rounded ml-1 mr-1">JANSETU SMART MONITORING</span> ensures your reports are automatically assigned to the correct administrative department. Help keep our city clean and safe.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="lg" className="h-16 px-10 text-base font-black shadow-2xl bg-[#FF9933] hover:bg-[#FF9933]/90 text-white rounded-2xl shadow-[#FF9933]/30 active:scale-95 transition-all group overflow-hidden relative">
                        <span className="relative z-10 flex items-center gap-3">
                          <Plus className="h-6 w-6 stroke-[3px]" />
                          REPORT NEW ISSUE
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <form onSubmit={handleSubmitComplaint}>
                        <DialogHeader>
                          <DialogTitle>File a New Complaint</DialogTitle>
                          <DialogDescription>
                            Describe the issue in detail. It will be analyzed by AI and assigned to the relevant department.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="title">Complaint Title</Label>
                            <Input
                              id="title"
                              placeholder="e.g., Severe road damage on Main Street"
                              required
                              value={formData.title}
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="category">Category</Label>
                              <Select
                                required
                                value={formData.category}
                                onValueChange={(val) => setFormData({ ...formData, category: val })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Roads & Transport">Roads & Transport</SelectItem>
                                  <SelectItem value="Sanitation">Sanitation</SelectItem>
                                  <SelectItem value="Water">Water Supply</SelectItem>
                                  <SelectItem value="Electricity">Electricity</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2 border border-primary/10 bg-primary/5 rounded-md p-3">
                              <Label className="text-sm font-semibold flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" /> Smart Routing
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                This complaint will automatically be assigned to the department responsible for your precise incident location.
                              </p>
                            </div>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="description">Detailed Description</Label>
                            <Textarea
                              id="description"
                              placeholder="Provide specific details, landmarks, and context to assist field officers..."
                              required
                              className="min-h-[100px] resize-none"
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="photo">Attach Image (Optional)</Label>
                            <Input
                              id="photo"
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  setSelectedFile(e.target.files[0])
                                }
                              }}
                            />
                            {selectedFile && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Selected: {selectedFile.name}
                              </p>
                            )}
                          </div>
                          <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                              <Label>Precise Location <span className="text-destructive">*</span></Label>
                            </div>
                            <div className="flex items-center gap-4">
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full h-11 flex gap-2 items-center justify-center bg-background shadow-sm"
                                onClick={handleGetLocation}
                              >
                                <MapPin className="h-4 w-4 text-primary" />
                                {formData.latitude && formData.longitude ? "Update Location" : "Get Current Location"}
                              </Button>
                            </div>
                            {formData.latitude && formData.longitude ? (
                              <p className="text-xs text-success bg-success/10 px-3 py-1.5 rounded-md mt-1 border border-success/20 flex items-center justify-between">
                                <span>Location Captured Successfully</span>
                                <span className="font-mono text-[10px] opacity-70">{formData.latitude}, {formData.longitude}</span>
                              </p>
                            ) : (
                              <p className="text-xs text-destructive bg-destructive/10 px-3 py-1.5 rounded-md mt-1 border border-destructive/20 flex items-center justify-between">
                                <span>Location is required to file a report.</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </motion.div>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col gap-6"
          >
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <Card className="border-none bg-white/70 backdrop-blur-xl shadow-lg dark:bg-stone-900/60 dark:border dark:border-stone-800 transition-all duration-500 hover:shadow-xl group overflow-hidden">
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: RANGOLI_PATTERN }} />
                <CardContent className="p-6 flex flex-col gap-1 relative z-10">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">My Complaints</span>
                  <span className="text-4xl font-extrabold text-[#0a0e1a] dark:text-white tabular-nums group-hover:text-[#FF9933] transition-colors duration-300">{complaints.length}</span>
                </CardContent>
              </Card>
              <Card className="border-none bg-white/70 backdrop-blur-xl shadow-lg dark:bg-stone-900/60 dark:border dark:border-stone-800 transition-all duration-500 hover:shadow-xl group overflow-hidden">
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: RANGOLI_PATTERN }} />
                <CardContent className="p-6 flex flex-col gap-1 relative z-10">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">Pending</span>
                  <span className="text-4xl font-extrabold text-[#2B6CEE] tabular-nums">{complaints.filter(c => c.status === 'pending').length}</span>
                </CardContent>
              </Card>
              <Card className="border-none bg-white/70 backdrop-blur-xl shadow-lg dark:bg-stone-900/60 dark:border dark:border-stone-800 transition-all duration-500 hover:shadow-xl group overflow-hidden">
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: RANGOLI_PATTERN }} />
                <CardContent className="p-6 flex flex-col gap-1 relative z-10">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">Resolved</span>
                  <span className="text-4xl font-extrabold text-[#138808] tabular-nums">{complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length}</span>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none bg-white/70 backdrop-blur-xl shadow-xl dark:bg-stone-900/60 dark:border dark:border-stone-800 overflow-hidden relative group transition-all duration-500 hover:shadow-[#FF9933]/10">
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: RANGOLI_PATTERN }} />
                <CardHeader className="pb-2 relative z-10">
                  <CardTitle className="text-base font-bold bg-gradient-to-r from-[#0a0e1a] to-stone-600 bg-clip-text text-transparent dark:from-white dark:to-stone-400">Total Problems per Day</CardTitle>
                  <p className="text-xs text-stone-500 font-medium tracking-tight">Frequency of issues reported (Last 14 days)</p>
                </CardHeader>
                <CardContent className="p-6 pt-2 relative z-10">
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorComplaints" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF9933" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#FF9933" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-stone-200 dark:stroke-stone-800" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 500 }} className="fill-stone-500" dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 500 }} className="fill-stone-500" allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                          itemStyle={{ fontSize: '13px', paddingTop: '4px', fontWeight: 'bold' }}
                          labelStyle={{ fontWeight: 'black', color: '#0a0e1a', marginBottom: '4px' }}
                        />
                        <Area type="monotone" dataKey="complaints" name="Total Filed" stroke="#FF9933" strokeWidth={3} fillOpacity={1} fill="url(#colorComplaints)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none bg-white/70 backdrop-blur-xl shadow-xl dark:bg-stone-900/60 dark:border dark:border-stone-800 overflow-hidden relative group transition-all duration-500 hover:shadow-[#F4B400]/10">
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: RANGOLI_PATTERN }} />
                <CardHeader className="pb-2 relative z-10">
                  <CardTitle className="text-base font-bold bg-gradient-to-r from-[#0a0e1a] to-stone-600 bg-clip-text text-transparent dark:from-white dark:to-stone-400">Problems Resolved per Day</CardTitle>
                  <p className="text-xs text-stone-500 font-medium tracking-tight">Resolution velocity (Last 14 days)</p>
                </CardHeader>
                <CardContent className="p-6 pt-2 relative z-10">
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F4B400" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#F4B400" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-stone-200 dark:stroke-stone-800" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 500 }} className="fill-stone-500" dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 500 }} className="fill-stone-500" allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                          itemStyle={{ fontSize: '13px', paddingTop: '4px', fontWeight: 'bold' }}
                          labelStyle={{ fontWeight: 'black', color: '#0a0e1a', marginBottom: '4px' }}
                        />
                        <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#F4B400" strokeWidth={3} fillOpacity={1} fill="url(#colorResolved)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      )}

      {/* Recent complaints table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              {isCitizen ? "My Complaint History" : "Jurisdiction Tasks"}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {!isCitizen ? (
              <Tabs defaultValue="actionable" className="w-full">
                <div className="p-4 pb-0 border-b border-primary/5">
                  <TabsList className="bg-muted/50 w-full sm:w-auto overflow-x-auto whitespace-nowrap justify-start sm:justify-center">
                    <TabsTrigger value="actionable" className="flex gap-2">
                      <MapPin className="h-3 w-3" />
                      Actionable Issues (Inside Incident Zone)
                    </TabsTrigger>
                    <TabsTrigger value="outofbound" className="flex gap-2">
                      <AlertCircle className="h-3 w-3" />
                      Out-of-Bound (ReadOnly Watchlist)
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="actionable" className="m-0 select-none">
                  {renderComplaintTable(recentComplaints)}
                </TabsContent>
                <TabsContent value="outofbound" className="m-0 select-none">
                  {renderComplaintTable(outOfBoundComplaints)}
                </TabsContent>
              </Tabs>
            ) : (
              renderComplaintTable(recentComplaints)
            )}
          </div>
        </CardContent>
      </Card>

      {/* Complaint Detail Dialog */}
      <Dialog open={!!selectedComplaintId} onOpenChange={(open) => !open && setSelectedComplaintId(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          {loadingDetail ? (
            <div className="flex justify-center p-8"><span className="animate-pulse text-muted-foreground text-sm">Loading complete details...</span></div>
          ) : complaintDetail ? (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between pe-6">
                  <div>
                    <DialogTitle className="text-xl leading-tight pr-4 flex items-center flex-wrap gap-2">
                      {complaintDetail?.title}
                      {isCitizen && user?.ward && complaintDetail?.location?.area && user.ward !== complaintDetail.location.area && (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20">
                          Out Of Bound (Routed to {complaintDetail.location.area})
                        </Badge>
                      )}
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      Reported by {complaintDetail.citizenName} in {complaintDetail.location.area}
                    </DialogDescription>
                  </div>
                  {(() => {
                    const displayStatus = (complaintDetail.isSlaBreached && complaintDetail.status !== "closed" && complaintDetail.status !== "resolved")
                      ? "escalated"
                      : complaintDetail.status;
                    return (
                      <Badge className={cn("capitalize border-0 whitespace-nowrap", statusColors[displayStatus] || statusColors.pending)}>
                        {displayStatus}
                      </Badge>
                    )
                  })()}
                </div>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm bg-muted/20 p-4 rounded-xl border border-primary/5">
                  <div>
                    <span className="text-muted-foreground text-xs uppercase tracking-wider block mb-1">Category</span>
                    <p className="font-medium">{complaintDetail.category}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs uppercase tracking-wider block mb-1">Department</span>
                    <p className="font-medium truncate">{complaintDetail.department}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs uppercase tracking-wider block mb-1">Priority</span>
                    <Badge variant="outline" className={cn("text-[10px] capitalize", priorityColors[complaintDetail.priority])}>
                      {complaintDetail.priority}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs uppercase tracking-wider block mb-1">Community</span>
                    <p className="font-medium flex items-center gap-2">
                      {complaintDetail.upvotes} Votes
                      {isCitizen && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-5 text-[10px] px-2 py-0"
                          disabled={complaintDetail.authorId === user?.id || upvotedIds.has(complaintDetail.id)}
                          onClick={async () => {
                            const success = await upvoteComplaint(complaintDetail.id)
                            if (success) {
                              setComplaintDetail({ ...complaintDetail, upvotes: complaintDetail.upvotes + 1 })
                            }
                          }}
                        >
                          {complaintDetail?.authorId === user?.id ? "Your Report" :
                            (complaintDetail?.id && upvotedIds.has(complaintDetail.id)) ? "Upvoted" : "+1 Upvote"}
                        </Button>
                      )}
                    </p>
                  </div>
                </div>

                {complaintDetail.expectedResolutionDate && complaintDetail.status !== "resolved" && complaintDetail.status !== "closed" && (
                  <div className={cn(
                    "p-4 rounded-xl border flex items-center gap-3",
                    isPast(new Date(complaintDetail.expectedResolutionDate))
                      ? "bg-destructive/10 border-destructive/20 text-destructive"
                      : "bg-primary/5 border-primary/20 text-primary"
                  )}>
                    <Clock className="h-5 w-5" />
                    <div>
                      <p className="font-semibold text-sm">
                        {isPast(new Date(complaintDetail.expectedResolutionDate)) ? "SLA Deadline Breached" : "Expected Resolution"}
                      </p>
                      <p className="text-xs opacity-90">
                        {isPast(new Date(complaintDetail.expectedResolutionDate))
                          ? `Overdue by ${formatDistanceToNow(new Date(complaintDetail.expectedResolutionDate))}`
                          : `Target: ${format(new Date(complaintDetail.expectedResolutionDate), "PPp")} (${formatDistanceToNow(new Date(complaintDetail.expectedResolutionDate), { addSuffix: true })})`}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-sm font-semibold mb-2 block">Description</span>
                  <p className="text-sm bg-muted/50 p-4 rounded-xl border border-muted/50 leading-relaxed text-muted-foreground">{complaintDetail.description}</p>
                </div>

                {complaintDetail.photoUrl && (
                  <div>
                    <span className="text-sm font-semibold mb-2 block flex items-center gap-2">
                      Attached Evidence
                      <Badge variant="secondary" className="text-[10px] font-normal cursor-pointer" onClick={() => window.open(complaintDetail.photoUrl!, '_blank')}>
                        <Maximize2 className="h-3 w-3 mr-1" /> View Full Image
                      </Badge>
                    </span>
                    <div
                      className="rounded-xl overflow-hidden border border-muted/50 bg-black/5 cursor-pointer hover:opacity-90 transition-opacity relative group"
                      onClick={() => window.open(complaintDetail.photoUrl!, '_blank')}
                    >
                      <img src={complaintDetail.photoUrl} alt="Complaint Evidence" className="w-full max-h-[300px] object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Activity & Progress Logs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {complaintDetail.activities?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3 border-b pb-2">Activity Timeline</h4>
                      <div className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted before:to-transparent">
                        {complaintDetail.activities.map((act) => (
                          <div key={act.id} className="text-xs flex gap-3 relative bg-card z-10 p-2 rounded-lg border shadow-sm">
                            <div className="w-20 text-muted-foreground flex-shrink-0 font-mono text-[10px] pt-0.5">
                              {new Date(act.createdAt).toLocaleDateString()}
                            </div>
                            <div>
                              <p className="font-medium">{act.action}</p>
                              {act.details && <p className="text-muted-foreground mt-0.5">{act.details}</p>}
                              {act.actor && <p className="text-[9px] text-primary/70 mt-1">by {act.actor}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {complaintDetail.updates?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3 border-b pb-2">Progress Updates</h4>
                      <div className="space-y-3">
                        {complaintDetail.updates.map((upd) => (
                          <div key={upd.id} className="text-xs bg-primary/5 p-3 rounded-xl border border-primary/10">
                            <p className="font-semibold text-primary capitalize flex items-center gap-2">
                              <CheckCircle2 className="w-3 h-3" />
                              {upd.phase} Update
                            </p>
                            {upd.note && <p className="mt-2 text-muted-foreground">{upd.note}</p>}
                            {upd.photoUrl && (
                              <img src={upd.photoUrl} className="mt-3 max-h-32 rounded-lg border shadow-sm" alt="Update" />
                            )}
                            <p className="text-[9px] text-muted-foreground mt-2">{new Date(upd.createdAt).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Upvote Button for Citizen View */}
                {isCitizen && (
                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="text-sm font-semibold flex items-center gap-1">
                      <ChevronUp className="h-4 w-4 text-emerald-500" /> My Support
                    </span>
                    <Button
                      onClick={async () => {
                        try {
                          const success = await upvoteComplaint(complaintDetail.id);
                          if (success) {
                            setComplaintDetail({
                              ...complaintDetail,
                              upvotes: (complaintDetail.upvotes || 0) + 1
                            });
                          }
                        } catch (e: any) { alert(e.message) }
                      }}
                      disabled={complaintDetail.authorId === user?.id || upvotedIds.has(complaintDetail.id)}
                      variant="secondary"
                      size="sm"
                      className="gap-1"
                    >
                      <ChevronUp className="h-4 w-4" /> {complaintDetail.authorId === user?.id ? "Your Report" : upvotedIds.has(complaintDetail.id) ? "Upvoted" : "+1 Upvote"}
                    </Button>
                  </div>
                )}

                {/* Verification Button for Citizen View */}
                {isCitizen && complaintDetail.status === "resolved" && (
                  <div className="pt-5 border-t mt-4 flex flex-col gap-2 bg-success/5 p-4 rounded-xl border border-success/20">
                    <span className="text-sm font-semibold flex items-center gap-2 text-success">
                      <CheckCircle2 className="h-4 w-4" /> Verify Issue Resolution
                    </span>
                    <p className="text-xs text-muted-foreground mb-2">
                      Please verify the physical work performed. Mark this as complete ONLY if you are satisfied with the government's response.
                    </p>
                    <Button
                      onClick={async () => {
                        await closeComplaint(complaintDetail.id);
                        setComplaintDetail({
                          ...complaintDetail,
                          status: "closed"
                        });
                      }}
                      className="w-full sm:w-auto bg-success hover:bg-success/90 text-white gap-2 shadow-sm"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Verify & Close Ticket
                    </Button>
                    <Button
                      onClick={async () => {
                        if (window.confirm("Are you sure you want to REJECT this resolution? This will penalize the department and escalate the priority.")) {
                          try {
                            await reEscalateComplaint(complaintDetail.id);
                            setComplaintDetail({
                              ...complaintDetail,
                              status: "in-progress"
                            });
                          } catch (e: any) { alert(e.message) }
                        }
                      }}
                      variant="destructive"
                      className="w-full sm:w-auto mt-2 gap-2 shadow-sm"
                    >
                      <XCircle className="h-4 w-4" /> Reject Resolution & Re-escalate
                    </Button>
                  </div>
                )}

                {/* Status Update Controls (Admin Only) */}
                {!isCitizen && complaintDetail.status !== "closed" && (
                  <div className="border-t pt-5 mt-2 bg-muted/20 -mx-6 -mb-6 p-6">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-chart-4" />
                      Administrator Controls
                    </h4>
                    {(() => {
                      const isSameDept = (() => {
                        const ud = user?.department;
                        const cd = complaintDetail?.department;
                        if (!ud || !cd) return true;
                        const uWords = ud.toLowerCase().split(/[^a-z0-9]/).filter(w => w.length >= 2);
                        const cWords = cd.toLowerCase().split(/[^a-z0-9]/).filter(w => w.length >= 2);
                        const match = uWords.some(uw => cWords.some(cw => uw.includes(cw) || cw.includes(uw)));
                        console.log(`[DeptMatching] User: ${ud}, Target: ${cd}, Match: ${match}`);
                        return match;
                      })();
                      const isSameWard = (() => {
                        if ((user?.role as string) === 'sudo') return true;
                        if (!user?.ward) return true;
                        const uw = user.ward.replace(/\s/g, '').toLowerCase();
                        const cw = (complaintDetail?.location?.area || '').replace(/\s/g, '').toLowerCase();
                        return !cw || uw === cw;
                      })();

                      if (isSameDept && isSameWard) {
                        return (
                          <>
                            <div className="flex gap-2 mb-4">
                              <Button
                                size="sm"
                                variant={complaintDetail?.status === 'in-progress' ? "default" : "outline"}
                                disabled={isActionPending || complaintDetail?.status === 'in-progress' || complaintDetail?.status === 'resolved'}
                                onClick={async () => {
                                  try {
                                    if (!complaintDetail?.id) return;
                                    setIsActionPending(true)
                                    await updateComplaintStatus(complaintDetail.id, "in-progress")
                                    setComplaintDetail({ ...complaintDetail, status: "in-progress" })
                                  } catch (e: any) { alert(e.message || "Failed to update status") }
                                  finally { setIsActionPending(false) }
                                }}
                              >
                                Mark In-Progress
                              </Button>
                              <Button
                                size="sm"
                                variant={complaintDetail?.status === 'resolved' ? "default" : "outline"}
                                className={complaintDetail?.status === 'resolved' ? "bg-success hover:bg-success/90" : ""}
                                disabled={isActionPending || complaintDetail?.status === 'resolved'}
                                onClick={async () => {
                                  try {
                                    if (!complaintDetail?.id) return;
                                    setIsActionPending(true)
                                    await updateComplaintStatus(complaintDetail.id, "resolved")
                                    setComplaintDetail({ ...complaintDetail, status: "resolved" })
                                  } catch (e: any) { alert(e.message || "Failed to resolve") }
                                  finally { setIsActionPending(false) }
                                }}
                              >
                                Mark Resolved
                              </Button>
                            </div>
                            <div className="grid gap-3 border border-primary/10 p-4 rounded-xl bg-background shadow-sm">
                              <Label className="text-xs font-semibold">Publish Public Progress Update</Label>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Select value={progressPhase} onValueChange={setProgressPhase} disabled={isActionPending || complaintDetail?.status === 'resolved'}>
                                  <SelectTrigger className="w-full sm:w-[130px] text-xs h-9"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="update">General Update</SelectItem>
                                    <SelectItem value="before">Before Work</SelectItem>
                                    <SelectItem value="after">After Completion</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  className="h-9 text-xs"
                                  placeholder="Official note for citizens..."
                                  value={progressNote}
                                  onChange={e => setProgressNote(e.target.value)}
                                  disabled={isActionPending || complaintDetail?.status === 'resolved'}
                                />
                                <Input
                                  key={updateFile ? updateFile.name : 'empty-file'}
                                  type="file"
                                  accept="image/*"
                                  disabled={isActionPending || complaintDetail?.status === 'resolved'}
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                      setUpdateFile(e.target.files[0])
                                    }
                                  }}
                                  className="h-9 text-xs w-full sm:w-[220px]"
                                />
                              </div>
                              <Button
                                size="sm"
                                className="h-9 mt-1 w-full sm:w-auto self-end hover:shadow-md transition-all"
                                disabled={isActionPending || uploadingUpdateImage || complaintDetail?.status === 'resolved'}
                                onClick={async () => {
                                  if (!user?.token) return;
                                  let finalPhotoUrl = ""
                                  setIsActionPending(true)
                                  if (updateFile) {
                                    setUploadingUpdateImage(true)
                                    try {
                                      const imgData = new FormData()
                                      imgData.append("image", updateFile)
                                      const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
                                      if (!apiKey) {
                                        alert("Update failed: ImgBB API key is missing.");
                                        setIsActionPending(false);
                                        setUploadingUpdateImage(false);
                                        return;
                                      }
                                      const uploadRes = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                                        method: "POST",
                                        body: imgData
                                      })
                                      if (uploadRes.ok) {
                                        const json = await uploadRes.json()
                                        finalPhotoUrl = json.data.url
                                      }
                                    } catch (e) {
                                      console.error("Image upload failed", e)
                                      alert("Image upload failed, please try again.")
                                    }
                                    setUploadingUpdateImage(false)
                                  }
                                  if (!complaintDetail?.id) { setIsActionPending(false); return; }

                                  try {
                                    const payload: any = { phase: progressPhase }
                                    if (progressNote.trim()) payload.note = progressNote.trim()
                                    if (finalPhotoUrl) payload.photo_url = finalPhotoUrl

                                    await addProgressUpdate(complaintDetail.id, payload)

                                    setProgressNote("")
                                    setUpdateFile(null)

                                    if (user?.token && selectedComplaintId) {
                                      getComplaintDetailApi(user.token, selectedComplaintId).then(data => setComplaintDetail(data))
                                    }
                                    alert("Official update published successfully.")
                                  } catch (err: any) {
                                    alert(err.message || "Failed to publish update")
                                  } finally {
                                    setIsActionPending(false)
                                  }
                                }}
                              >
                                {uploadingUpdateImage ? "Uploading..." : isActionPending ? "Processing..." : "Post Official Update"}
                              </Button>
                            </div>
                          </>
                        );
                      } else {
                        return (
                          <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground p-4 bg-background border border-primary/10 rounded-xl">
                            {!isSameDept && (
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 px-0.5" />
                                You can only resolve complaints assigned to your department ({user?.department || 'Unassigned'}). This issue is handled by {complaintDetail.department}.
                              </div>
                            )}
                            {!isSameWard && (
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 px-0.5" />
                                This issue occurred outside your assigned jurisdiction ({user?.ward || 'Unassigned'}).
                              </div>
                            )}
                          </div>
                        );
                      }
                    })()
                    }
                  </div>
                )}

                {/* Locked Controls State for Admin */}
                {!isCitizen && complaintDetail.status === "closed" && (
                  <div className="border-t pt-5 mt-4 p-4 bg-success/10 border border-success/20 rounded-xl">
                    <p className="text-sm font-semibold text-success flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Ticket Closed by Citizen
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This complaint was verified and permanently closed by the reporting citizen. Administrative actions are locked.
                    </p>
                  </div>
                )}

              </div>
            </>
          ) : (
            <div className="p-8 text-center text-muted-foreground">Complaint not found or you lack permissions.</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fullscreen Image Viewer Modal */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-1 bg-black border-none [&>button]:text-white">
          <DialogTitle className="sr-only">Image Viewer</DialogTitle>
          <DialogDescription className="sr-only">Full resolution view of the uploaded evidence.</DialogDescription>
          {viewerImage && (
            <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-md">
              <img src={viewerImage} alt="Full Resolution Evidence" className="max-w-full max-h-[85vh] object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div >
  )

  function renderComplaintTable(data: Complaint[]) {
    if (data.length === 0) {
      return <div className="p-8 text-center text-muted-foreground text-sm">No complaints found.</div>
    }
    return (
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs">ID</TableHead>
            <TableHead className="text-xs">Complaint</TableHead>
            <TableHead className="text-xs hidden md:table-cell">Department</TableHead>
            <TableHead className="text-xs">Votes</TableHead>
            <TableHead className="text-xs">Evidence</TableHead>
            <TableHead className="text-xs">Priority</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs hidden lg:table-cell">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((complaint) => (
            <TableRow
              key={complaint.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors group"
              onClick={() => setSelectedComplaintId(complaint.id)}
            >
              <TableCell className="font-mono text-xs text-muted-foreground">
                #{complaint.id.substring(0, 4)}
              </TableCell>
              <TableCell className="max-w-[200px] text-sm py-3">
                <p className="font-medium truncate flex items-center gap-1">
                  {complaint.title}
                  {isCitizen && user?.ward && complaint.location.area && user.ward !== complaint.location.area && (
                    <span title={`Out of Bound: Routed to ${complaint.location.area}`}>
                      <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{complaint.location.area}</p>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                {complaint.department}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-[10px]">{complaint.upvotes || 0}</Badge>
              </TableCell>
              <TableCell>
                {complaint.photoUrl ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-primary hover:text-primary/80 hover:bg-primary/10"
                    title="View Evidence Image"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(complaint.photoUrl!, '_blank');
                    }}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                ) : (
                  <span className="text-[10px] text-muted-foreground px-2">None</span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] capitalize",
                    priorityColors[complaint.priority]
                  )}
                >
                  {complaint.priority}
                </Badge>
              </TableCell>
              <TableCell>
                {(() => {
                  const displayStatus = (complaint.isSlaBreached && complaint.status !== "closed" && complaint.status !== "resolved")
                    ? "escalated"
                    : complaint.status;
                  return (
                    <Badge
                      className={cn(
                        "text-[10px] capitalize border-0",
                        statusColors[displayStatus] || statusColors.pending
                      )}
                    >
                      {displayStatus}
                    </Badge>
                  )
                })()}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                {new Date(complaint.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }
}

function SudoDashboard() {
  const { user } = useApp()
  const [pendingOfficers, setPendingOfficers] = useState<any[]>([])
  const [activeOfficers, setActiveOfficers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOfficers = () => {
    if (!user?.token) return
    setLoading(true)
    Promise.all([
      getPendingOfficersApi(user.token).then(setPendingOfficers).catch(console.error),
      getAdminDirectoryApi(user.token).then(setActiveOfficers).catch(console.error)
    ]).finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchOfficers()
  }, [user?.token])

  const handleApprove = async (id: string) => {
    if (!user?.token) return
    try {
      await approveOfficerApi(user.token, id)
      fetchOfficers()
    } catch (e: any) { alert(e.message || "Failed to approve"); console.error(e) }
  }

  const handleReject = async (id: string) => {
    if (!user?.token) return
    try {
      if (confirm("Reject this officer registration? This will permanently delete their request.")) {
        await rejectOfficerApi(user.token, id)
        fetchOfficers()
      }
    } catch (e: any) { alert(e.message || "Failed to reject"); console.error(e) }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!user?.token) return
    try {
      if (confirm(`Are you sure you want to permanently delete the officer account for ${name}?`)) {
        await deleteOfficerApi(user.token, id)
        fetchOfficers()
      }
    } catch (e: any) { alert(e.message || "Failed to delete"); console.error(e) }
  }

  const handleSuspend = async (id: string, name: string) => {
    if (!user?.token) return
    try {
      if (confirm(`Suspend officer ${name}? They will lose login access but their account remains.`)) {
        await suspendOfficerApi(user.token, id)
        fetchOfficers()
      }
    } catch (e: any) { alert(e.message || "Failed to suspend"); console.error(e) }
  }

  const handleUnsuspend = async (id: string, name: string) => {
    if (!user?.token) return
    try {
      if (confirm(`Restore login access for officer ${name}?`)) {
        await unsuspendOfficerApi(user.token, id)
        fetchOfficers()
      }
    } catch (e: any) { alert(e.message || "Failed to unsuspend"); console.error(e) }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-blue-500/10 p-8 md:p-12 shadow-sm mb-6">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <AlertCircle className="w-64 h-64 text-primary" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 flex items-center gap-3">
            System Administration <Badge variant="default" className="text-base uppercase">Sudo</Badge>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 text-balance">
            Manage global platform operations, securely approve new department officer accounts, and oversee system hierarchy.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Officer Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm animate-pulse">Loading pending officer requests...</div>
          ) : pendingOfficers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No pending officer registrations.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email Address</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>PIN Code</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingOfficers.map(officer => (
                    <TableRow key={officer.id}>
                      <TableCell className="font-medium whitespace-nowrap">{officer.full_name}</TableCell>
                      <TableCell>{officer.email}</TableCell>
                      <TableCell>{officer.department}</TableCell>
                      <TableCell>{officer.ward}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="border-success/50 text-success hover:bg-success/10 w-24" onClick={() => handleApprove(String(officer.id))}>Approve</Button>
                          <Button size="sm" variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10 w-24" onClick={() => handleReject(String(officer.id))}>Reject</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Department Officers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm animate-pulse">Loading active directory...</div>
          ) : activeOfficers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No active officers found.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email Address</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>PIN Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeOfficers.map(officer => (
                    <TableRow key={officer.id}>
                      <TableCell className="font-medium whitespace-nowrap">{officer.full_name}</TableCell>
                      <TableCell>{officer.email}</TableCell>
                      <TableCell>{officer.department}</TableCell>
                      <TableCell>{officer.ward}</TableCell>
                      <TableCell>
                        <Badge variant={officer.is_suspended ? "destructive" : "secondary"}>
                          {officer.is_suspended ? "Suspended" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        {officer.is_suspended ? (
                          <Button size="sm" variant="outline" className="border-warning/50 text-warning hover:bg-warning/10" onClick={() => handleUnsuspend(String(officer.id), officer.full_name)}>Unsuspend</Button>
                        ) : (
                          <Button size="sm" variant="outline" className="border-warning/50 text-warning hover:bg-warning/10" onClick={() => handleSuspend(String(officer.id), officer.full_name)}>Suspend</Button>
                        )}
                        <Button size="sm" variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(String(officer.id), officer.full_name)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
