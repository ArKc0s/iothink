import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import DeviceDetails from './pages/DeviceDetails';
import DeviceEnrollment from './pages/DeviceEnrollment';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* 1er wrapper : auth */}
          <Route element={<ProtectedRoute />}>
            {/* 2e wrapper : layout */}
            <Route element={<AppLayout />}>
              <Route path="/" index element={<Dashboard />} />
              <Route path="devices/:deviceId" element={<DeviceDetails />} />
              <Route path="devices" element={<DeviceEnrollment />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}


export default App;
