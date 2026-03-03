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
