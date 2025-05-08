import React, { useState, useEffect } from 'react'
import { Card, Space, Select, Typography } from 'antd'
import { useParams } from 'react-router-dom'
import { fetchSensorData } from '../services/sensorService'
import { useAuth } from '../context/AuthContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { SensorDataPoint } from '../types/SensorDataPoint'

const { Option } = Select
const { Title: AntTitle } = Typography

const timeRanges = [
  { label: '5 minutes', value: '5m' },
  { label: '15 minutes', value: '15m' },
  { label: '1 heure', value: '1h' },
  { label: '6 heures', value: '6h' },
  { label: '24 heures', value: '24h' },
  { label: '1 semaine', value: '7d' },
  { label: '1 mois', value: '30d' },
  { label: '1 an', value: '365d' }
]

const DeviceDetails: React.FC = () => {
  const { token } = useAuth()
  const { deviceId } = useParams<{ deviceId: string }>()
  const [sensorData, setSensorData] = useState<{ [sensorId: string]: SensorDataPoint[] }>({})
  const [timeRange, setTimeRange] = useState<string>('15m')

  useEffect(() => {
    const loadData = async () => {
      try {
        const sensorNames = ['temperature', 'humidity', 'pressure'] // Remplace par tes capteurs réels
        const data: { [sensorId: string]: SensorDataPoint[] } = {}

        for (const sensorName of sensorNames) {
          const points = await fetchSensorData(token, deviceId!, sensorName, timeRange)
          data[sensorName] = points
        }

        setSensorData(data)
      } catch (error) {
        console.error('Erreur lors du chargement des données des capteurs', error)
      }
    }

    loadData()
  }, [deviceId, timeRange, token])

  return (
    <div style={{ padding: '20px' }}>
      <AntTitle level={2}>{deviceId}</AntTitle>

      {/* Sélecteur de plage de temps */}
      <Space style={{ marginBottom: '16px' }}>
        <Select defaultValue={timeRange} onChange={setTimeRange}>
          {timeRanges.map(range => (
            <Option key={range.value} value={range.value}>
              {range.label}
            </Option>
          ))}
        </Select>
      </Space>

      {/* Graphiques */}
      {Object.keys(sensorData).map(sensorId => (
        <Card key={sensorId} title={sensorId} bordered={false} style={{ marginBottom: '24px' }}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sensorData[sensorId]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" name={sensorId} stroke="#1890ff" dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      ))}
    </div>
  )
}

export default DeviceDetails
