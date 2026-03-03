"use client"

import { useEffect, useState } from "react"
import { Building2, Mail, Phone, MapPin, UserSquare2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useApp } from "@/lib/app-context"
import { getAdminDirectoryApi } from "@/lib/api"

interface AdminProfile {
    id: number
    full_name: string
    email: string
    department: string
    ward: string
    phone: string | null
}

export function ContactUsView() {
    const { user, token } = useApp()
    const [admins, setAdmins] = useState<AdminProfile[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadDirectory() {
            if (!token) return
            try {
                const data = await getAdminDirectoryApi(token)
                // Filter admins to only show those responsible for the user's ward,
                // or those responsible for "City-Wide" administration.
                const relevantAdmins = data.filter((admin: AdminProfile) => {
                    if (!user?.ward) return true // If user has no ward, show all

                    const adminWard = (admin.ward || "").toLowerCase().trim()
                    const userWard = (user.ward || "").toLowerCase().trim()

                    return adminWard === "city-wide" || adminWard === userWard
                })
                setAdmins(relevantAdmins)
            } catch (error) {
                console.error("Failed to load admin directory:", error)
            } finally {
                setLoading(false)
            }
        }

        loadDirectory()
    }, [token, user?.ward])

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Contact Us</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                    Directory of administrative officials assigned to {user?.ward ? `your region (${user.ward})` : "your region"}.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-48">
                    <span className="animate-pulse text-muted-foreground">Loading directory...</span>
                </div>
            ) : admins.length === 0 ? (
                <Card className="border-dashed border-2 bg-transparent shadow-none">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                        <UserSquare2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <p className="text-lg font-medium text-foreground">No officials found</p>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                            We couldn't locate any administrators specifically assigned to your region at this time.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {admins.map((admin) => (
                        <Card key={admin.id} className="overflow-hidden transition-all hover:shadow-md border-primary/10">
                            <CardHeader className="bg-primary/5 pb-4">
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <CardTitle className="text-lg">{admin.full_name}</CardTitle>
                                        <CardDescription className="flex items-center gap-1 mt-1 text-xs text-primary/80 font-medium">
                                            <Building2 className="h-3 w-3" />
                                            {admin.department}
                                        </CardDescription>
                                    </div>
                                    <Badge variant="outline" className="bg-background font-mono text-[10px] uppercase shadow-sm">
                                        {admin.ward}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-5 grid gap-3 text-sm">
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <div className="bg-muted p-2 rounded-lg">
                                        <Mail className="h-4 w-4 text-foreground/70" />
                                    </div>
                                    <a href={`mailto:${admin.email}`} className="hover:text-primary transition-colors hover:underline">
                                        {admin.email}
                                    </a>
                                </div>
                                {admin.phone && (
                                    <div className="flex items-center gap-3 text-muted-foreground">
                                        <div className="bg-muted p-2 rounded-lg">
                                            <Phone className="h-4 w-4 text-foreground/70" />
                                        </div>
                                        <a href={`tel:${admin.phone}`} className="hover:text-primary transition-colors">
                                            {admin.phone}
                                        </a>
                                    </div>
                                )}
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <div className="bg-muted p-2 rounded-lg">
                                        <MapPin className="h-4 w-4 text-foreground/70" />
                                    </div>
                                    <span>Assigned Region: {admin.ward}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
