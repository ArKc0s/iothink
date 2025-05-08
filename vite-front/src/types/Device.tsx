interface Device {
    _id: string
    device_id: string
    status: 'active' | 'inactive' | string
    last_seen: string
    authorized: boolean
}
export type { Device };