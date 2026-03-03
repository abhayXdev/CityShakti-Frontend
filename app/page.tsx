"use client"

import { useState } from "react"
import { AppProvider, useApp } from "@/lib/app-context"
import { LoginPage } from "@/components/login-page"
import { RegisterPage } from "@/components/register-page"
import { DashboardLayout } from "@/components/dashboard-layout"

function AppContent() {
  const { user, isRestoring } = useApp()
  const [showRegister, setShowRegister] = useState(false)

  if (isRestoring) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    if (showRegister) {
      return <RegisterPage onBackToLogin={() => setShowRegister(false)} />
    }
    return <LoginPage onSwitchToRegister={() => setShowRegister(true)} />
  }

  return <DashboardLayout />
}

export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
