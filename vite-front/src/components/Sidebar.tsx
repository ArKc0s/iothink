import { Layout, Menu } from 'antd';
import { Link } from 'react-router-dom';
import {
  HomeOutlined,
  AppstoreAddOutlined,
  SettingOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import LogoutButton from './LogoutButton';

const { Sider } = Layout;

const Sidebar = () => {
  return (
    <Sider collapsible>
      <div className="logo">IoThink</div>
      <Menu theme="dark" mode="inline">
        <Menu.Item key="1" icon={<HomeOutlined />}>
          <Link to="/">Dashboard</Link>
        </Menu.Item>
        <Menu.Item key="2" icon={<AppstoreAddOutlined />}>
          <Link to="/devices">Appareils</Link>
        </Menu.Item>
        <Menu.Item key="3" icon={<SettingOutlined />}>
          <Link to="/settings">Settings</Link>
        </Menu.Item>
        <Menu.Item key="4" icon={<LogoutOutlined />}>
          <LogoutButton />
        </Menu.Item>
      </Menu>
    </Sider>
  );
};

export default Sidebar;