"use client"

import { useState, useRef } from "react"
import { useApp } from "@/lib/app-context"
import { motion, AnimatePresence } from "motion/react"
import { Shield, User, Lock, ArrowRight, AlertCircle, Building2, Mail, CheckCircle, Loader2, RefreshCw, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { forgotPasswordApi, resetPasswordApi } from "@/lib/api"

interface LoginPageProps {
  onSwitchToRegister?: () => void
}

export function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const { login } = useApp()
  const [role, setRole] = useState<"citizen" | "officer" | "sudo">("citizen")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // ── FORGOT PASSWORD STATE ────────────────────────────
  const [showForgot, setShowForgot] = useState(false)
  const [fpStep, setFpStep] = useState<"email" | "otp" | "done">("email")
  const [fpEmail, setFpEmail] = useState("")
  const [fpOtp, setFpOtp] = useState(["", "", "", "", "", ""])
  const [fpNewPw, setFpNewPw] = useState("")
  const [fpConfirmPw, setFpConfirmPw] = useState("")
  const [fpError, setFpError] = useState("")
  const [fpLoading, setFpLoading] = useState(false)
  const [fpCountdown, setFpCountdown] = useState(0)
  const fpOtpRefs = useRef<Array<HTMLInputElement | null>>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    await new Promise((r) => setTimeout(r, 800))

    try {
      await login(role, username, password)
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-stone-50">
      {/* Animated background - Indian Flag Colors */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -left-1/4 h-[80vh] w-[80vh] rounded-full bg-[#FF9933]/10 blur-[100px]"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -right-1/4 -bottom-1/4 h-[80vh] w-[80vh] rounded-full bg-[#138808]/10 blur-[100px]"
        />
        <motion.div
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 h-[40vh] w-[40vh] rounded-full bg-[#000080]/5 blur-[80px]"
        />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 mx-4 w-full max-w-md">
        {/* Header badge */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
              Smart Civic Monitoring System
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Government of India - Digital Governance Portal
            </p>
          </div>
        </div>

        {/* Glass card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-border/50 bg-white/80 p-8 shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-8 flex gap-2 rounded-xl bg-stone-100/80 p-1 relative overflow-hidden">
            {/* Animated Tab Indicator */}
            <motion.div
              layoutId="activeTab"
              className={cn(
                "absolute inset-y-1 rounded-lg transition-colors duration-300",
                role === "citizen" ? "bg-[#FF9933]" : role === "officer" ? "bg-[#138808]" : "bg-[#000080]"
              )}
              initial={false}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{
                width: "calc(33.333% - 4px)",
                left: role === "citizen" ? "2px" : role === "officer" ? "calc(33.333% + 2px)" : "calc(66.666% + 2px)",
              }}
            />

            <button
              type="button"
              onClick={() => { setRole("citizen"); setError("") }}
              className={cn(
                "relative z-10 flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors",
                role === "citizen" ? "text-white" : "text-stone-500 hover:text-stone-900"
              )}
            >
              <User className="h-4 w-4" />
              Citizen
            </button>
            <button
              type="button"
              onClick={() => { setRole("officer"); setError("") }}
              className={cn(
                "relative z-10 flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors",
                role === "officer" ? "text-white" : "text-stone-500 hover:text-stone-900"
              )}
            >
              <Building2 className="h-4 w-4" />
              Officer
            </button>
            <button
              type="button"
              onClick={() => { setRole("sudo"); setError("") }}
              className={cn(
                "relative z-10 flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors",
                role === "sudo" ? "text-white" : "text-stone-500 hover:text-stone-900"
              )}
            >
              <Shield className="h-4 w-4" />
              Sudo
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username" className="text-sm font-medium text-foreground">
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder={
                    role === "sudo" ? "sudo@cityshakti.com"
                      : role === "officer" ? "officer@example.com"
                        : "citizen@example.com"
                  }
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 pl-10 bg-white border-stone-200 focus:border-[#FF9933] focus:ring-[#FF9933]/10 transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder={
                    role === "sudo" ? "Sudo Password"
                      : role === "officer" ? "Officer Password"
                        : "Your password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-10 bg-white border-stone-200 focus:border-[#FF9933] focus:ring-[#FF9933]/10 transition-all"
                  required
                />
              </div>
            </div>

            {/* Forgot Password link */}
            <div className="text-right -mt-1">
              <button
                type="button"
                onClick={() => { setShowForgot(true); setFpStep("email"); setFpError(""); setFpEmail(""); setFpOtp(["", "", "", "", "", ""]); setFpNewPw(""); setFpConfirmPw("") }}
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive border border-destructive/20"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              variant={role === "citizen" ? "gradient" : role === "officer" ? "gradient-success" : "gradient-navy"}
              className="h-12 w-full gap-2 text-base font-bold shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>



          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <button
              onClick={onSwitchToRegister}
              className="text-primary font-medium hover:underline focus:outline-none"
              type="button"
            >
              Register here
            </button>
          </div>
        </motion.div>

        {/* FORGOT PASSWORD MODAL */}
        {showForgot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
            <div className="w-full max-w-sm rounded-3xl border border-border/50 bg-card/95 p-7 shadow-2xl backdrop-blur-xl animate-in fade-in-50 zoom-in-95">

              {fpStep === "done" ? (
                <div className="flex flex-col items-center gap-4 text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Password Reset!</h3>
                  <p className="text-sm text-muted-foreground">Your password has been updated. You may now sign in.</p>
                  <Button className="w-full" onClick={() => setShowForgot(false)}>Back to Sign In</Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold text-foreground text-lg">
                      {fpStep === "email" ? "Forgot Password" : "Enter OTP & New Password"}
                    </h3>
                    <button onClick={() => setShowForgot(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
                  </div>

                  {fpStep === "email" && (
                    <div className="flex flex-col gap-4">
                      <p className="text-sm text-muted-foreground">Enter your registered email. We'll send a reset OTP.</p>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="email" placeholder="you@example.com"
                          value={fpEmail} onChange={e => setFpEmail(e.target.value)}
                          className="pl-10 bg-white border-stone-200 focus:border-[#FF9933] focus:ring-[#FF9933]/10 h-11"
                        />
                      </div>
                      {fpError && <p className="text-red-400 text-sm flex items-center gap-1"><AlertCircle className="w-4 h-4" />{fpError}</p>}
                      <Button
                        className="w-full h-11"
                        disabled={fpLoading}
                        onClick={async () => {
                          if (!fpEmail) return setFpError("Enter your email.")
                          setFpLoading(true); setFpError("")
                          try {
                            await forgotPasswordApi(fpEmail)
                            setFpStep("otp")
                            setFpCountdown(60)
                            setTimeout(() => fpOtpRefs.current[0]?.focus(), 100)
                          } catch (e: any) { setFpError(e.message) }
                          finally { setFpLoading(false) }
                        }}
                      >
                        {fpLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                        Send Reset OTP
                      </Button>
                    </div>
                  )}

                  {fpStep === "otp" && (
                    <div className="flex flex-col gap-4">
                      <p className="text-sm text-muted-foreground">Enter the 6-digit OTP sent to <span className="text-primary font-semibold">{fpEmail}</span>, then set a new password.</p>
                      {/* OTP boxes */}
                      <div className="flex justify-center gap-2">
                        {fpOtp.map((d, i) => (
                          <input key={i}
                            ref={el => { fpOtpRefs.current[i] = el }}
                            type="text" inputMode="numeric" maxLength={1} value={d}
                            onChange={e => {
                              const digit = e.target.value.replace(/\D/g, "").slice(-1)
                              const next = [...fpOtp]; next[i] = digit; setFpOtp(next)
                              if (digit && i < 5) fpOtpRefs.current[i + 1]?.focus()
                            }}
                            onKeyDown={e => { if (e.key === "Backspace" && !d && i > 0) fpOtpRefs.current[i - 1]?.focus() }}
                            className={cn(
                              "w-10 h-12 text-center text-xl font-bold rounded-lg border-2 bg-secondary text-foreground outline-none transition-all",
                              d ? "border-primary" : "border-border focus:border-primary"
                            )}
                          />
                        ))}
                      </div>
                      <button
                        onClick={async () => {
                          if (fpCountdown > 0) return
                          setFpLoading(true); setFpError("")
                          try { await forgotPasswordApi(fpEmail); setFpCountdown(60); setFpOtp(["", "", "", "", "", ""]) }
                          catch (e: any) { setFpError(e.message) }
                          finally { setFpLoading(false) }
                        }}
                        className={cn("text-xs flex items-center gap-1 mx-auto", fpCountdown > 0 ? "text-muted-foreground" : "text-primary hover:underline")}
                      >
                        <RefreshCw className="w-3 h-3" />{fpCountdown > 0 ? `Resend in ${fpCountdown}s` : "Resend OTP"}
                      </button>
                      <Input type="password" placeholder="New password (min 8 chars)" value={fpNewPw} onChange={e => setFpNewPw(e.target.value)} className="h-11" />
                      <Input type="password" placeholder="Confirm new password" value={fpConfirmPw} onChange={e => setFpConfirmPw(e.target.value)} className="h-11" />
                      {fpError && <p className="text-red-400 text-sm flex items-center gap-1"><AlertCircle className="w-4 h-4" />{fpError}</p>}
                      <Button
                        className="w-full h-11"
                        disabled={fpLoading || fpOtp.join("").length !== 6}
                        onClick={async () => {
                          if (fpNewPw.length < 8) return setFpError("Password must be at least 8 characters.")
                          if (fpNewPw !== fpConfirmPw) return setFpError("Passwords do not match.")
                          setFpLoading(true); setFpError("")
                          try {
                            await resetPasswordApi(fpEmail, fpOtp.join(""), fpNewPw)
                            setFpStep("done")
                          } catch (e: any) { setFpError(e.message) }
                          finally { setFpLoading(false) }
                        }}
                      >
                        {fpLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
                        Reset Password
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Secured by National Informatics Centre (NIC)
        </p>
      </div>
    </div>
  )
}
