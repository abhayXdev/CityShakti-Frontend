"use client"

import { useState, useEffect } from "react"
import { useApp } from "@/lib/app-context"
import { Shield, User, Lock, ArrowRight, AlertCircle, Building2, Mail, MapPin, Loader2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { registerApi } from "@/lib/api"
import { fetchPincodeInfo, formatPincodeArea, type PincodeInfo, type PincodeStatus } from "@/lib/pincode"

interface RegisterPageProps {
    onBackToLogin: () => void
}

export function RegisterPage({ onBackToLogin }: RegisterPageProps) {
    const [role, setRole] = useState<"citizen" | "admin">("citizen")
    const [fullName, setFullName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [pincode, setPincode] = useState("")
    const [pincodeInfo, setPincodeInfo] = useState<PincodeInfo | null>(null)
    const [pincodeStatus, setPincodeStatus] = useState<PincodeStatus>("idle")
    const [department, setDepartment] = useState("")
    const [error, setError] = useState("")
    const [successMsg, setSuccessMsg] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    // Auto-lookup pincode when 6 digits entered
    useEffect(() => {
        if (pincode.length !== 6) {
            setPincodeInfo(null)
            setPincodeStatus(pincode.length === 0 ? "idle" : "idle")
            return
        }
        setPincodeStatus("loading")
        fetchPincodeInfo(pincode).then((info) => {
            if (info) {
                setPincodeInfo(info)
                setPincodeStatus("valid")
            } else {
                setPincodeInfo(null)
                setPincodeStatus("invalid")
            }
        })
    }, [pincode])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccessMsg("")
        setIsLoading(true)

        if (role === "admin" && !department) {
            setError("Please select your assigned department.")
            setIsLoading(false)
            return
        }

        if (!pincode) {
            setError("PIN Code is required.")
            setIsLoading(false)
            return
        }

        if (pincodeStatus !== "valid") {
            setError("Please enter a valid 6-digit PIN code.")
            setIsLoading(false)
            return
        }

        try {
            await registerApi({
                full_name: fullName,
                email,
                password,
                ward: pincode || undefined,
                department: role === "admin" ? department || undefined : undefined,
                role: role
            })

            setSuccessMsg("Registration successful! You may now sign in.")
            setTimeout(() => {
                onBackToLogin()
            }, 2000)
        } catch (err: any) {
            setError(err.message || "Failed to register. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/2 -left-1/2 h-full w-full animate-[spin_20s_linear_infinite] rounded-full bg-primary/5" />
                <div className="absolute -right-1/2 -bottom-1/2 h-full w-full animate-[spin_25s_linear_infinite_reverse] rounded-full bg-accent/5" />
                <div className="absolute top-1/4 left-1/4 h-96 w-96 animate-pulse rounded-full bg-primary/3" />
            </div>

            {/* Grid pattern overlay */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)",
                    backgroundSize: "60px 60px",
                }}
            />

            <div className="relative z-10 mx-4 w-full max-w-md my-8">
                {/* Header badge */}
                <div className="mb-8 flex flex-col items-center gap-3 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                        <Shield className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
                            Citizen Registration
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Smart Civic Monitoring System
                        </p>
                    </div>
                </div>

                {/* Glass card */}
                <div className="rounded-2xl border border-border/50 bg-card/80 p-8 shadow-xl backdrop-blur-xl">
                    <div className="mb-6 flex gap-2 rounded-xl bg-secondary p-1">
                        <button
                            type="button"
                            onClick={() => { setRole("citizen"); setError("") }}
                            className={cn(
                                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                                role === "citizen"
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <User className="h-4 w-4" />
                            Citizen
                        </button>
                        <button
                            type="button"
                            onClick={() => { setRole("admin"); setError("") }}
                            className={cn(
                                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                                role === "admin"
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Building2 className="h-4 w-4" />
                            Department Admin
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="fullname" className="text-sm font-medium text-foreground">
                                Full Name
                            </Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="fullname"
                                    type="text"
                                    placeholder="John Doe"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="h-11 pl-10"
                                    required
                                    minLength={2}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="email" className="text-sm font-medium text-foreground">
                                Email Address
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="john@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-11 pl-10"
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
                                    placeholder="Create a strong password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-11 pl-10"
                                    required
                                    minLength={8}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="pincode" className="text-sm font-medium text-foreground">
                                PIN Code <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="pincode"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="6-digit PIN code e.g. 110001"
                                    value={pincode}
                                    maxLength={6}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "")
                                        setPincode(val)
                                        setPincodeInfo(null)
                                        setPincodeStatus("idle")
                                    }}
                                    className={cn(
                                        "h-11 pl-10 pr-10",
                                        pincodeStatus === "valid" && "border-green-500 focus-visible:ring-green-500/30",
                                        pincodeStatus === "invalid" && "border-destructive focus-visible:ring-destructive/30"
                                    )}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {pincodeStatus === "loading" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                    {pincodeStatus === "valid" && <CheckCircle className="h-4 w-4 text-green-500" />}
                                    {pincodeStatus === "invalid" && <AlertCircle className="h-4 w-4 text-destructive" />}
                                </div>
                            </div>
                            {pincodeStatus === "valid" && pincodeInfo && (
                                <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md px-3 py-1.5">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    {formatPincodeArea(pincodeInfo)}
                                </div>
                            )}
                            {pincodeStatus === "invalid" && (
                                <p className="text-xs text-destructive">Invalid PIN code. Please enter a valid 6-digit Indian PIN code.</p>
                            )}
                        </div>

                        {role === "admin" && (
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="department" className="text-sm font-medium text-foreground">
                                    Assigned Department <span className="text-destructive">*</span>
                                </Label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                                    <select
                                        id="department"
                                        value={department}
                                        onChange={(e) => setDepartment(e.target.value)}
                                        required
                                        className="h-11 w-full rounded-md border border-input bg-transparent pl-10 pr-3 text-sm text-foreground shadow-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-background"
                                    >
                                        <option value="" disabled>Select your department</option>
                                        <option value="Sanitation">Sanitation</option>
                                        <option value="Water Supply">Water Supply</option>
                                        <option value="Electricity">Electricity</option>
                                        <option value="Roads & Transport">Roads &amp; Transport</option>
                                        <option value="Public Health">Public Health</option>
                                        <option value="Parks & Recreation">Parks &amp; Recreation</option>
                                    </select>
                                    <svg className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        {successMsg && (
                            <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success font-medium">
                                {successMsg}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="h-11 w-full gap-2 text-sm font-semibold mt-2"
                            disabled={isLoading || !!successMsg}
                        >
                            {isLoading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                            ) : (
                                <>
                                    Create Account
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-muted-foreground">Already have an account? </span>
                        <button
                            onClick={onBackToLogin}
                            className="text-primary font-medium hover:underline focus:outline-none"
                            type="button"
                        >
                            Sign in instead
                        </button>
                    </div>
                </div>

                <p className="mt-6 text-center text-xs text-muted-foreground">
                    Secured by National Informatics Centre (NIC)
                </p>
            </div>
        </div>
    )
}
