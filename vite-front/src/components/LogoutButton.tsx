import React from 'react'
import { Button } from 'antd'
import { LogoutOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'

const LogoutButton: React.FC = () => {
  const { logout } = useAuth()

  return (
    <Button 
      type="primary" 
      danger 
      icon={<LogoutOutlined />} 
      onClick={logout}
      style={{ borderRadius: '50%', padding: 0, width: 40, height: 40 }}
    />
  )
}

export default LogoutButton
