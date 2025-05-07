import React, { useState } from 'react'
import { Form, Input, Button, Alert } from 'antd'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Navigate } from 'react-router-dom'

const Login: React.FC = () => {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Si déjà auth, on redirige tout de suite
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const onFinish = async (values: {
    username: string
    password: string
  }) => {
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
    <Form
      name="login"
      onFinish={onFinish}
      style={{
        maxWidth: 320,
        margin: '100px auto',
        padding: 24,
        border: '1px solid #f0f0f0',
        borderRadius: 4
      }}
    >
      {error && (
        <Alert
          type="error"
          message={error}
          style={{ marginBottom: 16 }}
        />
      )}
      <Form.Item
        name="username"
        rules={[{ required: true, message: 'Veuillez saisir votre nom d’utilisateur' }]}
      >
        <Input placeholder="Nom d’utilisateur" />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[{ required: true, message: 'Veuillez saisir votre mot de passe' }]}
      >
        <Input.Password placeholder="Mot de passe" />
      </Form.Item>
      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
          loading={loading}
        >
          Se connecter
        </Button>
      </Form.Item>
    </Form>
  )
}

export default Login
