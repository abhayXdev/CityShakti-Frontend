"use client"

import { useState, useEffect } from "react"
import { useApp } from "@/lib/app-context"
import { type Complaint, type ComplaintDetail } from "@/lib/data"
import { getComplaintDetailApi } from "@/lib/api"
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

const priorityColors: Record<string, string> = {
    high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200",
    low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200",
}

const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    "in-progress": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    escalated: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
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
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight">Community Issues</h2>
                <p className="text-muted-foreground">
                    View and support public complaints raised by citizens in <strong className="text-foreground">{(user as any)?.ward}</strong>.
                </p>
            </div>

            <Card>
                <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold">
                            Recent Issues in {(user as any)?.ward || "Your Area"}
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        {recentWardComplaints.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground text-sm">
                                No public complaints found in your area.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-xs">ID</TableHead>
                                        <TableHead className="text-xs">Complaint</TableHead>
                                        <TableHead className="text-xs">Votes</TableHead>
                                        <TableHead className="text-xs">Priority</TableHead>
                                        <TableHead className="text-xs">Status</TableHead>
                                        <TableHead className="text-xs hidden lg:table-cell">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentWardComplaints.map((complaint) => (
                                        <TableRow
                                            key={complaint.id}
                                            className="cursor-pointer hover:bg-muted/50 transition-colors group"
                                            onClick={() => handleOpenComplaint(complaint.id)}
                                        >
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                #{complaint.id.substring(0, 4)}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] text-sm py-3">
                                                <p className="font-medium truncate">{complaint.title}</p>
                                                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                                                    <MapPin className="h-3 w-3" />
                                                    {complaint.location.area}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-[10px] tabular-nums font-mono">
                                                    {complaint.upvotes || 0}
                                                </Badge>
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
                                                <Badge
                                                    className={cn(
                                                        "text-[10px] capitalize border-0",
                                                        statusColors[complaint.status]
                                                    )}
                                                >
                                                    {complaint.status}
                                                </Badge>
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
