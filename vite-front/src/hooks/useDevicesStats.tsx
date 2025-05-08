import { useState, useEffect, useCallback } from 'react'
import { fetchDeviceStats } from '../services/deviceService'
import type { DevicesStats } from '../types/DevicesStats'

export const useDeviceStats = (token: string | null | undefined) => {
  const [stats, setStats] = useState<DevicesStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (typeof token === 'string') {
        const devices = await fetchDeviceStats(token)
        setStats(devices)
      } else {
        throw new Error('Invalid token')
      }
    } catch (err) {
      console.error(err)
      setError('Failed to load stats')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      loadStats()
      const intervalId = setInterval(loadStats, 30_000)
      return () => clearInterval(intervalId)
    }
  }, [token, loadStats])

  return { stats, loading, error, loadStats }
}
