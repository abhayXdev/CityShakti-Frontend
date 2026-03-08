"use client"

import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { useApp } from "@/lib/app-context"
import { type Complaint, type ComplaintDetail } from "@/lib/data"
import { getComplaintDetailApi } from "@/lib/api"
import confetti from "canvas-confetti"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle2, ChevronUp, MapPin, Building2, UserCircle2, Clock, Maximize2 } from "lucide-react"
import { formatDistanceToNow, isPast, format } from "date-fns"
import { cn } from "@/lib/utils"

const RANGOLI_PATTERN = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ff9933' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`

const priorityColors: Record<string, string> = {
    high: "bg-[#FF9933]/10 text-[#FF9933] border-[#FF9933]/20",
    medium: "bg-[#F4B400]/10 text-[#F4B400] border-[#F4B400]/20",
    low: "bg-[#2B6CEE]/10 text-[#2B6CEE] border-[#2B6CEE]/20",
}

const statusColors: Record<string, string> = {
    pending: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
    "in-progress": "bg-[#2B6CEE]/15 text-[#2B6CEE] dark:bg-[#2B6CEE]/10",
    resolved: "bg-[#F4B400]/15 text-[#F4B400] dark:bg-[#F4B400]/10",
    escalated: "bg-red-500/15 text-red-500",
}

