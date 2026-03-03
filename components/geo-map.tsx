"use client"

import { useMemo } from "react"
import { useApp } from "@/lib/app-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, AlertTriangle, Clock, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

const priorityColors = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-success text-success-foreground",
}

const statusIcons = {
  pending: Clock,
  "in-progress": MapPin,
  resolved: CheckCircle2,
  escalated: AlertTriangle,
}

export function GeoMap() {
  const { complaints } = useApp()

  const mapComplaints = useMemo(
    () => complaints.slice(0, 30),
    [complaints]
  )

  const areaStats = useMemo(() => {
    const areas: Record<string, { count: number; high: number; pending: number }> = {}
    complaints.forEach((c) => {
      if (!areas[c.location.area]) {
        areas[c.location.area] = { count: 0, high: 0, pending: 0 }
      }
      areas[c.location.area].count++
      if (c.priority === "high") areas[c.location.area].high++
      if (c.status === "pending") areas[c.location.area].pending++
    })
    return Object.entries(areas)
      .map(([area, stats]) => ({ area, ...stats }))
      .sort((a, b) => b.count - a.count)
  }, [complaints])

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-foreground">
        Geo Mapping - Complaint Distribution
      </h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Map visualization */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Interactive Map View
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-secondary">
              {/* OpenStreetMap embed */}
              <iframe
                title="Complaint Map"
                src="https://www.openstreetmap.org/export/embed.html?bbox=68.0,6.5,97.5,37.5&layer=mapnik"
                className="h-full w-full border-0 rounded-xl"
                loading="lazy"
              />
              {/* Overlay markers */}
              <div className="absolute inset-0 pointer-events-none">
                {mapComplaints.slice(0, 12).map((c, i) => {
                  const top = 15 + ((i * 7) % 70)
                  const left = 10 + ((i * 11) % 80)
                  return (
                    <div
                      key={c.id}
                      className="absolute pointer-events-auto"
                      style={{ top: `${top}%`, left: `${left}%` }}
                    >
                      <div className="group relative">
                        <div
                          className={cn(
                            "h-3 w-3 rounded-full border-2 border-card shadow-lg cursor-pointer transition-transform hover:scale-150",
                            c.priority === "high"
                              ? "bg-destructive"
                              : c.priority === "medium"
                                ? "bg-warning"
                                : "bg-success"
                          )}
                        />
                        {c.priority === "high" && (
                          <div className="absolute inset-0 h-3 w-3 animate-ping rounded-full bg-destructive/40" />
                        )}
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                          <div className="rounded-lg bg-popover px-3 py-2 text-xs shadow-lg border border-border min-w-[160px]">
                            <p className="font-medium text-popover-foreground">{c.title}</p>
                            <p className="text-muted-foreground mt-0.5">{c.location.area}</p>
                            <div className="mt-1 flex gap-1">
                              <Badge variant="outline" className="text-[9px] capitalize">
                                {c.priority}
                              </Badge>
                              <Badge variant="outline" className="text-[9px] capitalize">
                                {c.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive" />
                <span className="text-xs text-muted-foreground">High Priority</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-warning" />
                <span className="text-xs text-muted-foreground">Medium Priority</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-success" />
                <span className="text-xs text-muted-foreground">Low Priority</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Area statistics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Area Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {areaStats.slice(0, 10).map((area) => (
                <div
                  key={area.area}
                  className="flex items-start justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-foreground">
                      {area.area}
                    </span>
                    <div className="flex gap-2 text-[10px] text-muted-foreground">
                      <span>{area.count} total</span>
                      <span>{area.pending} pending</span>
                    </div>
                  </div>
                  {area.high > 0 && (
                    <Badge variant="destructive" className="text-[9px]">
                      {area.high} high
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
