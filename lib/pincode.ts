/**
 * Indian PIN code validation and area lookup utility.
 * Uses the free India Post API: https://api.postalpincode.in
 */

export interface PincodeInfo {
    postOffice: string
    district: string
    state: string
    pincode: string
}

export type PincodeStatus = "idle" | "loading" | "valid" | "invalid"

/**
 * Fetches area info for a 6-digit Indian PIN code.
 * Returns null if the pincode is invalid or not found.
 */
export async function fetchPincodeInfo(pincode: string): Promise<PincodeInfo | null> {
    if (!/^\d{6}$/.test(pincode)) return null

    try {
        // First try Zippopotam (Free, Reliable SSL)
        const res = await fetch(`https://api.zippopotam.us/in/${pincode}`)
        if (res.ok) {
            const data = await res.json()
            if (data && data.places && data.places.length > 0) {
                const place = data.places[0]
                return {
                    postOffice: place["place name"],
                    district: place["state"], // Zippopotam usually provides state for district
                    state: place["state"],
                    pincode,
                }
            }
        }
    } catch (error) {
        console.error("Zippopotam API error:", error)
    }

    try {
        // Fallback to Ola Maps API if available
        const apiKey = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY
        if (apiKey) {
            const res = await fetch(`https://api.olamaps.io/places/v1/geocode?address=${pincode}&api_key=${apiKey}`)
            if (res.ok) {
                const data = await res.json()
                const results = data?.geocodingResults || []
                if (results.length > 0) {
                     const result = results[0]
                     let district = ""
                     let state = ""
                     let postOffice = result.name || "Area"
                     
                     for (const c of result.address_components || []) {
                         if (c.types.includes("district") || c.types.includes("administrative_area_level_3")) {
                             district = c.short_name
                         }
                         if (c.types.includes("state") || c.types.includes("administrative_area_level_1")) {
                             state = c.short_name
                         }
                         if (c.types.includes("sublocality") || c.types.includes("locality")) {
                             postOffice = c.short_name
                         }
                     }
                     return {
                         postOffice,
                         district: district || state || "Unknown",
                         state: state || "Unknown",
                         pincode
                     }
                }
            }
        }
    } catch (error) {
        console.error("Ola Maps Geocode API error:", error)
    }

    return null
}

/**
 * Returns a human-readable area label from PincodeInfo.
 * e.g. "Connaught Place, New Delhi, Delhi"
 */
export function formatPincodeArea(info: PincodeInfo): string {
    return `${info.postOffice}, ${info.district}, ${info.state}`
}

/**
 * Reverse geocodes coordinates to find the Indian PIN code using Ola Maps API.
 * If multiple PIN codes are found (common near boundaries), it will favor the preferredPincode if provided.
 */
export async function fetchPincodeFromCoordinates(lat: number, lon: number, preferredPincode?: string): Promise<string | null> {
    try {
        const apiKey = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY
        if (!apiKey) {
            console.error("Ola Maps API Key is missing in environment variables.")
            return null
        }
        const res = await fetch(`https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lon}&api_key=${apiKey}`)
        if (!res.ok) return null

        const data = await res.json()
        const results = data?.results || []
        const pinsFound: string[] = []

        for (const result of results) {
            const components = result.address_components || []
            const postalComponent = components.find((c: any) =>
                c.types?.includes('postal_code') || c.types?.includes('pincode')
            )

            if (postalComponent && postalComponent.short_name) {
                const pin = postalComponent.short_name
                if (/^\d{6}$/.test(pin) && !pinsFound.includes(pin)) {
                    pinsFound.push(pin)
                }
            }

            // Also check formatted address as a secondary extraction source
            if (result.formatted_address) {
                const match = result.formatted_address.match(/\b\d{6}\b/)
                if (match && !pinsFound.includes(match[0])) {
                    pinsFound.push(match[0])
                }
            }
        }

        if (pinsFound.length === 0) return null

        // Accuracy Optimization: If multiple wards are detected at this point (common near boundaries)
        // and one of them is the user's registered home ward, prioritize it.
        if (preferredPincode && pinsFound.includes(preferredPincode)) {
            console.log(`[Pincode] Prioritizing preferred PIN ${preferredPincode} from found candidates:`, pinsFound)
            return preferredPincode
        }

        return pinsFound[0]
    } catch (error) {
        console.error("Reverse geocoding error:", error)
        return null
    }
}
