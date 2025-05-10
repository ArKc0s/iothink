import React, { useState } from 'react'
import { Form, Input, Button, Alert, Card, Typography, Space } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Navigate } from 'react-router-dom'

const { Title, Text } = Typography

const Login: React.FC = () => {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Redirection si déjà authentifié
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    const ok = await login(values.username, values.password)
    setLoading(false)
    if (ok) {
      navigate('/', { replace: true })
    } else {
      setError('Identifiants invalides')
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
      <Card
        title={<Title level={2} style={{ textAlign: 'center', marginBottom: 0 }}>IoThink</Title>}
        style={{ width: 350 }}
        bordered={false}
      >
        {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
        <Form name="login" onFinish={onFinish} layout="vertical">
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Veuillez saisir votre nom d’utilisateur' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Nom d’utilisateur" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Veuillez saisir votre mot de passe' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Mot de passe" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              Se connecter
            </Button>
          </Form.Item>
        </Form>
        <Space direction="vertical" size="small" style={{ width: '100%', textAlign: 'center' }}>
          <Text type="secondary">IoThink - Système de gestion IoT</Text>
        </Space>
      </Card>
    </div>
  )
}

export default Login
