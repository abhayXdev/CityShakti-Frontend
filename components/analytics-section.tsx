"use client"

import { useState, useMemo } from "react"
import { motion } from "motion/react"
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
  ResponsiveContainer,
} from "recharts"
import { cn } from "@/lib/utils"
import { useApp } from "@/lib/app-context"
import { Loader2 } from "lucide-react"

const chartConfig = {
  complaints: { label: "Complaints", color: "#FF9933" },
  resolved: { label: "Resolved", color: "#F4B400" },
}

const deptChartConfig = {
  complaints: { label: "Complaints", color: "#FF9933" },
}

const pieChartConfig = {
  high: { label: "High", color: "#FF9933" },
  medium: { label: "Medium", color: "#F4B400" },
  low: { label: "Low", color: "#2B6CEE" },
}

const donutChartConfig = {
  resolved: { label: "Resolved", color: "#F4B400" },
  pending: { label: "Pending", color: "#FF9933" },
  inProgress: { label: "In Progress", color: "#2B6CEE" },
  escalated: { label: "Escalated", color: "#ef4444" },
}

const RANGOLI_PATTERN = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ff9933' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`

export function AnalyticsSection() {
  const [filter, setFilter] = useState<"6" | "12">("12")
  const { complaints, isRestoring } = useApp()

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

  if (isRestoring) {
    return (
      <div className="flex h-[400px] w-full flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-[#FF9933]" />
        <p className="animate-pulse font-medium text-stone-500">Loading City Insights...</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col gap-8 p-1"
    >
      {/* Filter controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-[#0a0e1a] dark:text-white uppercase italic">
            City <span className="text-[#FF9933]">Insights</span>
          </h2>
          <p className="text-xs font-bold text-stone-400 uppercase tracking-[0.3em] mt-1">Real-time Command Analytics</p>
        </div>
        <div className="flex gap-1 rounded-2xl bg-stone-100 p-1.5 border border-stone-200/60 shadow-inner dark:bg-stone-900 dark:border-stone-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilter("6")}
            className={cn(
              "h-9 px-6 text-xs font-black uppercase tracking-widest transition-all duration-500 rounded-xl",
              filter === "6"
                ? "bg-[#FF9933] text-white shadow-lg shadow-orange-500/30 hover:bg-[#FF9933]/90 active:scale-95"
                : "hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500"
            )}
          >
            6 Months
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilter("12")}
            className={cn(
              "h-9 px-6 text-xs font-black uppercase tracking-widest transition-all duration-500 rounded-xl",
              filter === "12"
                ? "bg-[#FF9933] text-white shadow-lg shadow-orange-500/30 hover:bg-[#FF9933]/90 active:scale-95"
                : "hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500"
            )}
          >
            12 Months
          </Button>
        </div>
      </div>

      {/* Pulsing Insights Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative group cursor-default"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#FF9933] to-[#F4B400] rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse" />
          <Card className="relative border-none bg-white/80 backdrop-blur-md dark:bg-stone-900/80 rounded-2xl p-6 shadow-xl">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Resolution Rate</span>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-3xl font-black text-stone-900 dark:text-white">
                {monthlyData.length > 0 ? Math.round((monthlyData.reduce((acc, m) => acc + m.resolved, 0) / monthlyData.reduce((acc, m) => acc + m.complaints, 0)) * 100) : 0}%
              </span>
              <span className="text-xs font-bold text-green-500 mb-1">+2.4% ↑</span>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative group cursor-default"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#2B6CEE] to-blue-400 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000 group-hover:duration-200" />
          <Card className="relative border-none bg-white/80 backdrop-blur-md dark:bg-stone-900/80 rounded-2xl p-6 shadow-xl">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Avg Response</span>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-3xl font-black text-stone-900 dark:text-white">4.2h</span>
              <span className="text-xs font-bold text-stone-400 mb-1">vs 5.1h</span>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="relative group cursor-default"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000 group-hover:duration-200" />
          <Card className="relative border-none bg-white/80 backdrop-blur-md dark:bg-stone-900/80 rounded-2xl p-6 shadow-xl">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Active Bottlenecks</span>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-3xl font-black text-stone-900 dark:text-white">
                {complaints.filter(c => c.isSlaBreached).length}
              </span>
              <span className="text-xs font-bold text-red-500 mb-1">Criticial !</span>
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Status Donut Chart */}
        <motion.div whileHover={{ scale: 1.01 }} className="h-full">
          <Card className="h-full overflow-hidden border-none bg-white/70 backdrop-blur-md shadow-xl dark:bg-stone-900/60 dark:border dark:border-stone-800 relative group transition-all duration-500 hover:shadow-2xl hover:shadow-[#FF9933]/10">
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: RANGOLI_PATTERN }} />
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF9933]/10 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-[#FF9933]/20 transition-colors duration-500" />
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold bg-gradient-to-r from-[#0a0e1a] to-stone-600 bg-clip-text text-transparent dark:from-white dark:to-stone-400">
                Complaint Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={donutChartConfig} className="mx-auto aspect-square max-h-[300px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={6}
                    dataKey="value"
                    nameKey="name"
                    strokeWidth={0}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} className="transition-all duration-500 hover:opacity-80" />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(value: string) => (
                      <span className="text-xs font-medium text-stone-600 dark:text-stone-400">{value}</span>
                    )}
                  />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Monthly Trend Line Chart */}
        <motion.div whileHover={{ scale: 1.01 }} className="h-full">
          <Card className="h-full overflow-hidden border-none bg-white/70 backdrop-blur-md shadow-xl dark:bg-stone-900/60 dark:border dark:border-stone-800 relative group transition-all duration-500 hover:shadow-2xl hover:shadow-[#F4B400]/10">
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: RANGOLI_PATTERN }} />
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#F4B400]/10 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-[#F4B400]/20 transition-colors duration-500" />
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold bg-gradient-to-r from-[#0a0e1a] to-stone-600 bg-clip-text text-transparent dark:from-white dark:to-stone-400">
                Monthly Complaint Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <LineChart data={filteredMonthly}>
                  <defs>
                    <linearGradient id="colorComplaints" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF9933" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#FF9933" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-stone-200 dark:stroke-stone-800" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    className="fill-stone-500"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    className="fill-stone-500"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="complaints"
                    stroke="#FF9933"
                    strokeWidth={4}
                    dot={{ r: 4, fill: "#FF9933", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 7, strokeWidth: 0 }}
                    animationDuration={2000}
                  />
                  <Line
                    type="monotone"
                    dataKey="resolved"
                    stroke="#F4B400"
                    strokeWidth={4}
                    dot={{ r: 4, fill: "#F4B400", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 7, strokeWidth: 0 }}
                    animationDuration={2000}
                    animationBegin={500}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Department Bar Chart */}
        <motion.div whileHover={{ scale: 1.01 }} className="h-full">
          <Card className="h-full overflow-hidden border-none bg-white/70 backdrop-blur-md shadow-xl dark:bg-stone-900/60 dark:border dark:border-stone-800 relative group transition-all duration-500 hover:shadow-2xl hover:shadow-[#2B6CEE]/10">
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: RANGOLI_PATTERN }} />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#2B6CEE]/10 blur-3xl -ml-16 -mb-16 rounded-full group-hover:bg-[#2B6CEE]/20 transition-colors duration-500" />
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold bg-gradient-to-r from-[#0a0e1a] to-stone-600 bg-clip-text text-transparent dark:from-white dark:to-stone-400">
                Department Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {departmentData.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-sm italic text-stone-400">
                  Gathering city data...
                </div>
              ) : (
                <ChartContainer config={deptChartConfig} className="h-[300px] w-full">
                  <BarChart data={departmentData} layout="vertical">
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#FF9933" />
                        <stop offset="100%" stopColor="#F4B400" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-stone-200 dark:stroke-stone-800" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="department"
                      tick={{ fontSize: 10, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                      className="fill-stone-600 dark:fill-stone-400 uppercase tracking-tighter"
                      width={100}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="complaints"
                      fill="url(#barGradient)"
                      radius={[0, 12, 12, 0]}
                      barSize={20}
                      animationDuration={2000}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Priority Pie Chart */}
        <motion.div whileHover={{ scale: 1.01 }} className="h-full">
          <Card className="h-full overflow-hidden border-none bg-white/70 backdrop-blur-md shadow-xl dark:bg-stone-900/60 dark:border dark:border-stone-800 relative group transition-all duration-500 hover:shadow-2xl hover:shadow-[#FF9933]/10">
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: RANGOLI_PATTERN }} />
            <div className="absolute top-0 left-0 w-32 h-32 bg-[#FF9933]/10 blur-3xl -ml-16 -mt-16 rounded-full group-hover:bg-[#FF9933]/20 transition-colors duration-500" />
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold bg-gradient-to-r from-[#0a0e1a] to-stone-600 bg-clip-text text-transparent dark:from-white dark:to-stone-400">
                Priority Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={pieChartConfig} className="mx-auto aspect-square max-h-[300px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={0}
                    dataKey="value"
                    nameKey="name"
                    strokeWidth={2}
                    stroke="#fff"
                    className="dark:stroke-stone-900"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} className="transition-all duration-500 hover:scale-105" />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    iconType="diamond"
                    formatter={(value: string) => (
                      <span className="text-xs font-medium text-stone-600 dark:text-stone-400 uppercase tracking-wider">{value}</span>
                    )}
                  />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
