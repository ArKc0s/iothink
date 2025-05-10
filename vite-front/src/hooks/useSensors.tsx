import { useState, useEffect, useCallback } from 'react'
import type { Sensor, SensorsResponse } from '../types/Sensor'
import { fetchSensors } from '../services/sensorService'

export const useSensors = (token: string | null | undefined) => {
  const [sensorList, setSensorList] = useState<Sensor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSensors = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (typeof token === 'string') {
        const sensorsResponse: SensorsResponse = await fetchSensors(token)
        
        // Transformation en liste de capteurs
        const sensors: Sensor[] = Object.entries(sensorsResponse).flatMap(([hubId, { active, inactive }]) => [
          ...active.map(sensor => ({ id: sensor, status: 'active' as const, hubId })),
          ...inactive.map(sensor => ({ id: sensor, status: 'inactive' as const, hubId })),
        ])

        setSensorList(sensors)
      } else {
        throw new Error('Invalid token')
      }
    } catch (err) {
      console.error(err)
      setError('Failed to load sensors')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      loadSensors()
      const intervalId = setInterval(loadSensors, 30_000)
      return () => clearInterval(intervalId)
    }
  }, [token, loadSensors])

  return { sensorList, loading, error, loadSensors }
}