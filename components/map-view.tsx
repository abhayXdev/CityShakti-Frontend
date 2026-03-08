"use client"

import { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { useApp } from "@/lib/app-context"
import { Badge } from "@/components/ui/badge"
import { MapPin } from "lucide-react"
import { Complaint } from "@/lib/data"

const RANGOLI_PATTERN = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ff9933' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`

export function MapView() {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<maplibregl.Map | null>(null)
    const markersRef = useRef<maplibregl.Marker[]>([])
    const mapLoadedRef = useRef(false)

    const { user, complaints, wardComplaints, setActiveView, setSelectedCommunityComplaintId } = useApp()
    const isCitizen = user?.role === "citizen"
    const sourceData = isCitizen ? wardComplaints : complaints

    // ─── Effect 1: Initialize the map ONCE and never destroy it on re-render ───
    useEffect(() => {
        if (map.current) return  // Prevent double-init
        if (!mapContainer.current) return

        const olaApiKey = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY
        if (!olaApiKey) {
            console.error("Ola Maps API Key is missing in environment variables.")
            return
        }

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: `https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json?api_key=${olaApiKey}`,
            center: [77.2090, 28.6139],
            zoom: 12,
            attributionControl: false,
            transformRequest: (url) => {
                if (url.includes("api.olamaps.io") && !url.includes("api_key=")) {
                    const sep = url.includes("?") ? "&" : "?"
                    return { url: `${url}${sep}api_key=${olaApiKey}` }
                }
                return { url }
            }
        })

        // Ensure map resizes correctly if container dimensions change
        const resizeObserver = new ResizeObserver(() => {
            map.current?.resize()
        })
        resizeObserver.observe(mapContainer.current)

        map.current.on("load", () => {
            mapLoadedRef.current = true
            // Trigger the marker update now that the map is ready
            map.current?.fire("data-ready")
        })

        // Only remove map when the component truly unmounts
        return () => {
            resizeObserver.disconnect()
            mapLoadedRef.current = false
            map.current?.remove()
            map.current = null
        }
    }, []) // Empty deps = run ONCE

    // ─── Effect 2: Update markers when sourceData changes, WITHOUT touching the map ───
    useEffect(() => {
        const placeMarkers = () => {
            if (!map.current || !mapLoadedRef.current) return

            // Clear old markers
            markersRef.current.forEach(m => m.remove())
            markersRef.current = []

            const bounds = new maplibregl.LngLatBounds()
            let hasValidCoords = false

            sourceData.forEach((complaint: Complaint) => {
                if (!complaint.location?.lat || !complaint.location?.lng) return

                hasValidCoords = true
                const lngLat: [number, number] = [complaint.location.lng, complaint.location.lat]
                bounds.extend(lngLat)

                const isResolved = complaint.status === "resolved" || complaint.status === "closed"

                // Coloured dot marker
                const el = document.createElement("div")
                el.className = "marker"
                el.innerHTML = `<div class="w-4 h-4 rounded-full border-2 border-white shadow-md ${isResolved ? "bg-success" : "bg-destructive"}"></div>`

                const popupContent = `
                    <div class="p-2 min-w-[200px] font-sans text-foreground">
                      <h4 class="font-bold text-sm mb-1">${complaint.title}</h4>
                      <div class="flex items-center gap-2 mb-2">
                        <span class="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${isResolved ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}">${complaint.status}</span>
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
                      ` : ""}
                    </div>`

                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat(lngLat)
                    .setPopup(new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(popupContent))
                    .addTo(map.current!)

                markersRef.current.push(marker)
            })

            // Fit bounds to complaints
            if (hasValidCoords && map.current) {
                // Clear any existing maxBounds before panning
                map.current.setMaxBounds(null)

                // Use animate: false to prevent maxBounds from clashing with the pan animation
                map.current.fitBounds(bounds, { padding: 50, maxZoom: 16, animate: false })

                // Lock pan to jurisdiction for non-sudo users
                if (user?.role !== "sudo") {
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

        // Event delegation for "Support in Community" popup button
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (target.classList.contains("view-community-btn")) {
                const complaintId = target.getAttribute("data-complaint-id")
                if (complaintId) {
                    setSelectedCommunityComplaintId(complaintId)
                    setActiveView("community")
                }
            }
        }
        mapContainer.current?.removeEventListener("click", handleClick)
        mapContainer.current?.addEventListener("click", handleClick)

        // If map is already loaded, place markers immediately;
        // otherwise wait for the "data-ready" event fired by the load handler
        if (mapLoadedRef.current) {
            placeMarkers()
        } else {
            // Unbind previous listener if any to avoid stacking
            map.current?.off("data-ready", placeMarkers)
            map.current?.once("data-ready", placeMarkers)
        }

        return () => {
            mapContainer.current?.removeEventListener("click", handleClick)
            map.current?.off("data-ready", placeMarkers)
        }
    }, [sourceData, user?.role, isCitizen, setActiveView, setSelectedCommunityComplaintId])

    return (
        <div className="flex flex-col gap-6 h-full pb-10">
            {/* Theme wrapper — no overflow-hidden so the map canvas is never clipped */}
            <div
                className="h-[calc(100vh-140px)] min-h-[500px] flex flex-col shadow-2xl relative rounded-[2.5rem] border border-stone-200/60"
                style={{ background: "rgba(255,255,255,0.7)" }}
            >
                {/* Rangoli decorative pattern */}
                <div
                    className="absolute inset-0 opacity-[0.03] pointer-events-none rounded-[2.5rem]"
                    style={{ backgroundImage: RANGOLI_PATTERN }}
                />

                {/* Header */}
                <div
                    className="flex-none pb-4 pt-6 px-8 border-b border-stone-100 flex flex-row items-center justify-between z-10"
                    style={{ background: "rgba(255,255,255,0.4)", backdropFilter: "blur(8px)", borderRadius: "2.5rem 2.5rem 0 0" }}
                >
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

                {/* Map area — flex-1 + min-h-0 ensures it takes all remaining height */}
                <div className="flex-1 relative min-h-0">
                    <div
                        ref={mapContainer}
                        className="absolute inset-0 w-full h-full"
                        style={{ borderRadius: "0 0 2.5rem 2.5rem" }}
                    />
                </div>
            </div>
        </div>
    )
}
