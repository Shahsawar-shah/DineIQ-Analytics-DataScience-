import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import MenuDashboard from './pages/MenuDashboard'
import CustomerDashboard from './pages/CustomerDashboard'
import WastageDashboard from './pages/WastageDashboard'
import DualPipelineDashboard from './pages/DualPipelineDashboard'
import { DashboardLayout } from './components/DashboardLayout'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="menu" element={<MenuDashboard />} />
          <Route path="customers" element={<CustomerDashboard />} />
          <Route path="wastage" element={<WastageDashboard />} />
          <Route path="pipeline" element={<DualPipelineDashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
