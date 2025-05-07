import React from 'react'
import { Button, Popconfirm } from 'antd'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const LogoutButton: React.FC = () => {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()               // vide le token et localStorage
    navigate('/login')     // renvoie à la page de login
  }

  return (
    <Popconfirm
      title="Voulez-vous vraiment vous déconnecter ?"
      onConfirm={handleLogout}
      okText="Oui"
      cancelText="Non"
    >
      <Button type="link">Se déconnecter</Button>
    </Popconfirm>
  )
}

export default LogoutButton
