import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Table, Tag, Button, Empty, Spin, Modal } from 'antd'
import { ReloadOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'
import { fetchDevices, authorizeDevice } from '../services/deviceService'

const Pending: React.FC = () => {
  const { token } = useAuth()
  const [deviceList, setDeviceList] = useState<any[]>([])
  const [pendingDevices, setPendingDevices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingAuthorization, setLoadingAuthorization] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)

  useEffect(() => {
    loadDevices()
  }, [])

  const loadDevices = async () => {
    setLoading(true)
    setError(null)
    try {
      if (typeof token === 'string') {
        const devices = await fetchDevices(token)
        setDeviceList(devices)
      } else {
        throw new Error('Invalid token')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Filtrer les devices en attente d'appariage
  useEffect(() => {
    if (deviceList) {
      setPendingDevices(deviceList.filter(device => device.authorized === false))
    }
  }, [deviceList])

  // Fonction pour autoriser un device
  const processAuthorization = async (deviceId: string, token: string | null) => {
    setLoadingAuthorization(true)
    setSelectedDeviceId(deviceId)
    try {
      if (typeof token === 'string') {
        await authorizeDevice(deviceId, token)
      } else {
        throw new Error('Invalid token')
      }
      Modal.success({
        title: 'Appareil autorisé',
        content: `L'appareil ${deviceId} a été autorisé avec succès.`,
      })
      loadDevices() // Recharger la liste des devices après autorisation
    } catch (error) {
      Modal.error({
        title: 'Erreur',
        content: error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'autorisation de l\'appareil.',
      })
    } finally {
      setLoadingAuthorization(false)
    }
  }

  // Colonnes du tableau des appareils en attente
  const columns = [
    {
      title: 'Device ID',
      dataIndex: 'device_id',
      key: 'device_id',
      width: '40%',
    },
    {
      title: 'Addresse MAC',
      dataIndex: 'mac',
      key: 'mac',
      width: '30%',
      render: (status: string) => (
        <Tag color="orange">{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (record: any) => (
        <Button
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={() => processAuthorization(record.device_id, token)}
          loading={loadingAuthorization && selectedDeviceId === record.device_id}
        >
          Autoriser
        </Button>
      ),
    },
  ]

  return (
    <div>
      {/* En-tête de page */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Appareils en attente d'appariage</h3>
        </Col>
        <Col span={24}>
          {error ? (
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
              dataSource={pendingDevices}
              columns={columns}
              loading={loading}
              locale={{
                emptyText: loading ? <Spin size="large" /> : <Empty description="Aucun appareil en attente" />,
              }}
              scroll={{ x: true }}
            />
          )}
        </Col>
      </Row>
    </div>
  )
}

export default Pending
