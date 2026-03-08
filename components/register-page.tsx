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
import { motion, AnimatePresence } from "motion/react"
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
            <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-stone-50 py-10">
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
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10 flex flex-col items-center justify-center gap-6 py-12 text-center rounded-3xl border border-border/50 bg-white/80 p-12 shadow-2xl backdrop-blur-xl max-w-md mx-4"
                >
                    <div className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center shadow-inner">
                        <CheckCircle className="w-12 h-12 text-green-500" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-extrabold text-stone-900 mb-3 tracking-tight">Success!</h2>
                        <p className="text-stone-600 leading-relaxed">{successMsg}</p>
                    </div>
                    <Button
                        onClick={onBackToLogin}
                        variant="gradient-success"
                        className="h-12 w-full text-base font-bold shadow-lg"
                    >
                        Proceed to Login
                    </Button>
                </motion.div>
            </div>
        )
    }

    const renderOtpStage = () => (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-6"
        >
            <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4 shadow-inner border border-stone-200">
                    <Mail className="w-8 h-8 text-[#000080]" />
                </div>
                <h2 className="text-xl font-bold text-stone-900">Verify Your Email</h2>
                <p className="text-stone-500 text-sm mt-1">
                    We sent a 6-digit code to{" "}
                    <span className="text-[#000080] font-semibold">{email}</span>
                </p>
            </div>

            {/* 6-BOX OTP INPUT */}
            <div
                className="flex justify-center gap-2.5"
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
                            "w-11 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all duration-200",
                            digit
                                ? "border-[#FF9933] bg-[#FF9933]/5 text-[#FF9933] shadow-md shadow-[#FF9933]/10"
                                : "border-stone-200 bg-stone-50 focus:border-[#FF9933] text-stone-900"
                        )}
                    />
                ))}
            </div>

            <AnimatePresence mode="wait">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3"
                    >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <Button
                onClick={handleVerifyAndRegister}
                disabled={isLoading || otp.join("").length !== 6}
                variant="gradient-success"
                className="w-full rounded-xl h-12 text-base font-bold shadow-lg"
            >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <KeyRound className="w-5 h-5 mr-2" />}
                Verify & Create Account
            </Button>

            <div className="flex items-center justify-between text-sm pt-2">
                <button
                    onClick={() => { setOtpStage("form"); setError("") }}
                    className="text-stone-500 hover:text-stone-900 font-medium transition-colors"
                >
                    ← Change details
                </button>
                <button
                    onClick={handleResendOtp}
                    disabled={otpCountdown > 0 || isLoading}
                    className={cn(
                        "flex items-center gap-1.5 font-semibold transition-colors",
                        otpCountdown > 0 ? "text-stone-400 cursor-not-allowed" : "text-[#FF9933] hover:text-[#FFB366]"
                    )}
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : "Resend OTP"}
                </button>
            </div>
        </motion.div>
    )

    const renderFormStage = () => (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col gap-5"
        >
            {/* ROLE SWITCHER */}
            <div className="flex bg-stone-100 rounded-xl p-1 relative overflow-hidden border border-stone-200">
                {/* Animated Tab Indicator */}
                <motion.div
                    layoutId="regRoleTab"
                    className={cn(
                        "absolute inset-y-1 rounded-lg transition-colors duration-300",
                        role === "citizen" ? "bg-[#FF9933]" : "bg-[#138808]"
                    )}
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    style={{
                        width: "calc(50% - 4px)",
                        left: role === "citizen" ? "2px" : "calc(50% + 2px)",
                    }}
                />

                {(["citizen", "officer"] as const).map((r) => (
                    <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={cn(
                            "relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                            role === r ? "text-white" : "text-stone-500 hover:text-stone-900"
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
                            className="pl-10 bg-white border-stone-200 focus:border-[#FF9933] focus:ring-[#FF9933]/10 h-11"
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
                            className="pl-10 bg-white border-stone-200 focus:border-[#FF9933] focus:ring-[#FF9933]/10 h-11"
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
                            className="pl-10 pr-10 bg-white border-stone-200 focus:border-[#FF9933] focus:ring-[#FF9933]/10 h-11"
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
                                "pl-10 pr-10 bg-white border-stone-200 h-11 transition-all focus:border-[#FF9933] focus:ring-[#FF9933]/10",
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
                                className="pl-10 bg-white border-stone-200 focus:border-[#FF9933] focus:ring-[#FF9933]/10 h-11"
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
                                    className="pl-10 bg-stone-50/50 h-11"
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
                                    className="w-full pl-10 pr-4 h-11 rounded-xl border border-input bg-stone-50/50 text-foreground text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none"
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

            <AnimatePresence mode="wait">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3"
                    >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <Button
                onClick={handleSendOtp}
                disabled={isLoading}
                variant={role === "citizen" ? "gradient" : "gradient-success"}
                className="w-full rounded-xl h-12 text-base font-bold mt-2 shadow-lg"
            >
                {isLoading
                    ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Sending OTP…</>
                    : <><ArrowRight className="w-5 h-5 mr-2" />Continue — Verify Email</>
                }
            </Button>
        </motion.div>
    )

    // ── MAIN RENDER ──────────────────────────────────────────────
    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-stone-50 py-10">
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
                    backgroundImage: "linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />

            <div className="relative z-10 mx-4 w-full max-w-lg">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 flex flex-col items-center gap-3 text-center"
                >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF9933] to-[#FFB366] text-white shadow-xl">
                        <Shield className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
                            Create an Account
                        </h1>
                        <p className="mt-1 text-stone-500 font-medium">
                            Join the Smart Civic Monitoring System
                        </p>
                    </div>
                </motion.div>

                {/* Glass card */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-3xl border border-border/50 bg-white/80 p-6 md:p-8 shadow-2xl backdrop-blur-xl"
                >
                    <button
                        onClick={onBackToLogin}
                        className="flex items-center text-sm font-semibold text-stone-500 hover:text-stone-900 mb-8 transition-colors"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to login
                    </button>

                    <AnimatePresence mode="wait">
                        {otpStage === "otp" ? (
                            <div key="otp">{renderOtpStage()}</div>
                        ) : (
                            <div key="form">{renderFormStage()}</div>
                        )}
                    </AnimatePresence>
                </motion.div>

                <p className="mt-8 text-center text-xs font-semibold text-stone-400 tracking-wider">
                    SECURED BY NATIONAL INFORMATICS CENTRE (NIC)
                </p>
            </div>
        </div>
    )
}
