import { Complaint, ComplaintDetail, ComplaintActivity, ComplaintProgress } from "./data"

// Use local Next.js proxy to avoid CORS issues in dev.
// In production, set NEXT_PUBLIC_API_URL to the deployed backend URL.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/backend"

// Mapping from backend status to frontend status
function mapStatus(backendStatus: string): Complaint["status"] {
    switch (backendStatus) {
        case "Submitted":
        case "Assigned":
            return "pending"
        case "In Progress":
            return "in-progress"
        case "Resolved":
        case "Rejected":
            return "resolved"
        default:
            return "escalated" // Fallback if escalation level > 0 in future
    }
}

// Convert a backend ComplaintOut to frontend Complaint
function transformComplaint(apiComp: any): Complaint {
    return {
        id: String(apiComp.id),
        title: apiComp.title,
        description: apiComp.description,
        category: apiComp.category,
        status: mapStatus(apiComp.status),
        priority: (apiComp.priority_label?.toLowerCase() || "medium") as any,
        location: {
            lat: apiComp.latitude || 28.6139, // fallback to New Delhi if null
            lng: apiComp.longitude || 77.209,
            area: apiComp.ward || "Unknown Ward",
        },
        citizenName: String(apiComp.citizen?.full_name || apiComp.citizen_id || "Citizen"),
        authorId: String(apiComp.citizen_id),
        citizenPhone: apiComp.citizen?.phone || "",
        assignedOfficer: apiComp.assigned_to || null,
        photoUrl: apiComp.photo_url || null,
        upvotes: apiComp.upvotes || 0,
        impactScore: apiComp.impact_score || 0,
        createdAt: apiComp.created_at,
        updatedAt: apiComp.updated_at || apiComp.created_at,
        department: apiComp.assigned_department || apiComp.category || "General",
    }
}

function transformComplaintDetail(apiComp: any): ComplaintDetail {
    const base = transformComplaint(apiComp)
    return {
        ...base,
        activities: (apiComp.activities || []).map((a: any) => ({
            id: String(a.id),
            action: a.action,
            details: a.details,
            previousValue: a.previous_value,
            newValue: a.new_value,
            actor: a.actor,
            createdAt: a.created_at,
        })),
        updates: (apiComp.updates || []).map((u: any) => ({
            id: String(u.id),
            phase: u.phase,
            note: u.note,
            photoUrl: u.photo_url,
            createdAt: u.created_at,
        })),
    }
}

export async function loginApi(email: string, password: string, role?: "citizen" | "officer" | "sudo") {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, role }),
    })

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Failed to login" }))
        throw new Error(errorData.detail || "Failed to login")
    }

    return res.json()
}

export async function registerApi(payload: {
    full_name: string;
    email: string;
    password: string;
    role: "citizen" | "officer" | "sudo";
    ward?: string;
    department?: string;
}) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    })

    if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || "Registration failed")
    }

    return res.json()
}

export async function getComplaintsApi(token: string): Promise<Complaint[]> {
    const res = await fetch(`${API_BASE_URL}/complaints/?skip=0&limit=100`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })

    if (!res.ok) {
        throw new Error("Failed to fetch complaints")
    }

    const data = await res.json()
    return data.map(transformComplaint)
}

export async function getWardComplaintsApi(token: string, ward: string): Promise<Complaint[]> {
    const queryParams = new URLSearchParams({ ward, skip: "0", limit: "100" }).toString()
    const res = await fetch(`${API_BASE_URL}/complaints/community?${queryParams}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })

    if (!res.ok) {
        throw new Error("Failed to fetch community complaints")
    }

    const data = await res.json()
    return data.map(transformComplaint)
}

export async function updateComplaintStatusApi(
    token: string,
    complaintId: string,
    newStatus: string
) {
    let backendStatus = "In Progress"
    if (newStatus === "resolved") backendStatus = "Resolved"
    if (newStatus === "pending") backendStatus = "Submitted"

    const res = await fetch(`${API_BASE_URL}/complaints/${complaintId}/status`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            status: backendStatus,
            note: "Status updated from admin dashboard",
        }),
    })

    if (!res.ok) {
        throw new Error("Failed to update status")
    }

    return res.json()
}

export async function createComplaintApi(token: string, payload: {
    title: string
    description: string
    ward: string
    category: string
    latitude?: number
    longitude?: number
    photo_url?: string
}) {
    const res = await fetch(`${API_BASE_URL}/complaints`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Failed to submit complaint")
    }

    return transformComplaint(await res.json())
}

export async function getMeApi(token: string) {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("Failed to fetch user profile")
    return res.json()
}

export async function getDashboardApi(token: string) {
    const res = await fetch(`${API_BASE_URL}/dashboard/summary`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("Failed to fetch dashboard summary")
    return res.json()
}

export async function getComplaintDetailApi(token: string, id: string): Promise<ComplaintDetail> {
    const res = await fetch(`${API_BASE_URL}/complaints/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("Failed to fetch complaint details")
    return transformComplaintDetail(await res.json())
}

export async function upvoteComplaintApi(token: string, id: string) {
    const res = await fetch(`${API_BASE_URL}/complaints/${id}/upvote`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("Failed to upvote")
    return res.json()
}

export async function adminUpdateComplaintApi(token: string, id: string, payload: any) {
    const res = await fetch(`${API_BASE_URL}/complaints/${id}`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error("Failed to update complaint")
    return transformComplaint(await res.json())
}

export async function adminAssignComplaintApi(token: string, id: string, assignedTo: string, department: string) {
    const res = await fetch(`${API_BASE_URL}/complaints/${id}/assign`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ assigned_to: assignedTo, assigned_department: department }),
    })
    if (!res.ok) throw new Error("Failed to assign complaint")
    return transformComplaint(await res.json())
}

export async function addProgressUpdateApi(token: string, id: string, payload: { phase: string, note?: string, photo_url?: string }) {
    const res = await fetch(`${API_BASE_URL}/complaints/${id}/updates`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error("Failed to add progress update")
    return res.json()
}

export async function getAdminDirectoryApi(token: string) {
    const res = await fetch(`${API_BASE_URL}/admin/directory`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("Failed to fetch admin directory")
    return res.json()
}

// ============================================
// SUDO ADMIN ENDPOINTS
// ============================================

export async function getPendingOfficersApi(token: string) {
    const res = await fetch(`${API_BASE_URL}/admin/pending-officers`, {
        headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to fetch pending officers")
    return res.json()
}

export async function approveOfficerApi(token: string, userId: string) {
    const res = await fetch(`${API_BASE_URL}/admin/approve-officer/${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to approve officer")
    return res.json()
}

export async function rejectOfficerApi(token: string, userId: string) {
    const res = await fetch(`${API_BASE_URL}/admin/reject-officer/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to reject officer")
    return res.json()
}

export async function deleteOfficerApi(token: string, userId: string) {
    const res = await fetch(`${API_BASE_URL}/admin/delete-officer/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to delete officer")
    return res.json()
}
