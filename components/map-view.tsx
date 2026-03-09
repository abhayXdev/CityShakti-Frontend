"use client"

import { useEffect, useRef, useState } from "react"
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
    const [mapLoaded, setMapLoaded] = useState(false)
    const markersRef = useRef<maplibregl.Marker[]>([])
    const boundsInitializedRef = useRef(false)

    const { user, complaints, wardComplaints, setActiveView, setSelectedCommunityComplaintId } = useApp()
    const isCitizen = user?.role === "citizen"
    const sourceData = isCitizen ? wardComplaints : complaints

    console.log("DEBUG MAP_VIEW - User:", user?.name, "Role:", user?.role, "Ward:", user?.ward)
    console.log("DEBUG MAP_VIEW - sourceData length:", sourceData?.length, "complaints:", complaints?.length, "wardComplaints:", wardComplaints?.length)

    // ─── Effect 1: Initialize the map ONCE and never destroy it on re-render ───
    useEffect(() => {
        if (map.current) return  // Prevent double-init
        if (!mapContainer.current) return

        const olaApiKey = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY
        if (!olaApiKey) {
            console.error("Ola Maps API Key is missing in environment variables.")
            return
        }

        // Initialize with a slight delay to ensure DOM dimensions are settled
        const initTimeout = setTimeout(() => {
            if (!mapContainer.current) return

            map.current = new maplibregl.Map({
                container: mapContainer.current,
                style: `https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json`,
                center: [77.2090, 28.6139],
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

            map.current.on("load", () => {
                setMapLoaded(true)
            })

            // Workaround for Ola Maps style errors (like missing 3d_model layers) 
            // that prevent the native 'load' event from ever firing.
            map.current.on('error', (e) => {
                console.warn("MapLibre caught an error (often style related):", e)
                setMapLoaded(true)
            })

            // Absolute failsafe: if 1.5 seconds pass and no load event fired, force it.
            // The base tiles are usually visible by this point even if sprites failed.
            setTimeout(() => {
                setMapLoaded(true)
            }, 1500)
        }, 100)

        // Ensure map resizes correctly if container dimensions change
        let resizeObserver: ResizeObserver | null = null
        if (mapContainer.current) {
            resizeObserver = new ResizeObserver(() => {
                map.current?.resize()
            })
            resizeObserver.observe(mapContainer.current)
        }

        // Only remove map when the component truly unmounts
        return () => {
            if (resizeObserver) resizeObserver.disconnect()
            clearTimeout(initTimeout)
            setMapLoaded(false)
            map.current?.remove()
            map.current = null
        }
    }, []) // Empty deps = run ONCE

    // ─── Effect 2: Update markers when sourceData changes, WITHOUT touching the map ───
    useEffect(() => {
        // Effect 2: Update markers and set initial bounds when sourceData or map changes
        const placeMarkers = () => {
            console.log("DEBUG MAP: placeMarkers called", { mapExists: !!map.current, mapLoaded, sourceDataLen: sourceData?.length })
            if (!map.current || !mapLoaded) return

            // Clear old markers
            markersRef.current.forEach(m => m.remove())
            markersRef.current = []

            const bounds = new maplibregl.LngLatBounds()
            let hasValidCoords = false

            sourceData.forEach((complaint: Complaint) => {
                if (!complaint.location?.lat || !complaint.location?.lng) {
                    console.log("DEBUG MAP: Skipping marker due to missing lat/lng", complaint)
                    return
                }

                // Skip the missing-coordinate fallback mapped by API to New Delhi
                // This prevents the map from jumping 400km away to Delhi when a Kanpur citizen loads the page
                if (complaint.location.lat === 28.6139 && complaint.location.lng === 77.209) {
                    console.log("DEBUG MAP: Skipping marker mapped to New Delhi default", complaint)
                    return
                }

                hasValidCoords = true
                console.log("DEBUG MAP: Plotting marker coordinate", complaint.location)
                const lngLat: [number, number] = [Number(complaint.location.lng), Number(complaint.location.lat)]
                if (!isNaN(lngLat[0]) && !isNaN(lngLat[1])) {
                    bounds.extend(lngLat)
                }

                const isResolved = complaint.status === "resolved" || complaint.status === "closed"

                // Coloured dot marker
                const el = document.createElement("div")
                el.className = "marker"
                const bgColor = isResolved ? "bg-success" : "bg-destructive"
                el.innerHTML = `<div class="w-5 h-5 rounded-full border-[3px] border-white shadow-lg ${bgColor}" style="width: 20px; height: 20px;"></div>`

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

                // Fix: Add click listener to the marker element to toggle the popup
                el.style.cursor = "pointer"
                el.addEventListener('click', (e) => {
                    e.stopPropagation() // Prevent event from bubbling to map
                    marker.togglePopup()
                })

                markersRef.current.push(marker)
            })

            console.log("DEBUG MAP: finished plotting markers", { hasValidCoords, boundsInitialized: boundsInitializedRef.current, user: user?.role })

            // Only attempt bounds logic if we haven't already and the user profile has loaded
            if (!boundsInitializedRef.current && user) {
                if (hasValidCoords && map.current) {
                    boundsInitializedRef.current = true
                    try {
                        map.current.setMaxBounds(null)
                        // Fit to initial data instantly (no animation) to avoid bounds constraint conflicts crashing the camera
                        map.current.fitBounds(bounds, { padding: 50, maxZoom: 16, animate: false })
                    } catch (err) {
                        console.error("MapLibre fitBounds failed:", err)
                    }

                    // Restriction Logic for Citizens/Officers
                    if (user.role !== "sudo") {
                        const sw = bounds.getSouthWest()
                        const ne = bounds.getNorthEast()

                        const latDiff = Math.max(Math.abs(ne.lat - sw.lat), 0.05)
                        const lngDiff = Math.max(Math.abs(ne.lng - sw.lng), 0.05)

                        const elasticBounds = new maplibregl.LngLatBounds(
                            [sw.lng - lngDiff * 0.8, sw.lat - latDiff * 0.8],
                            [ne.lng + lngDiff * 0.8, ne.lat + latDiff * 0.8]
                        )
                        setTimeout(() => {
                            if (map.current) {
                                try { map.current.setMaxBounds(elasticBounds); map.current.setMinZoom(9) } catch (e) { }
                            }
                        }, 500)
                    }
                } else if (!hasValidCoords && map.current && user.ward) {
                    // FALLBACK: User has a ward but no valid points. Geocode ward instead.
                    boundsInitializedRef.current = true
                    try { map.current.setMaxBounds(null) } catch (e) { }

                    const olaApiKey = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY
                    fetch(`https://api.olamaps.io/places/v1/geocode?address=${user.ward}&api_key=${olaApiKey}`)
                        .then(res => res.json())
                        .then(data => {
                            if (data.geocodingResults && data.geocodingResults.length > 0) {
                                const location = data.geocodingResults[0].geometry.location
                                map.current?.flyTo({ center: [location.lng, location.lat], zoom: 12, essential: true })

                                if (user.role !== "sudo") {
                                    const elasticBounds = new maplibregl.LngLatBounds(
                                        [location.lng - 0.1, location.lat - 0.1],
                                        [location.lng + 0.1, location.lat + 0.1]
                                    )
                                    setTimeout(() => {
                                        if (map.current) {
                                            try { map.current.setMaxBounds(elasticBounds); map.current.setMinZoom(10) } catch (e) { }
                                        }
                                    }, 500)
                                }
                            }
                        })
                        .catch(err => console.error("Could not geocode fallback ward:", err))
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
        mapContainer.current?.addEventListener("click", handleClick)        // If map is already loaded and we have data, place markers immediately
        if (mapLoaded) {
            placeMarkers()
        }

        const currentMap = map.current
        return () => {
            markersRef.current.forEach(m => m.remove())
            markersRef.current = []
            if (mapContainer.current) {
                mapContainer.current.removeEventListener("click", handleClick)
            }
        }
    }, [sourceData, user?.role, isCitizen, setActiveView, setSelectedCommunityComplaintId, mapLoaded, user])

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

                {/* Map area */}
                <div className="p-0 flex-1 relative min-h-[400px] z-10">
                    <div
                        ref={mapContainer}
                        className="w-full h-full rounded-b-[2.5rem] bg-stone-50"
                        style={{ position: 'relative' }}
                    />
                </div>
            </div>
        </div>
    )
}