export function CommunityView() {
    const { user, wardComplaints, upvoteComplaint, upvotedIds, selectedCommunityComplaintId, setSelectedCommunityComplaintId } = useApp()
    const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null)
    const [complaintDetail, setComplaintDetail] = useState<ComplaintDetail | null>(null)
    const [loadingDetail, setLoadingDetail] = useState(false)
    const [upvoting, setUpvoting] = useState(false)

    // Deep link from Map
    useEffect(() => {
        if (selectedCommunityComplaintId) {
            handleOpenComplaint(selectedCommunityComplaintId)
            // Clear the selection so it doesn't re-open if the user closes it and switches back
            setSelectedCommunityComplaintId(null)
        }
    }, [selectedCommunityComplaintId])

    // Image Viewer State
    const [viewerOpen, setViewerOpen] = useState(false)
    const [viewerImage, setViewerImage] = useState<string | null>(null)

    const recentWardComplaints = [...wardComplaints]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 50)

    const handleOpenComplaint = async (id: string) => {
        setSelectedComplaintId(id)
        const token = localStorage.getItem("token")
        if (!token) return

        setLoadingDetail(true)
        try {
            const detail = await getComplaintDetailApi(token, id)
            setComplaintDetail(detail)
        } catch (error) {
            console.error("Failed to fetch complaint details:", error)
        } finally {
            setLoadingDetail(false)
        }
    }

    const handleUpvote = async () => {
        if (!selectedComplaintId || !complaintDetail) return
        setUpvoting(true)
        try {
            const success = await upvoteComplaint(selectedComplaintId)
            if (success) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ["#FF9933", "#F4B400", "#2B6CEE"],
                })
                // Optimistically update the detailed view's vote count
                setComplaintDetail({
                    ...complaintDetail,
                    upvotes: (complaintDetail.upvotes || 0) + 1,
                    activities: [
                        ...complaintDetail.activities,
                        {
                            id: Date.now().toString(),
                            action: "Complaint Upvoted",
                            createdAt: new Date().toISOString(),
                            actor: user?.name || "Citizen",
                            details: "Community member upvoted this issue",
                            previousValue: "",
                            newValue: "",
                        }
                    ]
                })
            }
        } catch (err: any) {
            alert(err.message || "Failed to upvote complaint.")
        } finally {
            setUpvoting(false)
        }
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-3xl font-black tracking-tighter text-[#0a0e1a] dark:text-white uppercase italic">
                        Community <span className="text-[#FF9933]">Pulse</span>
                    </h2>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-[0.3em]">
                        Your voice in <strong className="text-[#FF9933]">{(user as any)?.ward}</strong> Area
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-900 p-1 rounded-xl border border-stone-200/50 dark:border-stone-800/50">
                    <Badge variant="outline" className="text-[10px] font-bold border-none text-stone-500 uppercase">
                        {recentWardComplaints.length} Active Issues
                    </Badge>
                </div>
            </div>

            {recentWardComplaints.length === 0 ? (
                <Card className="p-12 text-center border-dashed border-2 border-stone-200 dark:border-stone-800 bg-transparent">
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-12 w-12 rounded-full bg-stone-100 dark:bg-stone-900 flex items-center justify-center text-stone-400">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-bold text-stone-500 uppercase tracking-widest mt-2">
                            No public complaints found in your area.
                        </p>
                        <p className="text-xs text-stone-400">Be the first to report an issue in {(user as any)?.ward || "your ward"}.</p>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {recentWardComplaints.map((complaint, idx) => (
                        <motion.div
                            key={complaint.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            whileHover={{ y: -5 }}
                            className="group cursor-pointer"
                            onClick={() => handleOpenComplaint(complaint.id)}
                        >
                            <Card className="relative h-full overflow-hidden border-none bg-white/80 backdrop-blur-xl shadow-xl dark:bg-stone-900/80 transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-[#FF9933]/10 dark:border dark:border-stone-800/50">
                                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: RANGOLI_PATTERN }} />
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#FF9933]/20 to-transparent blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                                <CardHeader className="pb-3 relative z-10">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-stone-200 dark:border-stone-800 font-mono">
                                            #{complaint.id.substring(0, 5)}
                                        </Badge>
                                        <Badge className={cn("text-[9px] font-black uppercase tracking-widest border-0", statusColors[complaint.status])}>
                                            {complaint.status}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-lg font-black text-stone-900 dark:text-white leading-tight group-hover:text-[#FF9933] transition-colors line-clamp-2">
                                        {complaint.title}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="space-y-4 relative z-10">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-wider">
                                            <MapPin className="h-3 w-3 text-[#FF9933]" />
                                            <span className="truncate">{complaint.location.area}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                                            <Clock className="h-3 w-3" />
                                            {formatDistanceToNow(new Date(complaint.createdAt), { addSuffix: true })}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-stone-800/50">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#FF9933] to-[#F4B400] flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                                                <ChevronUp className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-stone-900 dark:text-white leading-none">
                                                    {complaint.upvotes || 0}
                                                </span>
                                                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Supports</span>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1", priorityColors[complaint.priority])}>
                                            {complaint.priority}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}

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
                                        <DialogTitle className="text-xl leading-tight pr-4">{complaintDetail.title}</DialogTitle>
                                        <DialogDescription className="mt-1">
                                            Reported by {complaintDetail.citizenName} in {complaintDetail.location.area}
                                        </DialogDescription>
                                    </div>
                                    <Badge className={cn("capitalize border-0 whitespace-nowrap", statusColors[complaintDetail.status])}>
                                        {complaintDetail.status}
                                    </Badge>
                                </div>
                            </DialogHeader>

                            <div className="grid gap-6 py-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" /> Dept</span>
                                        <p className="text-sm font-medium">{complaintDetail.department}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1"><UserCircle2 className="h-3 w-3" /> Assignee</span>
                                        <p className="text-sm font-medium">{complaintDetail.assignedOfficer || "Unassigned"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Created</span>
                                        <p className="text-sm font-medium">
                                            {new Date(complaintDetail.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">Priority</span>
                                        <Badge variant="outline" className={cn("capitalize text-[10px]", priorityColors[complaintDetail.priority])}>
                                            {complaintDetail.priority}
                                        </Badge>
                                    </div>
                                </div>

                                {complaintDetail.expectedResolutionDate && complaintDetail.status !== "resolved" && complaintDetail.status !== "closed" && (
                                    <div className={cn(
                                        "p-4 rounded-xl border flex items-center gap-3 mt-2",
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

                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold">Description</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {complaintDetail.description}
                                    </p>
                                </div>

                                {complaintDetail.photoUrl && (
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-semibold flex items-center gap-2">
                                            Attachment
                                            <Badge variant="secondary" className="text-[10px] font-normal cursor-pointer" onClick={() => { setViewerImage(complaintDetail.photoUrl!); setViewerOpen(true); }}>
                                                <Maximize2 className="h-3 w-3 mr-1" /> View Full Image
                                            </Badge>
                                        </h4>
                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                            <div
                                                className="shrink-0 relative group cursor-pointer"
                                                onClick={() => { setViewerImage(complaintDetail.photoUrl!); setViewerOpen(true); }}
                                            >
                                                <img src={complaintDetail.photoUrl} alt="Attachment" className="h-24 w-24 object-cover rounded-md border group-hover:opacity-80 transition-opacity" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                                                    <Maximize2 className="h-5 w-5 text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Upvote Button for Community Members */}
                                <div className="pt-2 border-t flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold flex items-center gap-1">
                                            <ChevronUp className="h-4 w-4 text-emerald-500" /> Community Upvotes
                                        </span>
                                        <span className="text-xs text-muted-foreground">Is this issue affecting you too? Show your support.</span>
                                    </div>
                                    <Button
                                        onClick={handleUpvote}
                                        disabled={upvoting || complaintDetail.authorId === user?.id || upvotedIds.has(complaintDetail.id)}
                                        variant="secondary"
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <ChevronUp className="h-4 w-4" />
                                        {upvoting ? "Voting..." :
                                            complaintDetail.authorId === user?.id ? "Your Report" :
                                                upvotedIds.has(complaintDetail.id) ? "Upvoted" : "+1 Upvote"}
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold flex items-center gap-2">
                                        Progress Updates
                                    </h4>
                                    <ScrollArea className="h-[200px] rounded-md border p-4 bg-muted/20">
                                        {complaintDetail.updates && complaintDetail.updates.length > 0 ? (
                                            <div className="space-y-4">
                                                {complaintDetail.updates.map((update: any) => (
                                                    <div key={update.id} className="relative pl-4 border-l-2 border-primary/20 pb-4 last:pb-0">
                                                        <div className="absolute w-2 h-2 bg-primary rounded-full -left-[5px] top-1.5" />
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge variant="outline" className="text-[9px] uppercase px-1.5">{update.phase}</Badge>
                                                            <span className="text-xs text-muted-foreground">
                                                                {formatDistanceToNow(new Date(update.createdAt), { addSuffix: true })}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm">{update.note}</p>
                                                        {update.photoUrl && (
                                                            <a href={update.photoUrl} target="_blank" rel="noreferrer" className="block mt-2">
                                                                <img src={update.photoUrl} alt="Update" className="h-20 w-32 object-cover rounded border" />
                                                            </a>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic">No progress updates available yet.</p>
                                        )}
                                    </ScrollArea>
                                </div>
                            </div>
                        </>
                    ) : null}
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

        </div>
    )
}
