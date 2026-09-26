import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute'
import DashboardLayout from './components/layout/DashboardLayout'
import Landing from './pages/Landing'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

import CustomerDashboard from './pages/customer/CustomerDashboard'
import CustomerOrders from './pages/customer/CustomerOrders'
import CustomerFavorites from './pages/customer/CustomerFavorites'
import CustomerRecommendations from './pages/customer/CustomerRecommendations'
import CustomerPromotions from './pages/customer/CustomerPromotions'
import CustomerRatings from './pages/customer/CustomerRatings'
import CustomerProfile from './pages/customer/CustomerProfile'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminRoles from './pages/admin/AdminRoles'
import AdminLocations from './pages/admin/AdminLocations'
import AdminDataManagement from './pages/admin/AdminDataManagement'
import AdminDataQuality from './pages/admin/AdminDataQuality'
import AdminSystemMonitoring from './pages/admin/AdminSystemMonitoring'
import AdminAuditLogs from './pages/admin/AdminAuditLogs'
import AdminReports from './pages/admin/AdminReports'
import AdminSettings from './pages/admin/AdminSettings'

import ManagerDashboard from './pages/manager/ManagerDashboard'
import SalesAnalytics from './pages/manager/SalesAnalytics'
import MenuIntelligence from './pages/manager/MenuIntelligence'
import CustomerIntelligence from './pages/manager/CustomerIntelligence'
import Forecasting from './pages/manager/Forecasting'
import Pricing from './pages/manager/Pricing'
import Promotions from './pages/manager/Promotions'
import WastageAnalytics from './pages/manager/WastageAnalytics'
import AnomalyDetection from './pages/manager/AnomalyDetection'
import Recommendations from './pages/manager/Recommendations'
import WhatIf from './pages/manager/WhatIf'
import DualPipeline from './pages/manager/DualPipeline'
import MarketBasket from './pages/manager/MarketBasket'
import ReportsPage from './pages/shared/ReportsPage'

import InventoryDashboard from './pages/inventory/InventoryDashboard'
import InventoryItems from './pages/inventory/InventoryItems'
import StockLevels from './pages/inventory/StockLevels'
import Consumption from './pages/inventory/Consumption'
import InventoryWastage from './pages/inventory/InventoryWastage'
import DemandForecast from './pages/inventory/DemandForecast'
import WastageRisk from './pages/inventory/WastageRisk'
import PurchasePlanning from './pages/inventory/PurchasePlanning'

/** 404 for unknown routes inside the app. */
function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f6f7fb] p-6 text-center">
      <div className="card anim-pop max-w-md p-10">
        <p className="font-script text-4xl text-brand-500">Oops!</p>
        <h1 className="font-display mt-2 text-3xl font-extrabold text-ink-900">404 — Page not found</h1>
        <p className="mt-3 text-sm text-ink-500">The page you are looking for does not exist in DineIQ Analytics.</p>
        <a href="/" className="btn btn-primary mt-6 !px-6 !py-3 text-xs uppercase tracking-wider">Back to home</a>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Customer */}
      <Route
        path="/customer"
        element={
          <ProtectedRoute role="Customer">
            <DashboardLayout role="Customer" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/customer/dashboard" replace />} />
        <Route path="dashboard" element={<CustomerDashboard />} />
        <Route path="orders" element={<CustomerOrders />} />
        <Route path="favorites" element={<CustomerFavorites />} />
        <Route path="recommendations" element={<CustomerRecommendations />} />
        <Route path="promotions" element={<CustomerPromotions />} />
        <Route path="ratings" element={<CustomerRatings />} />
        <Route path="profile" element={<CustomerProfile />} />
      </Route>

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="Admin">
            <DashboardLayout role="Admin" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="roles" element={<AdminRoles />} />
        <Route path="locations" element={<AdminLocations />} />
        <Route path="data-management" element={<AdminDataManagement />} />
        <Route path="data-quality" element={<AdminDataQuality />} />
        <Route path="system-monitoring" element={<AdminSystemMonitoring />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Restaurant Manager */}
      <Route
        path="/manager"
        element={
          <ProtectedRoute role="Restaurant Manager">
            <DashboardLayout role="Restaurant Manager" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/manager/dashboard" replace />} />
        <Route path="dashboard" element={<ManagerDashboard />} />
        <Route path="sales" element={<SalesAnalytics />} />
        <Route path="menu-intelligence" element={<MenuIntelligence />} />
        <Route path="customer-intelligence" element={<CustomerIntelligence />} />
        <Route path="forecasting" element={<Forecasting />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="promotions" element={<Promotions />} />
        <Route path="wastage" element={<WastageAnalytics />} />
        <Route path="anomalies" element={<AnomalyDetection />} />
        <Route path="recommendations" element={<Recommendations />} />
        <Route path="what-if" element={<WhatIf />} />
        <Route path="dual-pipeline" element={<DualPipeline />} />
        <Route path="market-basket" element={<MarketBasket />} />
        <Route path="reports" element={<ReportsPage scope="Business Intelligence" />} />
      </Route>

      {/* Inventory Manager */}
      <Route
        path="/inventory"
        element={
          <ProtectedRoute role="Inventory Manager">
            <DashboardLayout role="Inventory Manager" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/inventory/dashboard" replace />} />
        <Route path="dashboard" element={<InventoryDashboard />} />
        <Route path="items" element={<InventoryItems />} />
        <Route path="stock" element={<StockLevels />} />
        <Route path="consumption" element={<Consumption />} />
        <Route path="wastage" element={<InventoryWastage />} />
        <Route path="forecast" element={<DemandForecast />} />
        <Route path="wastage-risk" element={<WastageRisk />} />
        <Route path="purchase-planning" element={<PurchasePlanning />} />
        <Route path="reports" element={<ReportsPage scope="Inventory" />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
