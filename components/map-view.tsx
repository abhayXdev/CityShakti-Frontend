"use client"

import { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { useApp } from "@/lib/app-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin } from "lucide-react"
import { Complaint } from "@/lib/data"

export function MapView() {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<maplibregl.Map | null>(null)
    const { user, complaints, wardComplaints } = useApp()
    const isCitizen = user?.role === "citizen"
    const sourceData = isCitizen && wardComplaints.length > 0 ? wardComplaints : complaints

    useEffect(() => {
        if (map.current) return // initialize map only once
        if (!mapContainer.current) return

        const olaApiKey = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY
        if (!olaApiKey) {
            console.error("Ola Maps API Key is missing in environment variables.")
            return
        }

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: `https://api.olamaps.io/routing/v1/mapStyles/olamaps-standard/style.json?api_key=${olaApiKey}`,
            center: [77.2090, 28.6139], // Default to Delhi
            zoom: 12,
            attributionControl: false,
            transformRequest: (url, resourceType) => {
                if (url.includes("api.olamaps.io")) {
                    const separator = url.includes("?") ? "&" : "?"
                    return {
                        url: `${url}${separator}api_key=${olaApiKey}`,
                    }
                }
                return { url }
            }
        })

        // Wait until map loads before adding markers
        map.current.on('load', () => {
            const bounds = new maplibregl.LngLatBounds()
            let hasValidCoords = false

            sourceData.forEach((complaint: Complaint) => {
                if (complaint.location?.lat && complaint.location?.lng) {
                    hasValidCoords = true
                    const lngLat: [number, number] = [complaint.location.lng, complaint.location.lat]
                    bounds.extend(lngLat)

                    // Create a custom HTML marker
                    const el = document.createElement('div');
                    el.className = 'marker';
                    const isResolved = complaint.status === 'resolved' || complaint.status === 'closed';
                    const bgColor = isResolved ? 'bg-success' : 'bg-destructive';
                    el.innerHTML = `<div class="w-4 h-4 rounded-full border-2 border-white shadow-md ${bgColor}"></div>`

                    const popupContent = `
            <div class="p-2 min-w-[200px] font-sans">
              <h4 class="font-bold text-sm mb-1">${complaint.title}</h4>
              <div class="flex items-center gap-2 mb-2">
                <span class="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${isResolved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${complaint.status}</span>
                <span class="text-[10px] text-slate-500 uppercase tracking-wider">${complaint.category}</span>
              </div>
              <p class="text-xs text-slate-600 line-clamp-2">${complaint.description}</p>
            </div>
          `

                    new maplibregl.Marker(el)
                        .setLngLat(lngLat)
                        .setPopup(new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(popupContent))
                        .addTo(map.current!)
                }
            })

            if (hasValidCoords && map.current) {
                map.current.fitBounds(bounds, { padding: 50, maxZoom: 16 })
            }
        })

        return () => {
            if (map.current) {
                map.current.remove()
                map.current = null
            }
        }
    }, [sourceData])

    return (
        <div className="flex flex-col gap-6 h-full pb-10">
            <Card className="h-[calc(100vh-140px)] min-h-[500px] flex flex-col shadow-sm border-0 bg-card overflow-hidden">
                <CardHeader className="pb-3 border-b flex flex-row items-center justify-between z-10 bg-card">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <MapPin className="w-5 h-5 text-primary" />
                            Interactive Civic Map
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Viewing exact locations of complaints for {user?.ward ? `Ward ${user.ward}` : "all jurisdictions"}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="outline" className="text-destructive gap-1.5 border-destructive/20 bg-destructive/5"><div className="w-2 h-2 rounded-full bg-destructive"></div> Active</Badge>
                        <Badge variant="outline" className="text-success gap-1.5 border-success/20 bg-success/5"><div className="w-2 h-2 rounded-full bg-success"></div> Resolved</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 relative">
                    <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
                </CardContent>
            </Card>
        </div>
    )
}
