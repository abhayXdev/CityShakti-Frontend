"use client"

import { useState, useEffect, useRef } from "react"
import { useApp } from "@/lib/app-context"
import {
    Shield, User, Lock, ArrowRight, AlertCircle, Building2, Mail,
    MapPin, Loader2, CheckCircle, RefreshCw, Eye, EyeOff, KeyRound
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

    // ── OTP STAGE ──────────────────────────────────────────────────
    if (otpStage === "otp") {
        return (
            <div className="flex flex-col gap-6 animate-in fade-in-50 slide-in-from-right-4">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-600/10 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-8 h-8 text-blue-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Verify Your Email</h2>
                    <p className="text-slate-400 text-sm mt-1">
                        We sent a 6-digit code to{" "}
                        <span className="text-blue-400 font-semibold">{email}</span>
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
                                "w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-slate-800/80",
                                "text-white caret-blue-400 outline-none",
                                "transition-all duration-150",
                                digit
                                    ? "border-blue-500 bg-blue-500/10 shadow-sm shadow-blue-500/20"
                                    : "border-slate-600 focus:border-blue-500"
                            )}
                        />
                    ))}
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <Button
                    onClick={handleVerifyAndRegister}
                    disabled={isLoading || otp.join("").length !== 6}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 font-semibold"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
                    Verify & Create Account
                </Button>

                <div className="flex items-center justify-between text-sm">
                    <button
                        onClick={() => { setOtpStage("form"); setError("") }}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        ← Change details
                    </button>
                    <button
                        onClick={handleResendOtp}
                        disabled={otpCountdown > 0 || isLoading}
                        className={cn(
                            "flex items-center gap-1.5 transition-colors",
                            otpCountdown > 0 ? "text-slate-500 cursor-not-allowed" : "text-blue-400 hover:text-blue-300"
                        )}
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : "Resend OTP"}
                    </button>
                </div>
            </div>
        )
    }

    // ── REGISTRATION FORM ──────────────────────────────────────────
    return (
        <div className="flex flex-col gap-5 animate-in fade-in-50">

            {/* ROLE SWITCHER */}
            <div className="flex bg-slate-800/60 rounded-xl p-1 border border-slate-700/50">
                {(["citizen", "officer"] as const).map((r) => (
                    <button
                        key={r}
                        onClick={() => setRole(r)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all",
                            role === r
                                ? "bg-blue-600 text-white shadow-md"
                                : "text-slate-400 hover:text-slate-200"
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
                    <Label className="text-slate-300 text-sm">Full Name</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                            placeholder="Abhay Kumar"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            className="pl-10 bg-slate-800/70 border-slate-600 text-white placeholder:text-slate-500 rounded-xl focus:border-blue-500 h-11"
                        />
                    </div>
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                    <Label className="text-slate-300 text-sm">Email Address</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="pl-10 bg-slate-800/70 border-slate-600 text-white placeholder:text-slate-500 rounded-xl focus:border-blue-500 h-11"
                        />
                    </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                    <Label className="text-slate-300 text-sm">Password</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Min. 8 characters"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="pl-10 pr-10 bg-slate-800/70 border-slate-600 text-white placeholder:text-slate-500 rounded-xl focus:border-blue-500 h-11"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1.5">
                    <Label className="text-slate-300 text-sm">Confirm Password</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Re-enter your password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className={cn(
                                "pl-10 pr-10 bg-slate-800/70 border-slate-600 text-white placeholder:text-slate-500 rounded-xl focus:border-blue-500 h-11",
                                confirmPassword && confirmPassword !== password && "border-red-500 focus:border-red-500",
                                confirmPassword && confirmPassword === password && "border-green-500 focus:border-green-500",
                            )}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        {confirmPassword && confirmPassword !== password && (
                            <p className="text-red-400 text-xs mt-1 ml-1">Passwords do not match</p>
                        )}
                        {confirmPassword && confirmPassword === password && (
                            <p className="text-green-400 text-xs mt-1 ml-1 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Passwords match
                            </p>
                        )}
                    </div>
                </div>

                {/* PIN Code (citizen) */}
                {role === "citizen" && (
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-slate-300 text-sm">PIN Code (your ward)</Label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                placeholder="6-digit PIN code"
                                value={pincode}
                                onChange={e => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                className="pl-10 bg-slate-800/70 border-slate-600 text-white placeholder:text-slate-500 rounded-xl focus:border-blue-500 h-11"
                            />
                        </div>
                        {pincodeStatus === "loading" && <p className="text-slate-400 text-xs ml-1">Looking up PIN code…</p>}
                        {pincodeStatus === "valid" && pincodeInfo && (
                            <p className="text-green-400 text-xs ml-1 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> {formatPincodeArea(pincodeInfo)}
                            </p>
                        )}
                        {pincodeStatus === "invalid" && <p className="text-red-400 text-xs ml-1">Invalid PIN code</p>}
                    </div>
                )}

                {/* PIN Code + Department (officer) */}
                {role === "officer" && (
                    <>
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-slate-300 text-sm">Jurisdiction PIN Code</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <Input
                                    placeholder="6-digit PIN code"
                                    value={pincode}
                                    onChange={e => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    className="pl-10 bg-slate-800/70 border-slate-600 text-white placeholder:text-slate-500 rounded-xl focus:border-blue-500 h-11"
                                />
                            </div>
                            {pincodeStatus === "valid" && pincodeInfo && (
                                <p className="text-green-400 text-xs ml-1 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> {formatPincodeArea(pincodeInfo)}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-slate-300 text-sm">Department</Label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
                                <select
                                    value={department}
                                    onChange={e => setDepartment(e.target.value)}
                                    className="w-full pl-10 pr-4 h-11 rounded-xl border border-slate-600 bg-slate-800/70 text-white text-sm focus:border-blue-500 focus:outline-none appearance-none"
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

            {/* ERROR */}
            {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* SUBMIT */}
            <Button
                onClick={handleSendOtp}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 font-semibold mt-1"
            >
                {isLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending OTP…</>
                    : <><ArrowRight className="w-4 h-4 mr-2" />Continue — Verify Email</>
                }
            </Button>

            <p className="text-center text-sm text-slate-500">
                Already have an account?{" "}
                <button onClick={onBackToLogin} className="text-blue-400 hover:text-blue-300 font-semibold">
                    Sign In
                </button>
            </p>
        </div>
    )
}
