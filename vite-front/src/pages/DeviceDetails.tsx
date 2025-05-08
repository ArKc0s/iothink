import React, { useState, useEffect, useRef } from 'react'
import { Card, Space, Select, Row, Col, Empty } from 'antd'
import { useParams } from 'react-router-dom'
import { fetchSensorData } from '../services/sensorService'
import { useAuth } from '../context/AuthContext'
import { ReloadOutlined } from '@ant-design/icons'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { SensorDataPoint } from '../types/SensorDataPoint'
import { PageHeader } from '@ant-design/pro-layout'

const { Option } = Select

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

const sensors = ['temperature', 'humidity', 'pressure'] // Remplace par tes capteurs réels

const DeviceDetails: React.FC = () => {
  const { token } = useAuth()
  const { deviceId } = useParams<{ deviceId: string }>()
  const [sensorData, setSensorData] = useState<{ [sensorId: string]: SensorDataPoint[] }>({})
  const [latestData, setLatestData] = useState<{ [sensorId: string]: SensorDataPoint }>({})
  const [timeRange, setTimeRange] = useState<string>('15m')
  const wsRef = useRef<WebSocket | null>(null)

  // Récupération des données historiques
  const loadData = async () => {
    try {
      const data: { [sensorId: string]: SensorDataPoint[] } = {}

      for (const sensorName of sensors) {
        const points = await fetchSensorData(token, deviceId!, sensorName, timeRange)
        data[sensorName] = points

        // Mise à jour de la dernière valeur connue
        if (points.length > 0) {
          setLatestData(prev => ({
            ...prev,
            [sensorName]: points[points.length - 1]
          }))
        }
      }

      setSensorData(data)
    } catch (error) {
      console.error('Erreur lors du chargement des données des capteurs', error)
    }
  }

  // Connexion WebSocket pour les mises à jour en temps réel
  useEffect(() => {
    if (!deviceId) return

    const ws = new WebSocket(`${import.meta.env.VITE_BACKEND_WSS_URL}/ws/sensor?device_id=${deviceId}`)
    ws.onopen = () => console.log("WebSocket ouvert")
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        const { sensor, value, timestamp } = message

        setLatestData(prev => ({
          ...prev,
          [sensor]: { timestamp, value }
        }))
      } catch (error) {
        console.error("Erreur de parsing des données WebSocket", error)
      }
    }

    ws.onclose = () => console.log("WebSocket fermé")
    ws.onerror = (error) => console.error("Erreur WebSocket", error)

    return () => ws.close()
  }, [deviceId])

  useEffect(() => {
    loadData()
  }, [deviceId, timeRange, token])

  return (
    <div>
      <PageHeader
        title="Données du hub"
        subTitle={deviceId}
        extra={[
          <Space key="controls">
            <Select defaultValue={timeRange} onChange={setTimeRange}>
              {timeRanges.map(range => (
                <Option key={range.value} value={range.value}>
                  {range.label}
                </Option>
              ))}
            </Select>
            <ReloadOutlined key="refresh" onClick={loadData} />
          </Space>
        ]}
        style={{ paddingLeft: 0 }}
      />

      {/* Cards avec les dernières valeurs connues */}
      <Row gutter={[24, 24]} style={{ marginBottom: 16 }}>
        {sensors.map(sensorId => (
          <Col key={sensorId} xs={24} sm={12} md={12} lg={6} xl={6}>
            <Card title={sensorId} bordered={false} style={{ height: 150 }}>
              {latestData[sensorId] ? (
                <div>
                  <p>Dernière valeur : {latestData[sensorId].value}</p>
                  <p>À : {new Date(latestData[sensorId].timestamp).toLocaleString()}</p>
                </div>
              ) : (
                <Empty description="Aucune donnée disponible" />
              )}
            </Card>
          </Col>
        ))}
      </Row>

      {/* Grille des graphiques */}
      <Row gutter={[24, 24]}>
        {sensors.map(sensorId => (
          <Col key={sensorId} xs={24} sm={24} md={12} lg={12} xl={12}>
            <Card title={sensorId} bordered={false} style={{ height: 350 }}>
              {sensorData[sensorId] && sensorData[sensorId].length > 0 ? (
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
              ) : (
                <Empty description="Aucune donnée pour cette période" />
              )}
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}

export default DeviceDetails
