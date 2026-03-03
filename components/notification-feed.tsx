"use client"

import { useEffect, useState, useRef } from "react"
import { useApp } from "@/lib/app-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

const typeConfig = {
  "new-complaint": {
    icon: Bell,
    color: "text-chart-1",
    bg: "bg-chart-1/10",
    label: "New Complaint",
  },
  "status-update": {
    icon: Info,
    color: "text-chart-2",
    bg: "bg-chart-2/10",
    label: "Status Update",
  },
  escalation: {
    icon: AlertTriangle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    label: "Escalation",
  },
  resolved: {
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/10",
    label: "Resolved",
  },
}

export function NotificationFeed() {
  const { notifications, markNotificationRead } = useApp()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Real-Time Notification Feed
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {notifications.map((notification, index) => {
          const config = typeConfig[notification.type as keyof typeof typeConfig]
          const Icon = config.icon

          return (
            <Card
              key={notification.id}
              className={cn(
                "transition-all duration-300",
                !notification.read && "border-primary/30 bg-primary/[0.02]",
                index === 0 && !notification.read && "animate-in slide-in-from-top-2"
              )}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <div className={cn("mt-0.5 rounded-lg p-2", config.bg)}>
                  <Icon className={cn("h-4 w-4", config.color)} />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                      "text-sm",
                      !notification.read ? "font-medium text-foreground" : "text-muted-foreground"
                    )}>
                      {notification.message}
                    </p>
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markNotificationRead(notification.id)}
                        className="h-6 shrink-0 px-2 text-[10px] text-muted-foreground"
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("text-[9px]", config.color)}>
                      {config.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.timestamp), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div >
  )
}
