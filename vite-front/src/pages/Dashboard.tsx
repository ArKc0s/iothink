import React from 'react'
import { Row, Col, Card, Statistic, Spin, Empty, Table, Tag, Button, Skeleton } from 'antd'
import { PageHeader } from '@ant-design/pro-layout'
import { ReloadOutlined, CloudOutlined, ApiOutlined, WifiOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'
import { useDevices } from '../hooks/useDevices'
import { useDeviceStats } from '../hooks/useDevicesStats'
import { useSensorsStats } from '../hooks/useSensorsStats'

const Dashboard: React.FC = () => {
  const { token } = useAuth()
  const { deviceList, loading: devicesLoading, error: devicesError, loadDevices } = useDevices(token)
  const { stats: devicesStats, loading: statsLoading, error: statsError, loadStats: loadDevicesStats } = useDeviceStats(token)
  const { stats: sensorsStats, loading: sensorStatsLoading, error: sensorStatsError, loadStats: loadSensorsStats } = useSensorsStats(token)

  // Dimensions fixes pour éviter le "layout shift"
  const cardStyle = {
    height: 115, 
  }

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
              loadDevices()
              loadDevicesStats()
              loadSensorsStats()
            }}
          />
        ]}
        style={{ paddingLeft: 0 }}
      />

      {/* Statistiques globales */}
      <Row gutter={[16, 16]}>
        {statsLoading || sensorStatsLoading ? (
          [0, 1, 2, 3].map((_, index) => (
            <Col xs={24} sm={12} md={6} key={index}>
              <Card style={cardStyle}>
                <Skeleton active paragraph={false} title={{ width: '60%' }} />
              </Card>
            </Col>
          ))
        ) : statsError || sensorStatsError ? (
          <Col span={24}>
            <Card style={{ textAlign: 'center' }}>
              <Empty description="Erreur lors du chargement des statistiques" />
              <Button type="primary" onClick={() => {loadDevicesStats(); loadSensorsStats()}} icon={<ReloadOutlined />} style={{ marginTop: '16px' }}>
                Réessayer
              </Button>
            </Card>
          </Col>
        ) : devicesStats && sensorsStats ? (
          <>
            <Col xs={24} sm={12} md={6}>
              <Card style={cardStyle}>
                <Statistic title="Nombre de hubs IoT" value={devicesStats.totalDevices} prefix={<ApiOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card style={cardStyle}>
                <Statistic title="Hubs hors ligne" value={devicesStats.inactiveDevices} prefix={<CloudOutlined style={{ color: '#ff4d4f' }} />} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card style={cardStyle}>
                <Statistic title="Capteurs actifs" value={sensorsStats.activeSensors} prefix={<WifiOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card style={cardStyle}>
                <Statistic title="Capteurs inactifs" value={sensorsStats.inactiveSensors} prefix={<WifiOutlined style={{ color: '#ff4d4f' }} />} />
              </Card>
            </Col>
          </>
        ) : (
          <Col span={24}>
            <Card style={cardStyle}>
              <Empty description="Aucune statistique disponible" />
            </Card>
          </Col>
        )}
      </Row>

      {/* Tableau des hubs */}
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col span={24}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Liste des hubs</h3>
        </Col>
        <Col span={24}>
          {devicesError ? (
            <Card style={{ textAlign: 'center', padding: '32px 16px' }}>
              <Empty description="Erreur lors du chargement des devices" />
              <Button
                type="primary"
                onClick={() => loadDevices()}
                icon={<ReloadOutlined />}
                style={{ marginTop: '16px' }}
              >
                Réessayer
              </Button>
            </Card>
          ) : (
            <Table
              rowKey="_id"
              dataSource={deviceList}
              columns={[
                { title: 'Device ID', dataIndex: 'device_id', key: 'device_id' },
                { title: 'Status', dataIndex: 'status', key: 'status' },
                { title: 'Last seen', dataIndex: 'last_seen', key: 'last_seen' },
              ]}
              loading={devicesLoading}
              locale={{
                emptyText: devicesLoading ? <Spin size="large" /> : <Empty description="Aucun device disponible" />,
              }}
            />
          )}
        </Col>
      </Row>

      {/* Tableau des capteurs */}
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col span={24}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Liste des capteurs</h3>
        </Col>
        <Col span={24}>
          <Table
            rowKey="id"
            dataSource={[]}
            columns={[
              { title: 'Sensor ID', dataIndex: 'id', key: 'id' },
              { title: 'Status', dataIndex: 'status', key: 'status' },
              { title: 'Last seen', dataIndex: 'lastSeen', key: 'lastSeen' },
            ]}
            loading={false}
          />
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
