"use client"

import { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { useApp } from "@/lib/app-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Info } from "lucide-react"
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

    const markersRef = useRef<maplibregl.Marker[]>([])
    const isInitializing = useRef(false)

    // Effect 1: Initialize the map instance ONCE
    useEffect(() => {
        if (map.current || isInitializing.current) return
        if (!mapContainer.current) return

        const olaApiKey = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY
        if (!olaApiKey) {
            console.error("Ola Maps API Key is missing")
            return
        }

        isInitializing.current = true

        const initTimeout = setTimeout(() => {
            if (!mapContainer.current || map.current) return

            map.current = new maplibregl.Map({
                container: mapContainer.current,
                style: `https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json?api_key=${olaApiKey}`,
                center: [77.2090, 28.6139],
                zoom: 12,
                attributionControl: false,
                transformRequest: (url) => {
                    if (url.includes("api.olamaps.io") && !url.includes("api_key=")) {
                        const separator = url.includes("?") ? "&" : "?"
                        return { url: `${url}${separator}api_key=${olaApiKey}` }
                    }
                    return { url }
                }
            })

            map.current.on('load', () => {
                // Initial marker update will be triggered by Effect 2
                // as sourceData changes or map becomes available
            })
        }, 100)

        return () => {
            clearTimeout(initTimeout)
            if (map.current) {
                map.current.remove()
                map.current = null
            }
            isInitializing.current = false
        }
    }, []) // Run only once

    // Effect 2: Update markers when sourceData changes
    useEffect(() => {
        const updateMarkers = () => {
            if (!map.current || !map.current.loaded()) return

            // Clear existing markers
            markersRef.current.forEach(m => m.remove())
            markersRef.current = []

            const bounds = new maplibregl.LngLatBounds()
            let hasValidCoords = false

            sourceData.forEach((complaint: Complaint) => {
                if (complaint.location?.lat && complaint.location?.lng) {
                    hasValidCoords = true
                    const lngLat: [number, number] = [complaint.location.lng, complaint.location.lat]
                    bounds.extend(lngLat)

                    const el = document.createElement('div');
                    el.className = 'marker';
                    const isResolved = complaint.status === 'resolved' || complaint.status === 'closed';
                    const bgColor = isResolved ? 'bg-success' : 'bg-destructive';
                    el.innerHTML = `<div class="w-4 h-4 rounded-full border-2 border-white shadow-md ${bgColor}"></div>`

                    const popupContent = `
                        <div class="p-3 min-w-[220px] font-sans text-stone-900 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-stone-200">
                          <div class="flex items-center gap-2 mb-2">
                             <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-stone-100 border border-stone-200">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-stone-500"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                             </div>
                             <h4 class="font-bold text-sm leading-tight text-stone-900">${complaint.title}</h4>
                          </div>
                          <div class="flex items-center gap-2 mb-3">
                            <span class="text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest font-black ${isResolved ? 'bg-success/10 text-success border border-success/20' : 'bg-[#FF9933]/10 text-[#FF9933] border border-[#FF9933]/20'}">${complaint.status}</span>
                            <span class="text-[9px] text-stone-400 uppercase tracking-widest font-bold">${complaint.category}</span>
                          </div>
                          <p class="text-xs text-stone-500 leading-relaxed line-clamp-2 mb-4">${complaint.description}</p>
                          ${isCitizen ? `
                            <button 
                              class="view-community-btn w-full py-2 px-3 bg-[#FF9933] hover:bg-[#FF9933]/90 text-white text-[10px] font-black rounded-lg shadow-md shadow-[#FF9933]/20 transition-all active:scale-[0.98] uppercase tracking-wider"
                              data-complaint-id="${complaint.id}"
                            >
                              SUPPORT IN COMMUNITY
                            </button>
                          ` : ''}
                        </div>
                    `

                    const marker = new maplibregl.Marker({ element: el })
                        .setLngLat(lngLat)
                        .setPopup(new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(popupContent))
                        .addTo(map.current!)

                    markersRef.current.push(marker)
                }
            })

            // Delegate click event (shared)
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

            if (mapContainer.current) {
                mapContainer.current.removeEventListener('click', handlePopupClick)
                mapContainer.current.addEventListener('click', handlePopupClick)
            }

            if (hasValidCoords && map.current) {
                map.current.fitBounds(bounds, { padding: 50, maxZoom: 16 })
                if (user?.role !== 'sudo') {
                    const sw = bounds.getSouthWest()
                    const ne = bounds.getNorthEast()
                    const latDiff = Math.abs(ne.lat - sw.lat) || 0.02
                    const lngDiff = Math.abs(ne.lng - sw.lng) || 0.02
                    const elasticBounds = new maplibregl.LngLatBounds(
                        [sw.lng - lngDiff * 0.5, sw.lat - latDiff * 0.5],
                        [ne.lng + lngDiff * 0.5, ne.lat + latDiff * 0.5]
                    )
                    map.current.setMaxBounds(elasticBounds)
                    map.current.setMinZoom(8)
                }
            }
        }

        if (map.current) {
            if (map.current.loaded()) {
                updateMarkers()
            } else {
                map.current.once('load', updateMarkers)
            }
        }
    }, [sourceData]) // Only re-run when sourceData changes

    return (
        <div className="flex flex-col gap-6 h-full pb-10">
            <Card className="h-[calc(100vh-140px)] min-h-[500px] flex flex-col shadow-2xl border-none bg-white/70 backdrop-blur-2xl overflow-hidden relative rounded-[2.5rem]">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: RANGOLI_PATTERN }} />
                <CardHeader className="pb-4 pt-6 px-8 border-b border-stone-100 flex flex-row items-center justify-between z-10 bg-white/40 backdrop-blur-md">
                    <div>
                        <CardTitle className="flex items-center gap-3 text-2xl font-black text-stone-900 uppercase tracking-tight">
                            <div className="p-2 rounded-xl bg-[#2B6CEE]/10 border border-[#2B6CEE]/20">
                                <MapPin className="w-6 h-6 text-[#2B6CEE]" />
                            </div>
                            Interactive Civic Map
                        </CardTitle>
                        <CardDescription className="mt-1.5 text-stone-500 font-medium ml-11">
                            Tracking jurisdictional issues for <span className="text-[#2B6CEE] font-bold">{user?.ward ? `Ward ${user.ward}` : "All Jurisdictions"}</span>
                        </CardDescription>
                    </div>
                    <div className="flex gap-3">
                        <Badge variant="outline" className="text-[#FF9933] gap-2 border-[#FF9933]/20 bg-[#FF9933]/5 px-3 py-1.5 font-bold uppercase tracking-widest text-[10px] rounded-full"><div className="w-2 h-2 rounded-full bg-[#FF9933] animate-pulse"></div> Active</Badge>
                        <Badge variant="outline" className="text-success gap-2 border-success/20 bg-success/5 px-3 py-1.5 font-bold uppercase tracking-widest text-[10px] rounded-full"><div className="w-2 h-2 rounded-full bg-success"></div> Resolved</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 relative min-h-[400px] z-10">
                    <div
                        ref={mapContainer}
                        className="w-full h-full rounded-b-[2.5rem] bg-stone-50"
                        style={{ position: 'relative' }}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
