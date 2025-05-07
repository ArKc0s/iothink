import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Spin, Empty, Table, Tag, Button } from 'antd'
import { PageHeader } from '@ant-design/pro-layout'
import { ReloadOutlined, CloudOutlined, ApiOutlined, WifiOutlined } from '@ant-design/icons'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'  

interface Device {
  _id: string
  device_id: string
  status: 'active' | 'inactive' | string
  last_seen: string
  authorized: boolean
}

interface DevicesStats {
  totalDevices: number
  inactiveDevices: number
}

const Dashboard: React.FC = () => {
  const { token } = useAuth() 
  const [deviceList, setDeviceList] = useState<Device[]>([])
  const [stats, setStats] = useState<DevicesStats | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const fetchDevices = async () => {
    setLoading(true)
    try {
      const res = await axios.get<Device[]>(
        `${import.meta.env.VITE_BACKEND_URL}/devices`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const devices = res.data
      setDeviceList(devices)

      const total = devices.length
      const inactive = devices.filter(d => !d.authorized).length
      setStats({ totalDevices: total, inactiveDevices: inactive })
    } catch (err) {
      console.error(err)
      setDeviceList([])
      setStats({ totalDevices: 0, inactiveDevices: 0 })
    } finally {
      setLoading(false)
    }
  }

  // Autoriser un device (ex: PATCH /devices/:id/authorize)
  const authorizeDevice = async (id: string) => {
    try {
      await axios.patch(
        `${import.meta.env.VITE_BACKEND_URL}/devices/${id}/authorize`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchDevices()
    } catch (err) {
      console.error('Authorization failed', err)
    }
  }


  useEffect(() => {
    axios
      .get<DevicesStats>(`${import.meta.env.VITE_BACKEND_URL}/devices/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setStats(res.data))
      .then(() => console.log(token))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))


    fetchDevices()
    const intervalId = setInterval(fetchDevices, 30_000)
    return () => clearInterval(intervalId)
  }, [token])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!stats) {
    return (
      <Empty
        description="Impossible de charger les données"
        style={{ marginTop: 80 }}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    )
  }

  const deviceColumns = [
    {
      title: 'Device ID',
      dataIndex: 'device_id',
      key: 'device_id'
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'active' ? 'green' : 'volcano'}>{s}</Tag>
      )
    },
    {
      title: 'Dernière connexion',
      dataIndex: 'last_seen',
      key: 'last_seen'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Device) =>
        !record.authorized ? (
          <Button
            size="small"
            type="primary"
            onClick={() => authorizeDevice(record._id)}
          >
            Autoriser
          </Button>
        ) : null
    }
  ]

  const sensorColumns = [
    { title: 'Sensor ID', dataIndex: 'id', key: 'id' },
    { title: 'Status',    dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={s==='online'?'green':'volcano'}>{s}</Tag> },
    { title: 'Last seen', dataIndex: 'lastSeen', key: 'lastSeen' },
    { title: 'Actions',   key: 'actions', render: (_: any, _row: unknown) => (
        <>
          <Button size="small" onClick={()=>console.log("dfgdgdg")}>Autoriser</Button>
        </>
      )
    },
  ]

  const sensorList: { id: string; status: string; lastSeen: string }[] = [];
  const loadingSensors = false; // Remplace par un état de chargement réel si nécessaire

  return (
    <div>
      {/* En-tête de page */}
        <PageHeader
          title="Tableau de bord"
          subTitle="Vue d’ensemble de votre système"
          extra={[
            <ReloadOutlined
          key="refresh"
          onClick={() => {
            setLoading(true)
            axios.get<DevicesStats>(`${import.meta.env.VITE_BACKEND_URL}/devices/stats`, { headers: { Authorization: `Bearer ${token}` } })
              .then(res => setStats(res.data))
              .finally(() => setLoading(false))
          }}
            />
          ]}
          style={{ paddingLeft: 0 }}
        />

        {/* Statistiques globales */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Nombre de hubs IoT"
              value={stats.totalDevices}
              prefix={<ApiOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Hubs hors ligne"
              value={stats.inactiveDevices}
              prefix={<CloudOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Capteurs actifs"
              value={stats.offlineDevices}
              prefix={<WifiOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Capteurs inactifs"
              value={stats.offlineDevices}
              prefix={<WifiOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col span={24}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Liste des hubs</h3>
        </Col>
      </Row>

      <Table
        rowKey="_id"
        dataSource={deviceList}
        columns={deviceColumns}
        loading={loading}
      />

      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col span={24}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Liste des capteurs</h3>
        </Col>
      </Row>

      <Table
        rowKey="id"
        dataSource={sensorList}
        columns={sensorColumns}
        loading={loadingSensors}
      />

    </div>
  )
}

export default Dashboard