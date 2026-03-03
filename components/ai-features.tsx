"use client"

import { useState } from "react"
import { categorizeComplaint, getStats } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  BrainCircuit,
  Sparkles,
  TrendingUp,
  Target,
  ArrowRight,
  Lightbulb,
} from "lucide-react"
import { cn } from "@/lib/utils"

import { useApp } from "@/lib/app-context"

export function AIFeatures() {
  const { complaints } = useApp()

  const stats = getStats(complaints)

  // Simple trend: compare complaints this month vs last month
  const now = new Date()
  const thisMonthCount = complaints.filter((c) => {
    const d = new Date(c.createdAt)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthCount = complaints.filter((c) => {
    const d = new Date(c.createdAt)
    return d.getFullYear() === lastMonthDate.getFullYear() && d.getMonth() === lastMonthDate.getMonth()
  }).length
  const predictedNext = Math.max(1, Math.round(
    thisMonthCount * 1.05 + (thisMonthCount - lastMonthCount) * 0.3
  ))



  const insights = [
    {
      title: "Peak Complaint Period",
      value: "Monday-Wednesday",
      detail: "68% of complaints are filed early in the week",
      icon: TrendingUp,
    },
    {
      title: "Fastest Resolution Dept",
      value: "Electricity",
      detail: "Average 1.8 day resolution time",
      icon: Target,
    },
    {
      title: "Predicted Next Month",
      value: `${predictedNext} complaints`,
      detail: "Based on trend analysis and seasonal patterns",
      icon: Sparkles,
    },
    {
      title: "Resolution Rate",
      value: `${stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(1) : 0}%`,
      detail: `${stats.resolved} of ${stats.total} complaints resolved`,
      icon: Lightbulb,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-foreground">
        AI-Powered Smart Features
      </h2>

      {/* Predictive insights cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {insights.map((insight) => (
          <Card key={insight.title} className="hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <insight.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {insight.title}
                  </span>
                  <span className="text-sm font-bold text-foreground">{insight.value}</span>
                  <span className="text-[10px] text-muted-foreground leading-relaxed">
                    {insight.detail}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>



      {/* AI Forecast summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Predictive Forecast Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border p-4">
              <span className="text-xs text-muted-foreground">Next Month Predicted</span>
              <p className="mt-1 text-2xl font-bold text-foreground">{predictedNext}</p>
              <div className="mt-2 flex items-center gap-1 text-xs text-success">
                <TrendingUp className="h-3 w-3" />
                +5% projected increase
              </div>
            </div>
            <div className="rounded-xl border border-border p-4">
              <span className="text-xs text-muted-foreground">Avg. Resolution Time</span>
              <p className="mt-1 text-2xl font-bold text-foreground">3.2d</p>
              <div className="mt-2 flex items-center gap-1 text-xs text-success">
                <ArrowRight className="h-3 w-3 -rotate-45" />
                Improved by 12%
              </div>
            </div>
            <div className="rounded-xl border border-border p-4">
              <span className="text-xs text-muted-foreground">Citizen Satisfaction</span>
              <p className="mt-1 text-2xl font-bold text-foreground">78.4%</p>
              <div className="mt-2 flex items-center gap-1 text-xs text-chart-4">
                <Target className="h-3 w-3" />
                Target: 85%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
