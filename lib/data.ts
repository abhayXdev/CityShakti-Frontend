// Smart Civic Monitoring System - Dummy Data Layer

export type Complaint = {
  id: string
  title: string
  description: string
  category: string
  department: string
  priority: "high" | "medium" | "low"
  status: "pending" | "in-progress" | "resolved" | "escalated" | "closed"
  location: { lat: number; lng: number; area: string }
  assignedOfficer?: string | null
  citizenName: string
  authorId: string
  citizenPhone?: string
  photoUrl?: string | null
  upvotes: number
  impactScore: number
  isSlaBreached?: boolean
  expectedResolutionDate?: string | null
  createdAt: string
  updatedAt: string
}

export type ComplaintActivity = {
  id: string
  action: string
  details?: string
  previousValue?: string
  newValue?: string
  actor?: string
  createdAt: string
}

export type ComplaintProgress = {
  id: string
  phase: string
  note?: string
  photoUrl?: string
  createdAt: string
}

export type ComplaintDetail = Complaint & {
  activities: ComplaintActivity[]
  updates: ComplaintProgress[]
}

export type Notification = {
  id: string
  message: string
  type: "new-complaint" | "status-update" | "escalation" | "resolved"
  timestamp: string
  read: boolean
}

const complaintTitles: Record<string, string[]> = {
  "Public Works": [
    "Broken streetlights on main road",
    "Collapsed drainage near market",
    "Damaged public park bench",
    "Cracked pavement on footpath",
  ],
  "Water Supply": [
    "No water supply for 3 days",
    "Contaminated water reported",
    "Leaking pipeline on street",
    "Low water pressure in area",
  ],
  Sanitation: [
    "Garbage not collected for a week",
    "Open drain causing health hazard",
    "Illegal dumping near residential area",
    "Public toilet in poor condition",
  ],
  Electricity: [
    "Frequent power outages",
    "Exposed electrical wiring",
    "Street light not working",
    "Transformer malfunction",
  ],
  "Roads & Transport": [
    "Large pothole on highway",
    "Missing road signage",
    "Traffic signal malfunction",
    "Damaged road divider",
  ],
  "Health Services": [
    "Shortage of medicines at PHC",
    "Unclean conditions at hospital",
    "Need for mosquito fogging",
    "Stray animal menace",
  ],
  Education: [
    "School building needs repair",
    "Shortage of teachers",
    "No drinking water in school",
    "Damaged school playground",
  ],
  Revenue: [
    "Property tax assessment error",
    "Pending land record update",
    "Encroachment on public land",
    "Revenue office service delay",
  ],
}

const citizenNames = [
  "Rajesh Kumar",
  "Priya Sharma",
  "Amit Patel",
  "Sonia Gupta",
  "Vikram Singh",
  "Anita Rao",
  "Manoj Tiwari",
  "Deepika Nair",
  "Suresh Iyer",
  "Kavita Joshi",
  "Arun Mehta",
  "Nisha Agarwal",
  "Rahul Verma",
  "Pooja Reddy",
  "Dinesh Yadav",
  "Sunita Das",
]

export const complaints = [] as Complaint[]

export function getStats(complaintsList: Complaint[] = complaints) {
  const total = complaintsList.length
  const resolved = complaintsList.filter((c) => c.status === "resolved" || c.status === "closed").length
  const pending = complaintsList.filter((c) => c.status === "pending").length
  const inProgress = complaintsList.filter(
    (c) => c.status === "in-progress"
  ).length
  const escalated = complaintsList.filter(
    (c) => (c.status === "escalated" || c.isSlaBreached) && c.status !== "closed" && c.status !== "resolved"
  ).length
  const highPriority = complaintsList.filter(
    (c) => c.priority === "high"
  ).length

  return { total, resolved, pending, inProgress, escalated, highPriority }
}

export function getPriorityData(complaintsList: Complaint[] = complaints) {
  const high = complaintsList.filter((c) => c.priority === "high").length
  const medium = complaintsList.filter((c) => c.priority === "medium").length
  const low = complaintsList.filter((c) => c.priority === "low").length
  return [
    { name: "High", value: high, fill: "var(--color-chart-3)" },
    { name: "Medium", value: medium, fill: "var(--color-chart-4)" },
    { name: "Low", value: low, fill: "var(--color-chart-2)" },
  ]
}

export function getStatusData(complaintsList: Complaint[] = complaints) {
  const resolved = complaintsList.filter((c) => c.status === "resolved" || c.status === "closed").length
  const pending = complaintsList.filter((c) => c.status === "pending").length
  const inProgress = complaintsList.filter(
    (c) => c.status === "in-progress"
  ).length
  const escalated = complaintsList.filter(
    (c) => (c.status === "escalated" || c.isSlaBreached) && c.status !== "closed" && c.status !== "resolved"
  ).length
  return [
    { name: "Resolved", value: resolved, fill: "var(--color-chart-2)" },
    { name: "Pending", value: pending, fill: "var(--color-chart-4)" },
    { name: "In Progress", value: inProgress, fill: "var(--color-chart-1)" },
    { name: "Escalated", value: escalated, fill: "var(--color-chart-3)" },
  ]
}

export function categorizeComplaint(text: string): {
  category: string
  priority: "high" | "medium" | "low"
} {
  const lower = text.toLowerCase()

  const keywords: Record<string, string[]> = {
    "Water Supply": ["water", "pipeline", "leak", "tap", "supply", "contaminated"],
    Sanitation: ["garbage", "waste", "drain", "sewage", "dump", "toilet", "clean"],
    Electricity: ["power", "electric", "light", "transformer", "wire", "outage"],
    "Roads & Transport": ["road", "pothole", "traffic", "signal", "highway", "divider"],
    "Health Services": ["hospital", "medicine", "health", "disease", "doctor", "fogging"],
    Education: ["school", "teacher", "student", "education", "playground"],
    Revenue: ["tax", "property", "land", "encroachment", "revenue"],
    "Public Works": ["park", "footpath", "bridge", "building", "street"],
  }

  let category = "Public Works"
  for (const [dept, words] of Object.entries(keywords)) {
    if (words.some((w) => lower.includes(w))) {
      category = dept
      break
    }
  }

  const highKeywords = ["urgent", "danger", "emergency", "collapse", "flood", "fire", "death", "exposed"]
  const lowKeywords = ["minor", "small", "slight", "cosmetic", "paint"]

  let priority: "high" | "medium" | "low" = "medium"
  if (highKeywords.some((w) => lower.includes(w))) priority = "high"
  else if (lowKeywords.some((w) => lower.includes(w))) priority = "low"

  return { category, priority }
}
