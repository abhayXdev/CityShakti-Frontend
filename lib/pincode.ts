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
        const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
        if (!res.ok) return null

        const data = await res.json()

        if (
            !Array.isArray(data) ||
            data.length === 0 ||
            data[0].Status !== "Success" ||
            !data[0].PostOffice ||
            data[0].PostOffice.length === 0
        ) {
            return null
        }

        const po = data[0].PostOffice[0]
        return {
            postOffice: po.Name,
            district: po.District,
            state: po.State,
            pincode,
        }
    } catch {
        return null
    }
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
