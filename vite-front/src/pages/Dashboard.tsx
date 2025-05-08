import React from 'react'
import { Row, Col, Card, Statistic, Spin, Empty, Table, Tag, Button, Skeleton } from 'antd'
import { PageHeader } from '@ant-design/pro-layout'
import { ReloadOutlined, CloudOutlined, ApiOutlined, WifiOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'
import { useDevices } from '../hooks/useDevices'
import { useSensors } from '../hooks/useSensors'
import { useDeviceStats } from '../hooks/useDevicesStats'
import { useSensorsStats } from '../hooks/useSensorsStats'

const Dashboard: React.FC = () => {
  const { token } = useAuth()
  const { deviceList, loading: devicesLoading, error: devicesError, loadDevices } = useDevices(token)
  const { sensorList, loading: sensorsLoading, error: sensorsError, loadSensors } = useSensors(token)
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
              loadSensors()
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
                {
                  title: 'Device ID',
                  dataIndex: 'device_id',
                  key: 'device_id',
                  width: '40%',
                  sorter: (a, b) => a.device_id.localeCompare(b.device_id),
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  key: 'status',
                  width: '30%',
                  filters: [
                    { text: 'Active', value: 'active' },
                    { text: 'Inactive', value: 'inactive' },
                  ],
                  onFilter: (value, record) => record.status === value,
                  render: (status: string) => (
                    <Tag color={status === 'active' ? 'green' : 'volcano'}>
                      {status.toUpperCase()}
                    </Tag>
                  ),
                },
                {
                  title: 'Dernière connexion',
                  dataIndex: 'last_seen',
                  key: 'last_seen',
                  width: '30%',
                  sorter: (a, b) => new Date(a.last_seen).getTime() - new Date(b.last_seen).getTime(),
                },
              ]}
              loading={devicesLoading}
              locale={{
                emptyText: devicesLoading ? <Spin size="large" /> : <Empty description="Aucun device disponible" />,
              }}
              scroll={{ x: true }}
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
          {sensorsError ? (
            <Card style={{ textAlign: 'center', padding: '32px 16px' }}>
              <Empty description="Erreur lors du chargement des capteurs" />
              <Button
                type="primary"
                onClick={() => loadSensors()}
                icon={<ReloadOutlined />}
                style={{ marginTop: '16px' }}
              >
                Réessayer
              </Button>
            </Card>
          ) : (
            <Table
              rowKey="id"
              dataSource={sensorList}
              columns={[
                {
                  title: 'Sensor ID',
                  dataIndex: 'id',
                  key: 'id',
                  width: '40%',
                  sorter: (a, b) => a.id.localeCompare(b.id),
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  key: 'status',
                  width: '30%',
                  filters: [
                    { text: 'Active', value: 'active' },
                    { text: 'Inactive', value: 'inactive' },
                  ],
                  onFilter: (value, record) => record.status === value,
                  render: (status: string) => (
                    <Tag color={status === 'active' ? 'green' : 'volcano'}>
                      {status.toUpperCase()}
                    </Tag>
                  ),
                },
                {
                  title: 'Hub',
                  dataIndex: 'hubId',
                  key: 'hubId',
                  width: '30%',
                  sorter: (a, b) => a.hubId.localeCompare(b.hubId),
                },
              ]}
              loading={sensorsLoading}
              locale={{
                emptyText: sensorsLoading ? <Spin size="large" /> : <Empty description="Aucun capteur disponible" />,
              }}
              scroll={{ x: true }}
            />
          )}
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
