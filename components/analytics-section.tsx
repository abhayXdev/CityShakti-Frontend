"use client"

import { useState, useMemo } from "react"
import { getPriorityData, getStatusData } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts"
import { cn } from "@/lib/utils"
import { useApp } from "@/lib/app-context"

const chartConfig = {
  complaints: { label: "Complaints", color: "var(--color-chart-1)" },
  resolved: { label: "Resolved", color: "var(--color-chart-2)" },
}

const deptChartConfig = {
  complaints: { label: "Complaints", color: "var(--color-chart-1)" },
}

const pieChartConfig = {
  high: { label: "High", color: "var(--color-chart-3)" },
  medium: { label: "Medium", color: "var(--color-chart-4)" },
  low: { label: "Low", color: "var(--color-chart-2)" },
}

const donutChartConfig = {
  resolved: { label: "Resolved", color: "var(--color-chart-2)" },
  pending: { label: "Pending", color: "var(--color-chart-4)" },
  inProgress: { label: "In Progress", color: "var(--color-chart-1)" },
  escalated: { label: "Escalated", color: "var(--color-chart-3)" },
}

export function AnalyticsSection() {
  const [filter, setFilter] = useState<"6" | "12">("12")
  const { complaints } = useApp()

  // Compute monthly trend from real complaints
  const monthlyData = useMemo(() => {
    const months: { month: string; complaints: number; resolved: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const monthLabel = d.toLocaleString("en-IN", { month: "short" })
      const year = d.getFullYear()
      const monthIdx = d.getMonth()
      const inMonth = complaints.filter((c) => {
        const cd = new Date(c.createdAt)
        return cd.getFullYear() === year && cd.getMonth() === monthIdx
      })
      months.push({
        month: monthLabel,
        complaints: inMonth.length,
        resolved: inMonth.filter((c) => c.status === "resolved").length,
      })
    }
    return months
  }, [complaints])

  const filteredMonthly = filter === "6" ? monthlyData.slice(6) : monthlyData

  // Compute department data from real complaints
  const departmentData = useMemo(() => {
    const deptMap: Record<string, number> = {}
    for (const c of complaints) {
      const dept = c.department || "General"
      deptMap[dept] = (deptMap[dept] || 0) + 1
    }
    return Object.entries(deptMap)
      .map(([dept, count]) => ({
        department: dept.length > 14 ? dept.substring(0, 14) + "…" : dept,
        fullName: dept,
        complaints: count,
      }))
      .sort((a, b) => b.complaints - a.complaints)
      .slice(0, 8)
  }, [complaints])

  const priorityData = getPriorityData(complaints)
  const statusData = getStatusData(complaints)

  return (
    <div className="flex flex-col gap-6">
      {/* Filter controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Advanced Analytics
        </h2>
        <div className="flex gap-1 rounded-lg bg-secondary p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilter("6")}
            className={cn(
              "h-7 text-xs",
              filter === "6" && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            )}
          >
            6 Months
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilter("12")}
            className={cn(
              "h-7 text-xs",
              filter === "12" && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            )}
          >
            12 Months
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status Donut Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Complaint Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={donutChartConfig} className="mx-auto aspect-square max-h-[280px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                  strokeWidth={0}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  formatter={(value: string) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Monthly Trend Line Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Monthly Complaint Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <LineChart data={filteredMonthly}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="complaints"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--color-chart-1)" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--color-chart-2)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Department Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Department-wise Complaints
            </CardTitle>
          </CardHeader>
          <CardContent>
            {departmentData.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No complaints data yet
              </div>
            ) : (
              <ChartContainer config={deptChartConfig} className="h-[280px] w-full">
                <BarChart data={departmentData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis
                    type="category"
                    dataKey="department"
                    tick={{ fontSize: 10 }}
                    className="fill-muted-foreground"
                    width={100}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="complaints"
                    fill="var(--color-chart-1)"
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Priority Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Priority Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={pieChartConfig} className="mx-auto aspect-square max-h-[280px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  nameKey="name"
                  strokeWidth={0}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  formatter={(value: string) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
