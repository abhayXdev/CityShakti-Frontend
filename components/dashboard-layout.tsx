"use client"

import { useApp } from "@/lib/app-context"
import { cn } from "@/lib/utils"
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
import { motion, AnimatePresence } from "motion/react"
import { PageTransition } from "@/components/page-transition"
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

const RANGOLI_PATTERN = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ff9933' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`

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
      <Sidebar variant="sidebar" collapsible="icon" className="border-r border-stone-200 dark:border-stone-800">
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: RANGOLI_PATTERN }} />
        <SidebarHeader className="p-6 relative z-10">
          <div className="flex items-center gap-4 group-data-[collapsible=icon]:justify-center">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.1 }}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF9933] to-[#F4B400] text-white shadow-xl shadow-orange-500/30"
            >
              <Shield className="h-6 w-6" />
            </motion.div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-xl font-black text-[#0a0e1a] dark:text-white leading-none tracking-tighter">
                JAN<span className="text-[#FF9933]">SETU</span>
              </span>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mt-1">
                Command Center
              </span>
            </div>
          </div>
        </SidebarHeader>

        <Separator className="bg-stone-200/50 dark:bg-stone-800/50 mx-4 w-auto" />

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
                      className={cn(
                        "gap-3 h-11 px-4 rounded-xl transition-all duration-300",
                        activeView === item.id
                          ? "bg-gradient-to-r from-[#FF9933]/15 to-transparent text-[#FF9933] font-bold shadow-none border-l-4 border-[#FF9933] rounded-l-none"
                          : "hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4 transition-transform duration-300", activeView === item.id ? "scale-110" : "group-hover:scale-110")} />
                      <span className="text-sm tracking-tight">{item.label}</span>
                      {item.id === "notifications" && unreadCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="ml-auto h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px] bg-[#FF9933] text-white border-none group-data-[collapsible=icon]:hidden shadow-lg shadow-orange-500/20"
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

      <SidebarInset className="bg-[#fdfdfd] dark:bg-[#0a0e1a]">
        <header className="sticky top-0 z-20 flex h-20 items-center gap-4 border-b border-stone-200/50 bg-white/70 backdrop-blur-2xl px-8 dark:bg-stone-900/60 dark:border-stone-800/50">
          <SidebarTrigger className="hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors h-10 w-10">
            <ChevronLeft className="h-5 w-5" />
          </SidebarTrigger>
          <Separator orientation="vertical" className="h-6 bg-stone-200 dark:bg-stone-800" />
          <div className="flex flex-1 items-center justify-between">
            <div className="flex flex-col">
              <h1 className="text-lg font-black text-stone-900 dark:text-white capitalize tracking-tight">
                {filteredNavItems.find((n) => n.id === activeView)?.label ?? "Dashboard"}
              </h1>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none mt-1">
                JanSetu Portal
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex flex-col items-end mr-2">
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  {new Date().toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span className="text-[10px] text-stone-400 font-medium">Digital India Initiative</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-1 rounded-full shadow-sm">
                {user?.role === "sudo" ? "Master Command" :
                  user?.role === "officer" ? "Officer Portal" : "Citizen Portal"}
              </Badge>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <AnimatePresence mode="wait">
            {activeView === "dashboard" && (
              <PageTransition key="dashboard">
                <DashboardOverview />
              </PageTransition>
            )}
            {activeView === "my-complaints" && (
              <PageTransition key="my-complaints">
                <DashboardOverview />
              </PageTransition>
            )}
            {activeView === "track-complaints" && (
              <PageTransition key="track-complaints">
                <DashboardOverview isTrackingOnly={true} />
              </PageTransition>
            )}
            {activeView === "maps" && (
              <PageTransition key="maps">
                <MapView />
              </PageTransition>
            )}
            {activeView === "community" && (
              <PageTransition key="community">
                <CommunityView />
              </PageTransition>
            )}
            {activeView === "contact" && (
              <PageTransition key="contact">
                <ContactUsView />
              </PageTransition>
            )}
            {activeView === "analytics" && (
              <PageTransition key="analytics">
                <AnalyticsSection />
              </PageTransition>
            )}
            {activeView === "departments" && (
              <PageTransition key="departments">
                <OfficerManagement />
              </PageTransition>
            )}
            {activeView === "notifications" && (
              <PageTransition key="notifications">
                <NotificationFeed />
              </PageTransition>
            )}
            {activeView === "export" && (
              <PageTransition key="export">
                <ExportReports />
              </PageTransition>
            )}
            {activeView === "ai" && (
              <PageTransition key="ai">
                <AIFeatures />
              </PageTransition>
            )}
          </AnimatePresence>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
