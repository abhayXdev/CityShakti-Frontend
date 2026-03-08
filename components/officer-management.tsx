"use client"

import { useMemo } from "react"
import { useApp } from "@/lib/app-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Building2, CheckCircle2, AlertCircle, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"

const deptColors = [
  "bg-chart-1/10 text-chart-1",
  "bg-chart-2/10 text-chart-2",
  "bg-chart-3/10 text-chart-3",
  "bg-chart-4/10 text-chart-4",
  "bg-primary/10 text-primary",
  "bg-success/10 text-success",
  "bg-warning/10 text-warning-foreground",
  "bg-destructive/10 text-destructive",
]

export function OfficerManagement() {
  const { complaints } = useApp()

  // Group complaints by department from the live backend data
  const deptStats = useMemo(() => {
    const map: Record<string, { total: number; resolved: number; pending: number; assigned: number }> = {}
    for (const c of complaints) {
      const dept = c.department || "General"
      if (!map[dept]) map[dept] = { total: 0, resolved: 0, pending: 0, assigned: 0 }
      map[dept].total++
      if (c.status === "resolved") map[dept].resolved++
      else if (c.status === "pending") map[dept].pending++
      else map[dept].assigned++
    }
    return Object.entries(map)
      .map(([dept, stats]) => ({ dept, ...stats }))
      .sort((a, b) => b.total - a.total)
  }, [complaints])

  const unresolved = complaints.filter(
    (c) => c.status !== "resolved" && c.assignedOfficer
  )

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-foreground">Department Overview</h2>

      {/* Department cards */}
      {deptStats.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No complaints data yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {deptStats.map(({ dept, total, resolved, pending, assigned }, i) => {
            const resolutionPct = total > 0 ? Math.round((resolved / total) * 100) : 0
            const colorClass = deptColors[i % deptColors.length]
            return (
              <Card key={dept} className="hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("rounded-lg p-2 shrink-0", colorClass.split(" ")[0])}>
                      <Building2 className={cn("h-4 w-4", colorClass.split(" ")[1])} />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-semibold text-foreground leading-tight">{dept}</span>
                      <span className="text-[10px] text-muted-foreground">{total} total complaint{total !== 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center rounded-lg bg-success/10 p-2">
                      <span className="text-base font-bold text-success">{resolved}</span>
                      <span className="text-[10px] font-medium text-success/80">Done</span>
                    </div>
                    <div className="flex flex-col items-center rounded-lg bg-warning/10 p-2">
                      <span className="text-base font-bold text-warning-foreground">{pending}</span>
                      <span className="text-[10px] font-medium text-warning-foreground/80">Pending</span>
                    </div>
                    <div className="flex flex-col items-center rounded-lg bg-chart-1/10 p-2">
                      <span className="text-base font-bold text-chart-1">{assigned}</span>
                      <span className="text-[10px] font-medium text-chart-1/80">Active</span>
                    </div>
                  </div>

                  {/* Resolution bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Resolution rate</span>
                      <span className="font-medium text-foreground">{resolutionPct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-success transition-all shadow-sm"
                        style={{ width: `${resolutionPct}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Active/Assigned complaints table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              Active Complaints — In Progress ({unresolved.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {unresolved.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <CheckCircle2 className="h-10 w-10 text-success/50" />
              <p className="text-sm text-muted-foreground">
                All complaints are resolved or pending assignment
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">ID</TableHead>
                    <TableHead className="text-xs">Complaint</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Department</TableHead>
                    <TableHead className="text-xs">Priority</TableHead>
                    <TableHead className="text-xs">Assigned To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unresolved.slice(0, 10).map((complaint) => (
                    <TableRow key={complaint.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        #{complaint.id}
                      </TableCell>
                      <TableCell className="text-sm font-medium max-w-[200px] truncate">
                        {complaint.title}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                        {complaint.department}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] capitalize",
                            complaint.priority === "high"
                              ? "bg-destructive/10 text-destructive"
                              : complaint.priority === "medium"
                                ? "bg-warning/10 text-warning-foreground"
                                : "bg-success/10 text-success"
                          )}
                        >
                          {complaint.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {complaint.assignedOfficer || "—"}
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
