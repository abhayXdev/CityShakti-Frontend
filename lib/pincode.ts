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
 * Reverse geocodes coordinates to find the Indian PIN code using OpenStreetMap Nominatim
 */
export async function fetchPincodeFromCoordinates(lat: number, lon: number): Promise<string | null> {
    try {
        const apiKey = "dNvAoXqSNMEy4eLhtdapwBC6vGucSOcl0BFR73kQ"
        const res = await fetch(`https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lon}&api_key=${apiKey}`)
        if (!res.ok) return null

        const data = await res.json()
        const results = data?.results || []

        for (const result of results) {
            const components = result.address_components || []
            const postalComponent = components.find((c: any) =>
                c.types?.includes('postal_code') || c.types?.includes('pincode')
            )
            if (postalComponent && postalComponent.short_name) {
                const pin = postalComponent.short_name
                if (/^\d{6}$/.test(pin)) return pin
            }
        }

        // Fallback to searching the formatted address string
        if (results.length > 0 && results[0].formatted_address) {
            const match = results[0].formatted_address.match(/\b\d{6}\b/)
            if (match) return match[0]
        }

        return null
    } catch {
        return null
    }
}
