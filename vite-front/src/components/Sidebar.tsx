import React, { useEffect, useState } from 'react'
import { Layout, Menu, Avatar, Button, Divider } from 'antd'
import { Link, useLocation } from 'react-router-dom'
import { HomeOutlined, AppstoreAddOutlined, SettingOutlined, UserOutlined, ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons'
import LogoutButton from './LogoutButton'
import { useAuth } from '../context/AuthContext'
import { fetchDevices } from '../services/deviceService'
import type { Device } from '../types/Device'
import '../styles/sidebar.css'

const { Sider } = Layout

const Sidebar: React.FC = () => {
  const { token } = useAuth()
  const [devices, setDevices] = useState<Device[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const loadDevices = async () => {
      try {
        if (token) {
          const devices = await fetchDevices(token)
          setDevices(devices.filter(device => device.authorized === true))
        }
      } catch (error) {
        console.error('Failed to load devices', error)
      }
    }

    loadDevices()
  }, [token])

  return (
    <Sider 
      collapsed={collapsed} 
      width={250} 
      style={{ overflow: collapsed ? 'hidden' : 'auto', backgroundColor: '#001529' }}
      onTransitionEnd={() => {
        // Réactiver le scroll après l'animation
        if (!collapsed) {
          const sider = document.querySelector('.ant-layout-sider') as HTMLElement;
          if (sider) sider.style.overflow = 'auto';
        }
      }}
    >

      {/* Logo en haut avec bouton collapse */}
      <div style={{ 
        padding: '20px', 
        textAlign: collapsed ? 'center' : 'left', 
        color: 'white', 
        fontWeight: 'bold', 
        fontSize: '20px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: collapsed ? 'center' : 'space-between'
      }}>
        <span>{collapsed ? 'I' : 'IoThink'}</span>
        <Button 
          type="text" 
          icon={collapsed ? <ArrowRightOutlined /> : <ArrowLeftOutlined />} 
          onClick={() => setCollapsed(!collapsed)} 
          style={{ color: 'white', fontSize: '18px', marginLeft: collapsed ? 0 : 16 }} 
        />
      </div>

      <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]}>
        {/* Section Tableau de bord */}
        <Menu.Item key="/" icon={<HomeOutlined />}>
          <Link to="/">Tableau de bord</Link>
        </Menu.Item>

        <Divider style={{ margin: '16px 0', backgroundColor: '#ffffff40' }} />

        {/* Section des hubs */}
        {devices.map((device) => (
          <Menu.Item key={`/devices/${device.device_id}`} icon={<AppstoreAddOutlined />}>
            <Link to={`/devices/${device.device_id}`}>{device.device_id}</Link>
          </Menu.Item>
        ))}

        {/* Page des devices en attente */}
        <Menu.Item key="/pending" icon={<SettingOutlined />}>
          <Link to="/pending">En attente d'autorisation</Link>
        </Menu.Item>
      </Menu>

      {/* Fixé en bas */}
      <div style={{ 
        position: 'absolute', 
        bottom: 0, 
        width: '100%', 
        padding: '16px', 
        backgroundColor: '#001529',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        transition: 'all 0.2s ease-in-out'
      }}>
        {!collapsed && (
          <>
            <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
            <span style={{ color: 'white', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {'Administrateur'}
            </span>
          </>
        )}
        <LogoutButton />
      </div>
    </Sider>
  )
}

export default Sidebar
