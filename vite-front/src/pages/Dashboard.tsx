import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Spin, Empty, Table, Tag, Button } from 'antd'
import { PageHeader } from '@ant-design/pro-layout'
import { ReloadOutlined, CloudOutlined, ApiOutlined, WifiOutlined } from '@ant-design/icons'
import axios from 'axios'

interface DevicesStats {
  totalDevices: number
  offlineDevices: number
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DevicesStats | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    axios
      .get<DevicesStats>(`${import.meta.env.VITE_BACKEND_URL}/devices`)
      .then(res => setStats(res.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

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
    { title: 'Device ID', dataIndex: 'id', key: 'id' },
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

  const deviceList: { id: string; status: string; lastSeen: string }[] = [];
  const loadingDevices = false; // Remplace par un état de chargement réel si nécessaire

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
            axios.get<DevicesStats>(`${import.meta.env.VITE_BACKEND_URL}/devices`)
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
              value={stats.onlineDevices}
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
        rowKey="id"
        dataSource={deviceList}
        columns={deviceColumns}
        loading={loadingDevices}
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