import { useState, useEffect, useCallback } from 'react'
import { fetchDevices } from '../services/deviceService'
import type { Device } from '../types/Device'

export const useDevices = (token: string | null | undefined) => {
  const [deviceList, setDeviceList] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDevices = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (typeof token === 'string') {
        const devices = await fetchDevices(token)
        setDeviceList(devices.filter(device => device.authorized === true))
      } else {
        throw new Error('Invalid token')
      }
    } catch (err) {
      console.error(err)
      setError('Failed to load devices')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      loadDevices()
      const intervalId = setInterval(loadDevices, 30_000)
      return () => clearInterval(intervalId)
    }
  }, [token, loadDevices])

  return { deviceList, loading, error, loadDevices }
}
