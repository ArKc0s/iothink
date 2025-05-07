import { Layout } from 'antd'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

const { Content } = Layout

const AppLayout = () => (
  <Layout style={{ minHeight: '100vh' }}>
    <Sidebar />
    <Layout>
      <Content style={{padding: '32px', background: '#fff' }}>
        <Outlet />
      </Content>
    </Layout>
  </Layout>
)

export default AppLayout
