"use client"

import { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { useApp } from "@/lib/app-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin } from "lucide-react"
import { Complaint } from "@/lib/data"

const RANGOLI_PATTERN = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ff9933' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`

export function MapView() {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<maplibregl.Map | null>(null)
    const { user, complaints, wardComplaints, setActiveView, setSelectedCommunityComplaintId } = useApp()
    const isCitizen = user?.role === "citizen"

    // STRICT FILTERING: Citizens only see their ward's community complaints. 
    // Others (Sudo/Officer) see the general complaints list.
    const sourceData = isCitizen ? wardComplaints : complaints

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
            style: `https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json`,
            center: [77.2090, 28.6139], // Default to Delhi
            zoom: 12,
            attributionControl: false,
            transformRequest: (url, resourceType) => {
                if (url.includes("api.olamaps.io")) {
                    // Only append if api_key is not already in the URL
                    if (!url.includes("api_key=")) {
                        const separator = url.includes("?") ? "&" : "?"
                        return {
                            url: `${url}${separator}api_key=${olaApiKey}`,
                        }
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
            <div class="p-2 min-w-[200px] font-sans text-foreground">
              <h4 class="font-bold text-sm mb-1">${complaint.title}</h4>
              <div class="flex items-center gap-2 mb-2">
                <span class="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${isResolved ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}">${complaint.status}</span>
                <span class="text-[10px] text-muted-foreground uppercase tracking-wider">${complaint.category}</span>
              </div>
              <p class="text-xs text-muted-foreground line-clamp-2 mb-3">${complaint.description}</p>
              ${isCitizen ? `
                <button 
                  class="view-community-btn w-full py-1.5 px-3 bg-primary text-primary-foreground text-[10px] font-bold rounded-md hover:opacity-90 transition-opacity"
                  data-complaint-id="${complaint.id}"
                >
                  Support in Community
                </button>
              ` : ''}
            </div>
          `

                    new maplibregl.Marker({ element: el })
                        .setLngLat(lngLat)
                        .setPopup(new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(popupContent))
                        .addTo(map.current!)
                }
            })

            // Delegate click event for the dynamically generated "Support in Community" buttons
            const handlePopupClick = (e: MouseEvent) => {
                const target = e.target as HTMLElement
                if (target.classList.contains('view-community-btn')) {
                    const complaintId = target.getAttribute('data-complaint-id')
                    if (complaintId) {
                        setSelectedCommunityComplaintId(complaintId)
                        setActiveView('community')
                    }
                }
            }

            const container = mapContainer.current
            container?.addEventListener('click', handlePopupClick)

            // Clean up event listener when map loads again or changes
            map.current?.on('remove', () => {
                container?.removeEventListener('click', handlePopupClick)
            })

            if (hasValidCoords && map.current) {
                // Fit to initial data
                map.current.fitBounds(bounds, { padding: 50, maxZoom: 16 })

                // Restriction Logic for Citizens/Officers
                if (user?.role !== 'sudo') {
                    // Calculate Elastic Bounding Box with 50% padding (extra generous to avoid "stuck" feeling)
                    const sw = bounds.getSouthWest()
                    const ne = bounds.getNorthEast()

                    const latDiff = Math.abs(ne.lat - sw.lat) || 0.02
                    const lngDiff = Math.abs(ne.lng - sw.lng) || 0.02

                    const elasticBounds = new maplibregl.LngLatBounds(
                        [sw.lng - lngDiff * 0.5, sw.lat - latDiff * 0.5],
                        [ne.lng + lngDiff * 0.5, ne.lat + latDiff * 0.5]
                    )

                    map.current.setMaxBounds(elasticBounds)
                    map.current.setMinZoom(8) // Allow zooming out a bit more
                }
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
            {/* Royal Indian theme wrapper - does NOT clip the map canvas */}
            <div className="h-[calc(100vh-140px)] min-h-[500px] flex flex-col shadow-2xl relative rounded-[2.5rem] border border-stone-200/60" style={{ background: 'rgba(255,255,255,0.7)' }}>
                {/* Rangoli pattern - purely decorative */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none rounded-[2.5rem]" style={{ backgroundImage: RANGOLI_PATTERN }} />

                {/* Header */}
                <div className="flex-none pb-4 pt-6 px-8 border-b border-stone-100 flex flex-row items-center justify-between z-10" style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(8px)', borderRadius: '2.5rem 2.5rem 0 0' }}>
                    <div>
                        <h2 className="flex items-center gap-3 text-2xl font-black text-stone-900 uppercase tracking-tight">
                            <div className="p-2 rounded-xl bg-[#2B6CEE]/10 border border-[#2B6CEE]/20">
                                <MapPin className="w-6 h-6 text-[#2B6CEE]" />
                            </div>
                            Interactive Civic Map
                        </h2>
                        <p className="mt-1.5 text-stone-500 font-medium ml-11 text-sm">
                            Viewing exact locations of complaints for{" "}
                            <span className="text-[#2B6CEE] font-bold">
                                {user?.ward ? `Ward ${user.ward}` : "all jurisdictions"}
                            </span>
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Badge variant="outline" className="text-[#FF9933] gap-2 border-[#FF9933]/20 bg-[#FF9933]/5 px-3 py-1.5 font-bold uppercase tracking-widest text-[10px] rounded-full">
                            <div className="w-2 h-2 rounded-full bg-[#FF9933] animate-pulse" /> Active
                        </Badge>
                        <Badge variant="outline" className="text-success gap-2 border-success/20 bg-success/5 px-3 py-1.5 font-bold uppercase tracking-widest text-[10px] rounded-full">
                            <div className="w-2 h-2 rounded-full bg-success" /> Resolved
                        </Badge>
                    </div>
                </div>

                {/* Map container - flex-1 so it fills remaining height, relative for the absolute child */}
                <div className="flex-1 relative min-h-0">
                    <div ref={mapContainer} className="absolute inset-0 w-full h-full" style={{ borderRadius: '0 0 2.5rem 2.5rem' }} />
                </div>
            </div>
        </div>
    )
}
