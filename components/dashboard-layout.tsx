"use client"

import { useApp } from "@/lib/app-context"
import {
  Shield,
  LayoutDashboard,
  BarChart3,
  Bell,
  FileDown,
  BrainCircuit,
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  Users,
  ScrollText,
  ContactRound,
  Building2,
  Map,
} from "lucide-react"
import { useTheme } from "next-themes"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { DashboardOverview } from "@/components/dashboard-overview"
import { AnalyticsSection } from "@/components/analytics-section"
import { OfficerManagement } from "@/components/officer-management"
import { NotificationFeed } from "@/components/notification-feed"
import { ExportReports } from "@/components/export-reports"
import { AIFeatures } from "@/components/ai-features"
import { CommunityView } from "@/components/community-view"
import { ContactUsView } from "@/components/contact-us-view"
import { MapView } from "@/components/map-view"

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "my-complaints", label: "Dashboard", icon: LayoutDashboard },
  { id: "track-complaints", label: "Track Complaints", icon: ScrollText },
  { id: "maps", label: "Interactive Map", icon: Map },
  { id: "community", label: "Community", icon: Users },
  { id: "contact", label: "Contact Us", icon: ContactRound },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "departments", label: "Departments", icon: Building2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "export", label: "Export & Reports", icon: FileDown },
  { id: "ai", label: "AI Features", icon: BrainCircuit },
]

export function DashboardLayout() {
  const { user, logout, activeView, setActiveView, notifications } = useApp()
  const { theme, setTheme } = useTheme()
  const unreadCount = notifications.filter((n) => !n.read).length

  // Filter useless components for citizens
  const filteredNavItems = navItems.filter((item) => {
    if (user?.role === "citizen") {
      return ["my-complaints", "track-complaints", "maps", "community", "contact", "notifications"].includes(item.id) // Added "contact" for citizen view
    } else {
      // Admin View
      return ["dashboard", "maps", "analytics", "departments", "notifications", "export", "ai"].includes(item.id)
    }
  })

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-bold text-sidebar-foreground leading-tight">
                SCMS
              </span>
              <span className="text-xs text-sidebar-foreground/60">
                Civic Monitoring
              </span>
            </div>
          </div>
        </SidebarHeader>

        <Separator className="bg-sidebar-border mx-0 w-full" />

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
              Navigation
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredNavItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeView === item.id}
                      onClick={() => setActiveView(item.id)}
                      tooltip={item.label}
                      className="gap-3"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {item.id === "notifications" && unreadCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="ml-auto h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px] group-data-[collapsible=icon]:hidden"
                        >
                          {unreadCount}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-3">
          <Separator className="bg-sidebar-border mx-0 mb-2 w-full" />
          <div className="flex flex-col gap-2 group-data-[collapsible=icon]:items-center">
            <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 px-3 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
                {user?.name?.charAt(0) ?? "U"}
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="text-xs font-medium text-sidebar-foreground">
                  {user?.name}
                </span>
                <span className="text-[10px] text-sidebar-foreground/50 capitalize">
                  {user?.role}
                </span>
              </div>
            </div>
            <div className="flex gap-1 group-data-[collapsible=icon]:flex-col">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex-1 justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent text-xs group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
              >
                {theme === "dark" ? (
                  <Sun className="h-3.5 w-3.5" />
                ) : (
                  <Moon className="h-3.5 w-3.5" />
                )}
                <span className="group-data-[collapsible=icon]:hidden">Theme</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="flex-1 justify-start gap-2 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 text-xs group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="group-data-[collapsible=icon]:hidden">Logout</span>
              </Button>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-sm">
          <SidebarTrigger>
            <ChevronLeft className="h-4 w-4" />
          </SidebarTrigger>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-sm font-semibold text-foreground capitalize">
              {filteredNavItems.find((n) => n.id === activeView)?.label ?? "Dashboard"}
            </h1>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {user?.role === "sudo" ? "Admin Department Access" :
                  user?.role === "officer" ? "Officer Access" : "Citizen Access"}
              </Badge>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          {activeView === "dashboard" && <DashboardOverview />}
          {activeView === "my-complaints" && <DashboardOverview />}
          {activeView === "track-complaints" && <DashboardOverview isTrackingOnly={true} />}
          {activeView === "maps" && <MapView />}
          {activeView === "community" && <CommunityView />}
          {activeView === "contact" && <ContactUsView />}
          {activeView === "analytics" && <AnalyticsSection />}
          {activeView === "departments" && <OfficerManagement />}
          {activeView === "notifications" && <NotificationFeed />}
          {activeView === "export" && <ExportReports />}
          {activeView === "ai" && <AIFeatures />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
