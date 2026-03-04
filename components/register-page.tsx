"use client"

import { useState, useEffect, useRef } from "react"
import { useApp } from "@/lib/app-context"
import {
    Shield, User, Lock, ArrowRight, AlertCircle, Building2, Mail,
    MapPin, Loader2, CheckCircle, RefreshCw, Eye, EyeOff, KeyRound, ArrowLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { registerApi, sendEmailOtpApi, verifyEmailOtpApi } from "@/lib/api"
import { fetchPincodeInfo, formatPincodeArea, type PincodeInfo, type PincodeStatus } from "@/lib/pincode"

interface RegisterPageProps {
    onBackToLogin: () => void
}

const DEPARTMENTS = [
    "Public Works Department",
    "Water Supply & Sanitation",
    "Electricity & Power",
    "Health & Sanitation",
    "Urban Planning",
    "Road & Transport",
    "Parks & Recreation",
    "Revenue Department",
    "General Administration",
]

export function RegisterPage({ onBackToLogin }: RegisterPageProps) {
    // ── FORM STATE ─────────────────────────────────────────────────
    const [role, setRole] = useState<"citizen" | "officer">("citizen")
    const [fullName, setFullName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [pincode, setPincode] = useState("")
    const [pincodeInfo, setPincodeInfo] = useState<PincodeInfo | null>(null)
    const [pincodeStatus, setPincodeStatus] = useState<PincodeStatus>("idle")
    const [department, setDepartment] = useState("")
    const [error, setError] = useState("")
    const [successMsg, setSuccessMsg] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    // ── OTP STATE ──────────────────────────────────────────────────
    const [otpStage, setOtpStage] = useState<"form" | "otp">("form")
    const [otp, setOtp] = useState(["", "", "", "", "", ""])
    const [otpCountdown, setOtpCountdown] = useState(0)
    const otpRefs = useRef<Array<HTMLInputElement | null>>([])

    // ── PIN CODE AUTO-LOOKUP ───────────────────────────────────────
    useEffect(() => {
        if (pincode.length !== 6) {
            setPincodeInfo(null)
            return
        }
        setPincodeStatus("loading")
        fetchPincodeInfo(pincode).then((info) => {
            if (info) { setPincodeInfo(info); setPincodeStatus("valid") }
            else { setPincodeInfo(null); setPincodeStatus("invalid") }
        })
    }, [pincode])

    // ── OTP COUNTDOWN TIMER ────────────────────────────────────────
    useEffect(() => {
        if (otpCountdown <= 0) return
        const t = setTimeout(() => setOtpCountdown(c => c - 1), 1000)
        return () => clearTimeout(t)
    }, [otpCountdown])

    // ── STEP 1: SEND OTP ──────────────────────────────────────────
    const handleSendOtp = async () => {
        setError("")
        if (!fullName.trim()) return setError("Please enter your full name.")
        if (!email.trim()) return setError("Please enter your email address.")
        if (!password) return setError("Please enter a password.")
        if (password.length < 8) return setError("Password must be at least 8 characters.")
        if (password !== confirmPassword) return setError("Passwords do not match.")
        if (role === "citizen" && !pincode) return setError("Please enter your PIN code.")
        if (role === "officer" && !department) return setError("Please select your department.")

        setIsLoading(true)
        try {
            await sendEmailOtpApi(email)
            setOtpStage("otp")
            setOtpCountdown(60)
            setTimeout(() => otpRefs.current[0]?.focus(), 100)
        } catch (e: any) {
            setError(e.message || "Failed to send OTP.")
        } finally {
            setIsLoading(false)
        }
    }

    // ── OTP INPUT HANDLERS ─────────────────────────────────────────
    const handleOtpChange = (index: number, value: string) => {
        const digit = value.replace(/\D/g, "").slice(-1)
        const next = [...otp]
        next[index] = digit
        setOtp(next)
        if (digit && index < 5) otpRefs.current[index + 1]?.focus()
    }

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus()
        }
    }

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("")
        if (digits.length === 6) {
            setOtp(digits)
            otpRefs.current[5]?.focus()
        }
    }

    // ── STEP 2: VERIFY OTP + REGISTER ─────────────────────────────
    const handleVerifyAndRegister = async () => {
        setError("")
        const code = otp.join("")
        if (code.length !== 6) return setError("Please enter the complete 6-digit OTP.")
        setIsLoading(true)
        try {
            await verifyEmailOtpApi(email, code)
            await registerApi({
                full_name: fullName,
                email,
                password,
                role,
                ward: pincode || undefined,
                department: department || undefined,
            })
            setSuccessMsg(
                role === "officer"
                    ? "Registration submitted! Your account is pending Super Admin approval."
                    : "Account created successfully! You can now log in."
            )
        } catch (e: any) {
            setError(e.message || "Something went wrong.")
        } finally {
            setIsLoading(false)
        }
    }

    const handleResendOtp = async () => {
        if (otpCountdown > 0) return
        setError("")
        setIsLoading(true)
        try {
            await sendEmailOtpApi(email)
            setOtpCountdown(60)
            setOtp(["", "", "", "", "", ""])
            otpRefs.current[0]?.focus()
        } catch (e: any) {
            setError(e.message)
        } finally {
            setIsLoading(false)
        }
    }

    // ── SUCCESS SCREEN ─────────────────────────────────────────────
    if (successMsg) {
        return (
            <div className="flex flex-col items-center justify-center gap-6 py-12 text-center animate-in fade-in-50">
                <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Registration Complete!</h2>
                    <p className="text-slate-400 max-w-sm">{successMsg}</p>
                </div>
                <Button
                    onClick={onBackToLogin}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-xl"
                >
                    Go to Login
                </Button>
            </div>
        )
    }

    const renderOtpStage = () => (
        <div className="flex flex-col gap-6 animate-in fade-in-50 slide-in-from-right-4">
            <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-600/10 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Verify Your Email</h2>
                <p className="text-muted-foreground text-sm mt-1">
                    We sent a 6-digit code to{" "}
                    <span className="text-primary font-semibold">{email}</span>
                </p>
            </div>

            {/* 6-BOX OTP INPUT */}
            <div
                className="flex justify-center gap-3"
                onPaste={handleOtpPaste}
            >
                {otp.map((digit, i) => (
                    <input
                        key={i}
                        ref={el => { otpRefs.current[i] = el }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        className={cn(
                            "w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-secondary/80",
                            "text-foreground caret-primary outline-none",
                            "transition-all duration-150",
                            digit
                                ? "border-primary bg-primary/10 shadow-sm shadow-primary/20"
                                : "border-border focus:border-primary"
                        )}
                    />
                ))}
            </div>

            {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <Button
                onClick={handleVerifyAndRegister}
                disabled={isLoading || otp.join("").length !== 6}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 font-semibold"
            >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
                Verify & Create Account
            </Button>

            <div className="flex items-center justify-between text-sm">
                <button
                    onClick={() => { setOtpStage("form"); setError("") }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                >
                    ← Change details
                </button>
                <button
                    onClick={handleResendOtp}
                    disabled={otpCountdown > 0 || isLoading}
                    className={cn(
                        "flex items-center gap-1.5 transition-colors",
                        otpCountdown > 0 ? "text-muted-foreground cursor-not-allowed" : "text-primary hover:text-primary/80"
                    )}
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : "Resend OTP"}
                </button>
            </div>
        </div>
    )

    const renderFormStage = () => (
        <div className="flex flex-col gap-5 animate-in fade-in-50">
            {/* ROLE SWITCHER */}
            <div className="flex bg-secondary/60 rounded-xl p-1 border border-border/50">
                {(["citizen", "officer"] as const).map((r) => (
                    <button
                        key={r}
                        onClick={() => setRole(r)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all",
                            role === r
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {r === "citizen" ? <User className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                        {r === "citizen" ? "Citizen" : "Officer"}
                    </button>
                ))}
            </div>

            {/* FIELDS */}
            <div className="flex flex-col gap-4">
                {/* Full Name */}
                <div className="flex flex-col gap-1.5">
                    <Label className="text-foreground text-sm">Full Name</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Abhay Kumar"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            className="pl-10 bg-secondary/70 h-11"
                        />
                    </div>
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                    <Label className="text-foreground text-sm">Email Address</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="pl-10 bg-secondary/70 h-11"
                        />
                    </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                    <Label className="text-foreground text-sm">Password</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Min. 8 characters"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="pl-10 pr-10 bg-secondary/70 h-11"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1.5">
                    <Label className="text-foreground text-sm">Confirm Password</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Re-enter your password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className={cn(
                                "pl-10 pr-10 bg-secondary/70 h-11",
                                confirmPassword && confirmPassword !== password && "border-destructive focus-visible:ring-destructive",
                                confirmPassword && confirmPassword === password && "border-green-500 focus-visible:ring-green-500",
                            )}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        {confirmPassword && confirmPassword !== password && (
                            <p className="text-destructive text-xs mt-1 ml-1">Passwords do not match</p>
                        )}
                        {confirmPassword && confirmPassword === password && (
                            <p className="text-green-500 text-xs mt-1 ml-1 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Passwords match
                            </p>
                        )}
                    </div>
                </div>

                {/* PIN Code (citizen) */}
                {role === "citizen" && (
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-foreground text-sm">PIN Code (your ward)</Label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="6-digit PIN code"
                                value={pincode}
                                onChange={e => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                className="pl-10 bg-secondary/70 h-11"
                            />
                        </div>
                        {pincodeStatus === "loading" && <p className="text-muted-foreground text-xs ml-1">Looking up PIN code…</p>}
                        {pincodeStatus === "valid" && pincodeInfo && (
                            <p className="text-green-500 text-xs ml-1 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> {formatPincodeArea(pincodeInfo)}
                            </p>
                        )}
                        {pincodeStatus === "invalid" && <p className="text-destructive text-xs ml-1">Invalid PIN code</p>}
                    </div>
                )}

                {/* PIN Code + Department (officer) */}
                {role === "officer" && (
                    <>
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-foreground text-sm">Jurisdiction PIN Code</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="6-digit PIN code"
                                    value={pincode}
                                    onChange={e => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    className="pl-10 bg-secondary/70 h-11"
                                />
                            </div>
                            {pincodeStatus === "valid" && pincodeInfo && (
                                <p className="text-green-500 text-xs ml-1 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> {formatPincodeArea(pincodeInfo)}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-foreground text-sm">Department</Label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                                <select
                                    value={department}
                                    onChange={e => setDepartment(e.target.value)}
                                    className="w-full pl-10 pr-4 h-11 rounded-xl border border-input bg-secondary/70 text-foreground text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none"
                                >
                                    <option value="" disabled>Select your department</option>
                                    {DEPARTMENTS.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <Button
                onClick={handleSendOtp}
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 font-semibold mt-1"
            >
                {isLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending OTP…</>
                    : <><ArrowRight className="w-4 h-4 mr-2" />Continue — Verify Email</>
                }
            </Button>
        </div>
    )

    // ── MAIN RENDER ──────────────────────────────────────────────
    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background py-10">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/2 -left-1/2 h-full w-full animate-[spin_20s_linear_infinite] rounded-full bg-primary/5" />
                <div className="absolute -right-1/2 -bottom-1/2 h-full w-full animate-[spin_25s_linear_infinite_reverse] rounded-full bg-accent/5" />
                <div className="absolute top-1/4 left-1/4 h-96 w-96 animate-pulse rounded-full bg-primary/3" />
            </div>

            {/* Grid pattern overlay */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: "linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)",
                    backgroundSize: "60px 60px",
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
                            Create an Account
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Join the Smart Civic Monitoring System
                        </p>
                    </div>
                </div>

                {/* Glass card */}
                <div className="rounded-2xl border border-border/50 bg-card/80 p-6 md:p-8 shadow-xl backdrop-blur-xl">
                    <button
                        onClick={onBackToLogin}
                        className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to login
                    </button>

                    {otpStage === "otp" ? renderOtpStage() : renderFormStage()}
                </div>

                <p className="mt-6 text-center text-xs text-muted-foreground">
                    Secured by National Informatics Centre (NIC)
                </p>
            </div>
        </div>
    )
}
