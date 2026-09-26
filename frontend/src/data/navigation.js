import {
  BarChart3, Bell, BookOpen, Boxes, CalendarClock, ClipboardList, Cog, Database, FileBarChart,
  FileText, FlaskConical, Gauge, GitCompareArrows, Heart, LayoutDashboard, LineChart,
  Megaphone, PackageSearch, PieChart, Receipt, ScrollText, Settings,
  ShieldCheck, ShoppingCart, Sparkles, Star, Tags, TrendingUp, User, UserCog, Users, UtensilsCrossed,
} from 'lucide-react'

export const ROLE_HOME = {
  Customer: '/customer/dashboard',
  Admin: '/admin/dashboard',
  'Restaurant Manager': '/manager/dashboard',
  'Inventory Manager': '/inventory/dashboard',
}

export const ROLE_NAV = {
  Customer: [
    { label: 'Overview', path: '/customer/dashboard', icon: 'LayoutDashboard', end: true },
    { label: 'My Orders', path: '/customer/orders', icon: 'ShoppingCart' },
    { label: 'Favorites', path: '/customer/favorites', icon: 'Heart' },
    { label: 'Recommendations', path: '/customer/recommendations', icon: 'Sparkles' },
    { label: 'Promotions', path: '/customer/promotions', icon: 'Tags' },
    { label: 'Ratings & Reviews', path: '/customer/ratings', icon: 'Star' },
    { label: 'Profile', path: '/customer/profile', icon: 'User' },
  ],
  Admin: [
    { label: 'Overview', path: '/admin/dashboard', icon: 'LayoutDashboard', end: true },
    { label: 'Users', path: '/admin/users', icon: 'Users' },
    { label: 'Roles', path: '/admin/roles', icon: 'UserCog' },
    { label: 'Restaurants / Locations', path: '/admin/locations', icon: 'UtensilsCrossed' },
    { label: 'Data Management', path: '/admin/data-management', icon: 'Database' },
    { label: 'Data Quality', path: '/admin/data-quality', icon: 'ShieldCheck' },
    { label: 'System Monitoring', path: '/admin/system-monitoring', icon: 'Gauge' },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: 'ScrollText' },
    { label: 'Reports', path: '/admin/reports', icon: 'FileBarChart' },
    { label: 'Settings', path: '/admin/settings', icon: 'Settings' },
  ],
  'Restaurant Manager': [
    { label: 'Overview', path: '/manager/dashboard', icon: 'LayoutDashboard', end: true },
    { label: 'Sales Analytics', path: '/manager/sales', icon: 'TrendingUp' },
    { label: 'Menu Intelligence', path: '/manager/menu-intelligence', icon: 'UtensilsCrossed' },
    { label: 'Customer Intelligence', path: '/manager/customer-intelligence', icon: 'Users' },
    { label: 'Forecasting', path: '/manager/forecasting', icon: 'LineChart' },
    { label: 'Pricing', path: '/manager/pricing', icon: 'Tags' },
    { label: 'Promotions', path: '/manager/promotions', icon: 'Megaphone' },
    { label: 'Wastage Analytics', path: '/manager/wastage', icon: 'BookOpen' },
    { label: 'Anomaly Detection', path: '/manager/anomalies', icon: 'Gauge' },
    { label: 'Recommendations', path: '/manager/recommendations', icon: 'Sparkles' },
    { label: 'What-If Simulation', path: '/manager/what-if', icon: 'FlaskConical' },
    { label: 'Dual Pipeline', path: '/manager/dual-pipeline', icon: 'GitCompareArrows' },
    { label: 'Market Basket', path: '/manager/market-basket', icon: 'ShoppingCart' },
    { label: 'Reports', path: '/manager/reports', icon: 'FileBarChart' },
  ],
  'Inventory Manager': [
    { label: 'Overview', path: '/inventory/dashboard', icon: 'LayoutDashboard', end: true },
    { label: 'Inventory', path: '/inventory/items', icon: 'Boxes' },
    { label: 'Stock Levels', path: '/inventory/stock', icon: 'PackageSearch' },
    { label: 'Consumption', path: '/inventory/consumption', icon: 'BarChart3' },
    { label: 'Wastage', path: '/inventory/wastage', icon: 'BookOpen' },
    { label: 'Demand Forecast', path: '/inventory/forecast', icon: 'LineChart' },
    { label: 'Wastage Risk', path: '/inventory/wastage-risk', icon: 'ShieldCheck' },
    { label: 'Purchase Planning', path: '/inventory/purchase-planning', icon: 'ClipboardList' },
    { label: 'Reports', path: '/inventory/reports', icon: 'FileBarChart' },
  ],
}

/** Map of icon name -> component, used by the Sidebar renderer. */
export const ICONS = {
  LayoutDashboard, ShoppingCart, Heart, Sparkles, Tags, Star, User,
  Users, UserCog, UtensilsCrossed, Database, ShieldCheck, Gauge, ScrollText, FileBarChart, Settings,
  TrendingUp, LineChart, Megaphone, BookOpen, FlaskConical, GitCompareArrows,
  Boxes, PackageSearch, BarChart3, ClipboardList,
  Receipt, PieChart, CalendarClock, FileText, Bell, Cog,
}
