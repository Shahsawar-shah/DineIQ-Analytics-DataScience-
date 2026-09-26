import type {
  AnomalyRow,
  AssociationRow,
  AuditRow,
  CustomerRow,
  InventoryRow,
  LocationRow,
  MenuItemRow,
  OrderRow,
  PromotionRow,
  RecommendationRow,
  UserRow,
} from '@/types'

/* ============================================================
   DINEIQ ANALYTICS — CENTRALIZED MOCK DATA (DEMO / MOCK DATA)
   Realistic, internally consistent numbers for frontend demo.
   Replace with API responses during backend integration.
   ============================================================ */

export const LOCATIONS: LocationRow[] = [
  { id: 'L1', name: 'Downtown Flagship', city: 'Metro City', manager: 'Victor Laurent', status: 'Operational', orders30d: 4182, revenue30d: 128450, dataQuality: 97 },
  { id: 'L2', name: 'Riverside Bistro', city: 'Metro City', manager: 'Dana Cole', status: 'Operational', orders30d: 2914, revenue30d: 86200, dataQuality: 94 },
  { id: 'L3', name: 'Harbor Point', city: 'Baytown', manager: 'Luis Ortega', status: 'Operational', orders30d: 3390, revenue30d: 101380, dataQuality: 91 },
  { id: 'L4', name: 'Uptown Grill', city: 'Metro City', manager: 'Aisha Bello', status: 'Maintenance', orders30d: 2054, revenue30d: 62140, dataQuality: 88 },
  { id: 'L5', name: 'Airport Terminal 2', city: 'Baytown', manager: 'Ken Watanabe', status: 'Operational', orders30d: 3721, revenue30d: 118905, dataQuality: 95 },
]

export const CATEGORIES = ['Main Course', 'Starters', 'Desserts', 'Beverages', 'Sides']

export const MENU_ITEMS: MenuItemRow[] = [
  { id: 'M01', name: 'Truffle Mushroom Risotto', category: 'Main Course', price: 18.5, sold: 1240, revenue: 22940, cost: 7.2, profit: 14.05, margin: 61.1, rating: 4.8, repeatRate: 46, wastagePct: 2.1, promoLift: 12, trend: 8.4, perfClass: 'High' },
  { id: 'M02', name: 'Grilled Salmon Bowl', category: 'Main Course', price: 21.0, sold: 980, revenue: 20580, cost: 8.6, profit: 15.4, margin: 59.0, rating: 4.7, repeatRate: 41, wastagePct: 3.4, promoLift: 9, trend: 6.1, perfClass: 'High' },
  { id: 'M03', name: 'Classic Cheeseburger', category: 'Main Course', price: 12.9, sold: 2310, revenue: 29799, cost: 4.7, profit: 9.9, margin: 63.6, rating: 4.6, repeatRate: 58, wastagePct: 1.8, promoLift: 15, trend: 4.2, perfClass: 'High' },
  { id: 'M04', name: 'Margherita Flatbread', category: 'Main Course', price: 14.5, sold: 1120, revenue: 16240, cost: 4.9, profit: 11.8, margin: 66.2, rating: 4.4, repeatRate: 37, wastagePct: 2.9, promoLift: 11, trend: -2.3, perfClass: 'Medium' },
  { id: 'M05', name: 'Crispy Calamari', category: 'Starters', price: 11.0, sold: 860, revenue: 9460, cost: 4.4, profit: 7.6, margin: 60.0, rating: 4.5, repeatRate: 29, wastagePct: 5.6, promoLift: 8, trend: -4.8, perfClass: 'Medium' },
  { id: 'M06', name: 'Loaded Nachos', category: 'Starters', price: 9.5, sold: 1490, revenue: 14155, cost: 3.3, profit: 7.4, margin: 65.3, rating: 4.3, repeatRate: 33, wastagePct: 4.1, promoLift: 14, trend: 3.6, perfClass: 'Medium' },
  { id: 'M07', name: 'Garden Caesar Salad', category: 'Starters', price: 8.9, sold: 640, revenue: 5696, cost: 2.8, profit: 6.1, margin: 68.5, rating: 4.1, repeatRate: 21, wastagePct: 6.8, promoLift: 5, trend: -6.9, perfClass: 'Low' },
  { id: 'M08', name: 'Molten Chocolate Lava', category: 'Desserts', price: 7.5, sold: 1310, revenue: 9825, cost: 2.1, profit: 6.2, margin: 72.0, rating: 4.9, repeatRate: 44, wastagePct: 1.4, promoLift: 18, trend: 9.7, perfClass: 'High' },
  { id: 'M09', name: 'Tiramisu Cup', category: 'Desserts', price: 6.9, sold: 540, revenue: 3726, cost: 1.9, profit: 5.0, margin: 72.5, rating: 4.2, repeatRate: 18, wastagePct: 3.7, promoLift: 6, trend: -1.2, perfClass: 'Low' },
  { id: 'M10', name: 'Cold Brew Coffee', category: 'Beverages', price: 4.8, sold: 2870, revenue: 13776, cost: 1.1, profit: 4.1, margin: 77.1, rating: 4.6, repeatRate: 62, wastagePct: 0.9, promoLift: 7, trend: 12.3, perfClass: 'High' },
  { id: 'M11', name: 'Berry Hibiscus Cooler', category: 'Beverages', price: 5.6, sold: 760, revenue: 4256, cost: 1.4, profit: 4.2, margin: 75.0, rating: 4.4, repeatRate: 26, wastagePct: 2.2, promoLift: 10, trend: 5.5, perfClass: 'Medium' },
  { id: 'M12', name: 'Sweet Potato Fries', category: 'Sides', price: 5.2, sold: 1980, revenue: 10296, cost: 1.6, profit: 4.1, margin: 69.2, rating: 4.5, repeatRate: 49, wastagePct: 2.6, promoLift: 9, trend: 2.8, perfClass: 'Medium' },
  { id: 'M13', name: 'Truffle Parmesan Fries', category: 'Sides', price: 6.8, sold: 460, revenue: 3128, cost: 2.3, profit: 4.5, margin: 66.2, rating: 4.0, repeatRate: 15, wastagePct: 7.4, promoLift: 4, trend: -8.1, perfClass: 'Low' },
  { id: 'M14', name: 'Garlic Herb Bread', category: 'Sides', price: 4.5, sold: 1720, revenue: 7740, cost: 1.2, profit: 3.8, margin: 73.3, rating: 4.3, repeatRate: 39, wastagePct: 3.1, promoLift: 8, trend: 1.4, perfClass: 'Medium' },
]

export const REVENUE_TREND = [
  { month: 'Apr', revenue: 96500, orders: 11800, target: 92000 },
  { month: 'May', revenue: 104200, orders: 12360, target: 98000 },
  { month: 'Jun', revenue: 99800, orders: 11990, target: 102000 },
  { month: 'Jul', revenue: 112400, orders: 13210, target: 106000 },
  { month: 'Aug', revenue: 121800, orders: 14080, target: 112000 },
  { month: 'Sep', revenue: 128450, orders: 14680, target: 118000 },
]

export const CATEGORY_REVENUE = [
  { name: 'Main Course', value: 89559 },
  { name: 'Beverages', value: 18032 },
  { name: 'Starters', value: 29311 },
  { name: 'Sides', value: 21164 },
  { name: 'Desserts', value: 13551 },
]

export const CHANNEL_SHARE = [
  { name: 'Dine-in', value: 46 },
  { name: 'Delivery', value: 28 },
  { name: 'Takeaway', value: 16 },
  { name: 'App Orders', value: 10 },
]

export const ORDERS: OrderRow[] = [
  { id: 'ORD-8841', customer: 'Amelia Hart', date: '2026-09-25 19:42', items: 3, channel: 'Dine-in', location: 'Downtown Flagship', total: 52.4, status: 'Completed' },
  { id: 'ORD-8840', customer: 'Noah Kim', date: '2026-09-25 20:05', items: 2, channel: 'App Orders', location: 'Harbor Point', total: 31.9, status: 'Delivered' },
  { id: 'ORD-8839', customer: 'Sofia Reyes', date: '2026-09-25 20:31', items: 5, channel: 'Delivery', location: 'Riverside Bistro', total: 78.2, status: 'Preparing' },
  { id: 'ORD-8838', customer: 'Liam Patel', date: '2026-09-25 21:12', items: 2, channel: 'Takeaway', location: 'Uptown Grill', total: 24.6, status: 'Completed' },
  { id: 'ORD-8837', customer: 'Mia Chen', date: '2026-09-24 18:57', items: 4, channel: 'Dine-in', location: 'Downtown Flagship', total: 64.75, status: 'Completed' },
  { id: 'ORD-8836', customer: 'Ethan Ross', date: '2026-09-24 12:30', items: 1, channel: 'App Orders', location: 'Airport Terminal 2', total: 14.5, status: 'Cancelled' },
  { id: 'ORD-8835', customer: 'Ava Moreau', date: '2026-09-24 13:14', items: 3, channel: 'Delivery', location: 'Harbor Point', total: 41.3, status: 'Delivered' },
  { id: 'ORD-8834', customer: 'Lucas Weber', date: '2026-09-23 19:20', items: 2, channel: 'Dine-in', location: 'Riverside Bistro', total: 36.8, status: 'Completed' },
  { id: 'ORD-8833', customer: 'Isabella Novak', date: '2026-09-23 20:02', items: 6, channel: 'Dine-in', location: 'Downtown Flagship', total: 96.4, status: 'Completed' },
  { id: 'ORD-8832', customer: 'Oscar Lind', date: '2026-09-23 12:48', items: 2, channel: 'Takeaway', location: 'Airport Terminal 2', total: 22.1, status: 'Delivered' },
]

export const CUSTOMERS: CustomerRow[] = [
  { id: 'C-101', name: 'Amelia Hart', segment: 'Champions', rfm: '555', recencyDays: 2, frequency: 42, monetary: 2140, ltv: 5350, orders: 42, lastVisit: '2026-09-25', channel: 'Dine-in', churnRisk: 'Low' },
  { id: 'C-102', name: 'Noah Kim', segment: 'Loyal', rfm: '453', recencyDays: 5, frequency: 28, monetary: 1490, ltv: 3220, orders: 28, lastVisit: '2026-09-22', channel: 'App Orders', churnRisk: 'Low' },
  { id: 'C-103', name: 'Sofia Reyes', segment: 'Champions', rfm: '545', recencyDays: 1, frequency: 39, monetary: 1985, ltv: 4870, orders: 39, lastVisit: '2026-09-25', channel: 'Delivery', churnRisk: 'Low' },
  { id: 'C-104', name: 'Liam Patel', segment: 'Potential Loyalist', rfm: '434', recencyDays: 9, frequency: 14, monetary: 612, ltv: 1540, orders: 14, lastVisit: '2026-09-17', channel: 'Takeaway', churnRisk: 'Medium' },
  { id: 'C-105', name: 'Mia Chen', segment: 'Loyal', rfm: '444', recencyDays: 4, frequency: 25, monetary: 1320, ltv: 3050, orders: 25, lastVisit: '2026-09-23', channel: 'Dine-in', churnRisk: 'Low' },
  { id: 'C-106', name: 'Ethan Ross', segment: 'At Risk', rfm: '233', recencyDays: 46, frequency: 11, monetary: 388, ltv: 720, orders: 11, lastVisit: '2026-08-11', channel: 'App Orders', churnRisk: 'High' },
  { id: 'C-107', name: 'Ava Moreau', segment: 'New', rfm: '413', recencyDays: 3, frequency: 3, monetary: 142, ltv: 380, orders: 3, lastVisit: '2026-09-24', channel: 'Delivery', churnRisk: 'Medium' },
  { id: 'C-108', name: 'Lucas Weber', segment: 'Potential Loyalist', rfm: '424', recencyDays: 6, frequency: 12, monetary: 564, ltv: 1380, orders: 12, lastVisit: '2026-09-20', channel: 'Dine-in', churnRisk: 'Low' },
  { id: 'C-109', name: 'Isabella Novak', segment: 'Champions', rfm: '554', recencyDays: 3, frequency: 36, monetary: 2245, ltv: 5610, orders: 36, lastVisit: '2026-09-23', channel: 'Dine-in', churnRisk: 'Low' },
  { id: 'C-110', name: 'Oscar Lind', segment: 'Hibernating', rfm: '222', recencyDays: 68, frequency: 8, monetary: 204, ltv: 410, orders: 8, lastVisit: '2026-07-19', channel: 'Takeaway', churnRisk: 'High' },
  { id: 'C-111', name: 'Emma Fischer', segment: 'Loyal', rfm: '445', recencyDays: 7, frequency: 22, monetary: 1180, ltv: 2810, orders: 22, lastVisit: '2026-09-19', channel: 'Delivery', churnRisk: 'Low' },
  { id: 'C-112', name: 'Daniel Okafor', segment: 'At Risk', rfm: '242', recencyDays: 39, frequency: 15, monetary: 496, ltv: 990, orders: 15, lastVisit: '2026-08-18', channel: 'App Orders', churnRisk: 'High' },
]

export const SEGMENTS = [
  { name: 'Champions', count: 184, share: 18, avgSpend: 54.2, color: '#f95d0b', desc: 'Recent, frequent, high spend' },
  { name: 'Loyal', count: 262, share: 26, avgSpend: 41.8, color: '#fb7f38', desc: 'Consistent repeat customers' },
  { name: 'Potential Loyalist', count: 214, share: 21, avgSpend: 33.5, color: '#f9a825', desc: 'Growing frequency' },
  { name: 'New', count: 168, share: 17, avgSpend: 27.9, color: '#1d4ed8', desc: 'First 30 days' },
  { name: 'At Risk', count: 118, share: 11, avgSpend: 24.6, color: '#d92d20', desc: 'Declining visits' },
  { name: 'Hibernating', count: 74, share: 7, avgSpend: 19.3, color: '#878ba7', desc: 'Long absence' },
]

export const ASSOCIATIONS: AssociationRow[] = [
  { a: 'Classic Cheeseburger', b: 'Sweet Potato Fries', support: 0.142, confidence: 0.48, lift: 2.6 },
  { a: 'Truffle Mushroom Risotto', b: 'Cold Brew Coffee', support: 0.118, confidence: 0.41, lift: 2.3 },
  { a: 'Molten Chocolate Lava', b: 'Cold Brew Coffee', support: 0.104, confidence: 0.39, lift: 2.2 },
  { a: 'Grilled Salmon Bowl', b: 'Garden Caesar Salad', support: 0.096, confidence: 0.37, lift: 2.1 },
  { a: 'Loaded Nachos', b: 'Berry Hibiscus Cooler', support: 0.089, confidence: 0.35, lift: 1.9 },
  { a: 'Margherita Flatbread', b: 'Garlic Herb Bread', support: 0.081, confidence: 0.33, lift: 1.8 },
  { a: 'Crispy Calamari', b: 'Classic Cheeseburger', support: 0.074, confidence: 0.31, lift: 1.7 },
  { a: 'Classic Cheeseburger', b: 'Molten Chocolate Lava', support: 0.068, confidence: 0.29, lift: 1.6 },
  { a: 'Cold Brew Coffee', b: 'Tiramisu Cup', support: 0.052, confidence: 0.24, lift: 1.4 },
  { a: 'Garden Caesar Salad', b: 'Berry Hibiscus Cooler', support: 0.041, confidence: 0.19, lift: 1.2 },
]

export const PROMOTIONS: PromotionRow[] = [
  { id: 'P-01', campaign: 'September Bundle Fest', type: 'Combo', discount: 20, revenue: 28450, orders: 1420, conversion: 12.4, uplift: 24, status: 'Active', roi: 3.4 },
  { id: 'P-02', campaign: 'Weekend Family Feast', type: 'Bundle', discount: 15, revenue: 19820, orders: 990, conversion: 10.8, uplift: 19, status: 'Active', roi: 2.9 },
  { id: 'P-03', campaign: 'Dessert Happy Hour', type: 'Time-based', discount: 30, revenue: 12480, orders: 1180, conversion: 15.2, uplift: 31, status: 'Active', roi: 3.8 },
  { id: 'P-04', campaign: 'App-Exclusive Flash', type: 'App-only', discount: 25, revenue: 15240, orders: 860, conversion: 9.6, uplift: 27, status: 'Ended', roi: 2.6 },
  { id: 'P-05', campaign: 'Lunch Express 20%', type: 'Time-based', discount: 20, revenue: 21130, orders: 1340, conversion: 13.9, uplift: 22, status: 'Ended', roi: 3.1 },
  { id: 'P-06', campaign: 'Free Delivery Week', type: 'Delivery', discount: 10, revenue: 17660, orders: 1210, conversion: 11.3, uplift: 17, status: 'Scheduled', roi: 2.4 },
  { id: 'P-07', campaign: 'Loyalty Double Points', type: 'Loyalty', discount: 0, revenue: 13980, orders: 940, conversion: 8.8, uplift: 14, status: 'Scheduled', roi: 2.8 },
]

export const ANOMALIES: AnomalyRow[] = [
  { id: 'A-01', date: '2026-09-24', location: 'Harbor Point', metric: 'Revenue', expected: 4180, actual: 2860, severity: 'Critical', status: 'Investigating' },
  { id: 'A-02', date: '2026-09-24', location: 'Uptown Grill', metric: 'Orders', expected: 142, actual: 168, severity: 'Warning', status: 'Open' },
  { id: 'A-03', date: '2026-09-23', location: 'Downtown Flagship', metric: 'Avg Order Value', expected: 30.4, actual: 31.1, severity: 'Normal', status: 'Resolved' },
  { id: 'A-04', date: '2026-09-22', location: 'Riverside Bistro', metric: 'Wastage Cost', expected: 210, actual: 385, severity: 'Critical', status: 'Investigating' },
  { id: 'A-05', date: '2026-09-21', location: 'Airport Terminal 2', metric: 'Orders', expected: 196, actual: 142, severity: 'Warning', status: 'Open' },
  { id: 'A-06', date: '2026-09-20', location: 'Downtown Flagship', metric: 'Delivery Time', expected: 24, actual: 41, severity: 'Warning', status: 'Resolved' },
  { id: 'A-07', date: '2026-09-19', location: 'Harbor Point', metric: 'Revenue', expected: 3950, actual: 4120, severity: 'Normal', status: 'Resolved' },
  { id: 'A-08', date: '2026-09-18', location: 'Uptown Grill', metric: 'Wastage Cost', expected: 180, actual: 192, severity: 'Normal', status: 'Resolved' },
]

export const RECOMMENDATIONS: RecommendationRow[] = [
  { id: 'R-01', area: 'Menu', title: 'Promote Truffle Mushroom Risotto', detail: 'High margin (61%) with rising trend (+8.4%). Feature it on the hero banner and weekend specials board.', impact: 'High', confidence: 92 },
  { id: 'R-02', area: 'Menu', title: 'Rework Garden Caesar Salad', detail: 'Low performance, −6.9% trend and 6.8% wastage. Test a new dressing and smaller portion size.', impact: 'Medium', confidence: 84 },
  { id: 'R-03', area: 'Customers', title: 'Win-back campaign for 118 At-Risk customers', detail: 'Target the At Risk segment with a 15% personal coupon — estimated $4.2k recovered revenue.', impact: 'High', confidence: 88 },
  { id: 'R-04', area: 'Customers', title: 'Upsell dessert pairings to Champions', detail: 'Champions add desserts only 22% of the time despite 4.9★ lava cake ratings.', impact: 'Medium', confidence: 79 },
  { id: 'R-05', area: 'Pricing', title: 'Raise Cold Brew price by $0.30', detail: 'Demand elasticity −0.4 at current price point; expected +$1.1k monthly profit with <2% volume loss.', impact: 'Medium', confidence: 86 },
  { id: 'R-06', area: 'Pricing', title: 'Bundle Margherita Flatbread at $12.90', detail: 'Basket analysis shows strong lift with Garlic Herb Bread; a bundle lifts combo attach by 18%.', impact: 'Low', confidence: 74 },
  { id: 'R-07', area: 'Promotions', title: 'Extend Dessert Happy Hour to Thursdays', detail: 'Current ROI 3.8x with 31% uplift — Thursday traffic profile matches Tuesday pattern.', impact: 'High', confidence: 90 },
  { id: 'R-08', area: 'Promotions', title: 'Pause Free Delivery Week', detail: 'ROI 2.4x is below the 2.6x portfolio floor; reallocate budget to Bundle Fest.', impact: 'Medium', confidence: 81 },
  { id: 'R-09', area: 'Inventory', title: 'Reduce calamari par level by 20%', detail: '5.6% wastage with −4.8% sales trend. Adjust purchase orders for the next 2 weeks.', impact: 'Medium', confidence: 85 },
  { id: 'R-10', area: 'Inventory', title: 'Pre-order extra cold brew beans', detail: 'Forecast shows +12.3% demand next month; current stock covers only 18 days.', impact: 'High', confidence: 93 },
]

/* ---------------- Inventory (Inventory Manager) ---------------- */

export const INVENTORY: InventoryRow[] = [
  { id: 'I-01', item: 'Atlantic Salmon Fillet', category: 'Seafood', unit: 'kg', stock: 42, parLevel: 60, status: 'Low Stock', consumption30d: 380, value: 966, wastagePct: 3.4, supplier: 'BayFresh Co.', reorderQty: 40, nextDelivery: 'Sep 28' },
  { id: 'I-02', item: 'Arborio Rice', category: 'Dry Goods', unit: 'kg', stock: 210, parLevel: 150, status: 'In Stock', consumption30d: 240, value: 546, wastagePct: 0.8, supplier: 'GoldenGrain', reorderQty: 0, nextDelivery: '—' },
  { id: 'I-03', item: 'Beef Chuck (Ground)', category: 'Meat', unit: 'kg', stock: 88, parLevel: 120, status: 'In Stock', consumption30d: 410, value: 792, wastagePct: 2.2, supplier: 'PrimeMeats', reorderQty: 60, nextDelivery: 'Sep 27' },
  { id: 'I-04', item: 'Squid (Calamari)', category: 'Seafood', unit: 'kg', stock: 0, parLevel: 40, status: 'Out of Stock', consumption30d: 150, value: 0, wastagePct: 5.6, supplier: 'BayFresh Co.', reorderQty: 45, nextDelivery: 'Sep 26' },
  { id: 'I-05', item: 'Mozzarella Cheese', category: 'Dairy', unit: 'kg', stock: 96, parLevel: 90, status: 'In Stock', consumption30d: 260, value: 816, wastagePct: 1.9, supplier: 'DairyVale', reorderQty: 0, nextDelivery: '—' },
  { id: 'I-06', item: 'Roma Tomatoes', category: 'Produce', unit: 'kg', stock: 34, parLevel: 80, status: 'Low Stock', consumption30d: 520, value: 102, wastagePct: 6.1, supplier: 'GreenLeaf Farms', reorderQty: 70, nextDelivery: 'Sep 26' },
  { id: 'I-07', item: 'Coffee Beans (Arabica)', category: 'Beverage', unit: 'kg', stock: 28, parLevel: 50, status: 'Low Stock', consumption30d: 96, value: 728, wastagePct: 0.9, supplier: 'RoastWorks', reorderQty: 36, nextDelivery: 'Sep 29' },
  { id: 'I-08', item: 'Dark Chocolate 70%', category: 'Bakery', unit: 'kg', stock: 52, parLevel: 45, status: 'In Stock', consumption30d: 110, value: 416, wastagePct: 1.2, supplier: 'CocoaCraft', reorderQty: 0, nextDelivery: '—' },
  { id: 'I-09', item: 'Romaine Lettuce', category: 'Produce', unit: 'kg', stock: 18, parLevel: 55, status: 'Low Stock', consumption30d: 300, value: 54, wastagePct: 7.4, supplier: 'GreenLeaf Farms', reorderQty: 55, nextDelivery: 'Sep 26' },
  { id: 'I-10', item: 'Sweet Potatoes', category: 'Produce', unit: 'kg', stock: 130, parLevel: 100, status: 'In Stock', consumption30d: 340, value: 221, wastagePct: 2.6, supplier: 'GreenLeaf Farms', reorderQty: 0, nextDelivery: '—' },
  { id: 'I-11', item: 'Heavy Cream', category: 'Dairy', unit: 'L', stock: 64, parLevel: 70, status: 'In Stock', consumption30d: 190, value: 288, wastagePct: 2.8, supplier: 'DairyVale', reorderQty: 20, nextDelivery: 'Sep 30' },
  { id: 'I-12', item: 'Hibiscus Syrup', category: 'Beverage', unit: 'L', stock: 12, parLevel: 30, status: 'Low Stock', consumption30d: 58, value: 132, wastagePct: 1.5, supplier: 'RoastWorks', reorderQty: 24, nextDelivery: 'Sep 27' },
]

export const WASTAGE_TREND = [
  { day: 'Mon', wastage: 182, cost: 412 },
  { day: 'Tue', wastage: 164, cost: 368 },
  { day: 'Wed', wastage: 205, cost: 462 },
  { day: 'Thu', wastage: 190, cost: 430 },
  { day: 'Fri', wastage: 246, cost: 556 },
  { day: 'Sat', wastage: 288, cost: 649 },
  { day: 'Sun', wastage: 231, cost: 521 },
]

export const WASTAGE_BY_CATEGORY = [
  { name: 'Produce', value: 34 },
  { name: 'Seafood', value: 24 },
  { name: 'Bakery', value: 16 },
  { name: 'Dairy', value: 14 },
  { name: 'Meat', value: 12 },
]

export const CONSUMPTION_TREND = [
  { week: 'W1', consumption: 1180, stock: 1420 },
  { week: 'W2', consumption: 1245, stock: 1380 },
  { week: 'W3', consumption: 1310, stock: 1350 },
  { week: 'W4', consumption: 1276, stock: 1390 },
]

/* ---------------- Forecasting ---------------- */

export const FORECAST_DAILY = [
  { day: 'Sep 19', actual: 4120, forecast: null as number | null, low: null as number | null, high: null as number | null },
  { day: 'Sep 20', actual: 4380, forecast: null, low: null, high: null },
  { day: 'Sep 21', actual: 3960, forecast: null, low: null, high: null },
  { day: 'Sep 22', actual: 4090, forecast: null, low: null, high: null },
  { day: 'Sep 23', actual: 4310, forecast: null, low: null, high: null },
  { day: 'Sep 24', actual: 4180, forecast: null, low: null, high: null },
  { day: 'Sep 25', actual: 4260, forecast: null, low: null, high: null },
  { day: 'Sep 26', actual: null, forecast: 4290, low: 4010, high: 4570 },
  { day: 'Sep 27', actual: null, forecast: 4520, low: 4160, high: 4880 },
  { day: 'Sep 28', actual: null, forecast: 4310, low: 3900, high: 4720 },
  { day: 'Sep 29', actual: null, forecast: 4180, low: 3740, high: 4620 },
  { day: 'Sep 30', actual: null, forecast: 4405, low: 3920, high: 4890 },
]

export const FORECAST_WEEKLY = [
  { day: 'W38', actual: 28640, forecast: null as number | null, low: null as number | null, high: null as number | null },
  { day: 'W39', actual: 29210, forecast: null, low: null, high: null },
  { day: 'W40', actual: null, forecast: 30180, low: 28300, high: 32060 },
  { day: 'W41', actual: null, forecast: 31240, low: 29020, high: 33460 },
  { day: 'W42', actual: null, forecast: 30610, low: 28180, high: 33040 },
  { day: 'W43', actual: null, forecast: 31980, low: 29240, high: 34720 },
]

export const FORECAST_MONTHLY = [
  { day: 'Jun', actual: 99800, forecast: null as number | null, low: null as number | null, high: null as number | null },
  { day: 'Jul', actual: 112400, forecast: null, low: null, high: null },
  { day: 'Aug', actual: 121800, forecast: null, low: null, high: null },
  { day: 'Sep', actual: 128450, forecast: null, low: null, high: null },
  { day: 'Oct', actual: null, forecast: 133900, low: 125400, high: 142400 },
  { day: 'Nov', actual: null, forecast: 141200, low: 130600, high: 151800 },
]

/* ---------------- Pricing ---------------- */

export const PRICING_ROWS = [
  { id: 'P01', item: 'Classic Cheeseburger', currentPrice: 12.9, oldPrice: 11.9, sales: 2310, revenue: 29799, demandChange: 4.2, elasticity: -0.6, sensitivity: 'Low' },
  { id: 'P02', item: 'Truffle Mushroom Risotto', currentPrice: 18.5, oldPrice: 17.5, sales: 1240, revenue: 22940, demandChange: 8.4, elasticity: -0.8, sensitivity: 'Low' },
  { id: 'P03', item: 'Cold Brew Coffee', currentPrice: 4.8, oldPrice: 4.5, sales: 2870, revenue: 13776, demandChange: 12.3, elasticity: -0.4, sensitivity: 'Low' },
  { id: 'P04', item: 'Crispy Calamari', currentPrice: 11.0, oldPrice: 10.0, sales: 860, revenue: 9460, demandChange: -4.8, elasticity: -1.6, sensitivity: 'High' },
  { id: 'P05', item: 'Garden Caesar Salad', currentPrice: 8.9, oldPrice: 8.4, sales: 640, revenue: 5696, demandChange: -6.9, elasticity: -1.8, sensitivity: 'High' },
  { id: 'P06', item: 'Molten Chocolate Lava', currentPrice: 7.5, oldPrice: 6.9, sales: 1310, revenue: 9825, demandChange: 9.7, elasticity: -0.7, sensitivity: 'Low' },
  { id: 'P07', item: 'Margherita Flatbread', currentPrice: 14.5, oldPrice: 13.9, sales: 1120, revenue: 16240, demandChange: -2.3, elasticity: -1.2, sensitivity: 'Medium' },
  { id: 'P08', item: 'Loaded Nachos', currentPrice: 9.5, oldPrice: 9.0, sales: 1490, revenue: 14155, demandChange: 3.6, elasticity: -0.9, sensitivity: 'Medium' },
]

/* ---------------- Admin ---------------- */

export const USERS: UserRow[] = [
  { id: 'U-001', name: 'Victor Laurent', email: 'victor.l@dineiq.io', role: 'Restaurant Manager', location: 'Downtown Flagship', status: 'Active', lastLogin: '2026-09-25 09:12' },
  { id: 'U-002', name: 'Priya Nair', email: 'priya.n@dineiq.io', role: 'Inventory Manager', location: 'All Locations', status: 'Active', lastLogin: '2026-09-25 08:47' },
  { id: 'U-003', name: 'Dana Cole', email: 'dana.c@dineiq.io', role: 'Restaurant Manager', location: 'Riverside Bistro', status: 'Active', lastLogin: '2026-09-24 17:30' },
  { id: 'U-004', name: 'System Administrator', email: 'admin@dineiq.io', role: 'Admin', location: 'All Locations', status: 'Active', lastLogin: '2026-09-25 10:02' },
  { id: 'U-005', name: 'Amelia Hart', email: 'amelia.h@gmail.com', role: 'Customer', location: '—', status: 'Active', lastLogin: '2026-09-25 19:40' },
  { id: 'U-006', name: 'Luis Ortega', email: 'luis.o@dineiq.io', role: 'Restaurant Manager', location: 'Harbor Point', status: 'Inactive', lastLogin: '2026-09-18 11:05' },
  { id: 'U-007', name: 'Noah Kim', email: 'noah.k@gmail.com', role: 'Customer', location: '—', status: 'Active', lastLogin: '2026-09-25 20:05' },
  { id: 'U-008', name: 'Aisha Bello', email: 'aisha.b@dineiq.io', role: 'Restaurant Manager', location: 'Uptown Grill', status: 'Active', lastLogin: '2026-09-25 07:55' },
  { id: 'U-009', name: 'Ethan Ross', email: 'ethan.r@gmail.com', role: 'Customer', location: '—', status: 'Suspended', lastLogin: '2026-08-11 12:22' },
  { id: 'U-010', name: 'Ken Watanabe', email: 'ken.w@dineiq.io', role: 'Restaurant Manager', location: 'Airport Terminal 2', status: 'Active', lastLogin: '2026-09-24 21:14' },
]

export const ROLE_DISTRIBUTION = [
  { name: 'Customers', value: 842, color: '#f95d0b' },
  { name: 'Restaurant Managers', value: 24, color: '#fb7f38' },
  { name: 'Inventory Managers', value: 9, color: '#f9a825' },
  { name: 'Admins', value: 4, color: '#1d4ed8' },
]

export const DATA_QUALITY = [
  { dimension: 'Completeness', score: 96.4 },
  { dimension: 'Accuracy', score: 93.1 },
  { dimension: 'Consistency', score: 91.8 },
  { dimension: 'Timeliness', score: 88.6 },
  { dimension: 'Validity', score: 94.9 },
  { dimension: 'Uniqueness', score: 97.2 },
]

export const SYSTEM_SERVICES = [
  { name: 'Ingestion Pipeline', status: 'Healthy', latency: '120 ms', uptime: '99.98%', load: 42 },
  { name: 'Spark Processing Cluster', status: 'Healthy', latency: '1.8 s', uptime: '99.91%', load: 64 },
  { name: 'ML Scoring Service', status: 'Degraded', latency: '3.4 s', uptime: '98.60%', load: 81 },
  { name: 'Analytics API', status: 'Healthy', latency: '85 ms', uptime: '99.99%', load: 38 },
  { name: 'Reporting Engine', status: 'Healthy', latency: '210 ms', uptime: '99.95%', load: 47 },
]

export const AUDIT_LOGS: AuditRow[] = [
  { id: 'L-8841', timestamp: '2026-09-25 10:02', actor: 'System Administrator', action: 'Updated user role', entity: 'Luis Ortega → Inactive', severity: 'Warning' },
  { id: 'L-8840', timestamp: '2026-09-25 09:44', actor: 'Victor Laurent', action: 'Exported report (CSV)', entity: 'Sales Analytics — September', severity: 'Info' },
  { id: 'L-8839', timestamp: '2026-09-25 08:47', actor: 'Priya Nair', action: 'Approved purchase order', entity: 'PO-1187 — GreenLeaf Farms', severity: 'Info' },
  { id: 'L-8838', timestamp: '2026-09-24 22:10', actor: 'System', action: 'Anomaly detected', entity: 'Revenue @ Harbor Point', severity: 'Critical' },
  { id: 'L-8837', timestamp: '2026-09-24 18:31', actor: 'Dana Cole', action: 'Modified menu prices', entity: '4 items — Riverside Bistro', severity: 'Warning' },
  { id: 'L-8836', timestamp: '2026-09-24 16:05', actor: 'System Administrator', action: 'Data re-ingestion triggered', entity: 'Orders partition 2026-09-24', severity: 'Info' },
  { id: 'L-8835', timestamp: '2026-09-24 11:26', actor: 'System', action: 'Failed login attempts (5)', entity: 'unknown@suspicious.mail', severity: 'Critical' },
  { id: 'L-8834', timestamp: '2026-09-23 19:58', actor: 'Aisha Bello', action: 'Created promotion', entity: 'Weekend Family Feast', severity: 'Info' },
]

export const PIPELINE_COMPARISON = {
  runs: [
    { run: 'Run 14', model: 'XGBoost v2.3', pyPred: 43260, sparkPred: 43180, pyTime: 8.4, sparkTime: 2.1, pyAcc: 94.2, sparkAcc: 93.8 },
    { run: 'Run 13', model: 'XGBoost v2.3', pyPred: 41890, sparkPred: 41950, pyTime: 8.1, sparkTime: 2.0, pyAcc: 93.9, sparkAcc: 94.0 },
    { run: 'Run 12', model: 'XGBoost v2.2', pyPred: 40120, sparkPred: 40080, pyTime: 7.8, sparkTime: 1.9, pyAcc: 93.1, sparkAcc: 92.8 },
    { run: 'Run 11', model: 'XGBoost v2.2', pyPred: 39440, sparkPred: 39510, pyTime: 7.9, sparkTime: 2.0, pyAcc: 92.6, sparkAcc: 92.9 },
  ],
  summary: {
    pyAccuracy: 93.5,
    sparkAccuracy: 93.4,
    pyMae: 412,
    sparkMae: 428,
    pyTime: 8.1,
    sparkTime: 2.0,
    modelVersion: 'XGBoost v2.3',
  },
}

/* ---------------- Customer (self) ---------------- */

export const MY_ORDERS: OrderRow[] = [
  { id: 'ORD-8841', customer: 'Amelia Hart', date: '2026-09-25 19:42', items: 3, channel: 'Dine-in', location: 'Downtown Flagship', total: 52.4, status: 'Completed' },
  { id: 'ORD-8790', customer: 'Amelia Hart', date: '2026-09-21 13:18', items: 2, channel: 'Delivery', location: 'Downtown Flagship', total: 38.9, status: 'Delivered' },
  { id: 'ORD-8712', customer: 'Amelia Hart', date: '2026-09-17 20:05', items: 4, channel: 'Dine-in', location: 'Riverside Bistro', total: 74.3, status: 'Completed' },
  { id: 'ORD-8633', customer: 'Amelia Hart', date: '2026-09-12 12:44', items: 1, channel: 'App Orders', location: 'Harbor Point', total: 21.0, status: 'Delivered' },
  { id: 'ORD-8521', customer: 'Amelia Hart', date: '2026-09-04 19:31', items: 3, channel: 'Dine-in', location: 'Downtown Flagship', total: 47.6, status: 'Completed' },
  { id: 'ORD-8410', customer: 'Amelia Hart', date: '2026-08-29 18:22', items: 2, channel: 'Takeaway', location: 'Uptown Grill', total: 26.4, status: 'Cancelled' },
]

export const FAVORITES = [
  { id: 'M01', name: 'Truffle Mushroom Risotto', category: 'Main Course', price: 18.5, rating: 4.8, orders: 12, image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&w=640&q=80' },
  { id: 'M10', name: 'Cold Brew Coffee', category: 'Beverages', price: 4.8, rating: 4.6, orders: 21, image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=640&q=80' },
  { id: 'M08', name: 'Molten Chocolate Lava', category: 'Desserts', price: 7.5, rating: 4.9, orders: 9, image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=640&q=80' },
  { id: 'M03', name: 'Classic Cheeseburger', category: 'Main Course', price: 12.9, rating: 4.6, orders: 14, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=640&q=80' },
]

export const RECOMMENDED = [
  { id: 'M02', name: 'Grilled Salmon Bowl', reason: 'Loved by customers with similar taste', match: 94, price: 21.0, rating: 4.7, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=640&q=80' },
  { id: 'M12', name: 'Sweet Potato Fries', reason: 'Perfect pair with your usual burger', match: 89, price: 5.2, rating: 4.5, image: 'https://images.unsplash.com/photo-1518013431117-eb1465fa5752?auto=format&fit=crop&w=640&q=80' },
  { id: 'M11', name: 'Berry Hibiscus Cooler', reason: 'Trending in Beverages this week', match: 85, price: 5.6, rating: 4.4, image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=640&q=80' },
  { id: 'M06', name: 'Loaded Nachos', reason: 'Popular starter at Downtown Flagship', match: 82, price: 9.5, rating: 4.3, image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=640&q=80' },
]

export const CUSTOMER_PROMOS = [
  { id: 'P-01', title: '20% off Combo Meals', code: 'BUNDLE20', valid: 'Until Sep 30', minSpend: 25 },
  { id: 'P-03', title: 'Dessert Happy Hour −30%', code: 'SWEET30', valid: 'Tue & Wed 3–6 PM', minSpend: 10 },
  { id: 'P-08', title: 'Free Delivery over $30', code: 'FREESHIP', valid: 'This weekend', minSpend: 30 },
]

export const MY_REVIEWS = [
  { id: 'RV-1', item: 'Truffle Mushroom Risotto', rating: 5, date: '2026-09-21', comment: 'Absolutely fantastic — the best risotto I have had in the city.' },
  { id: 'RV-2', item: 'Cold Brew Coffee', rating: 4, date: '2026-09-12', comment: 'Smooth and strong. Wish the cup were bigger!' },
  { id: 'RV-3', item: 'Molten Chocolate Lava', rating: 5, date: '2026-09-04', comment: 'Perfect dessert. Warm, gooey center every single time.' },
]

export const CUSTOMER_ACTIVITY = [
  { time: 'Sep 25 · 19:42', text: 'Placed order ORD-8841 at Downtown Flagship', kind: 'order' },
  { time: 'Sep 25 · 19:45', text: 'Rated Truffle Mushroom Risotto 5★', kind: 'rating' },
  { time: 'Sep 21 · 13:18', text: 'Redeemed promo code BUNDLE20', kind: 'promo' },
  { time: 'Sep 17 · 20:05', text: 'Added Truffle Mushroom Risotto to favorites', kind: 'fav' },
  { time: 'Sep 12 · 12:44', text: 'Placed order ORD-8633 via mobile app', kind: 'order' },
  { time: 'Aug 29 · 18:22', text: 'Order ORD-8410 was cancelled', kind: 'alert' },
]

/* ---------------- Charts helpers ---------------- */

export const MENU_PERF_SCATTER = MENU_ITEMS.map((m) => ({
  x: m.sold,
  y: m.margin,
  z: m.revenue / 500,
  name: m.name,
  cls: m.perfClass,
}))

export const CHURN_TREND = [
  { month: 'Apr', churn: 8.2, retained: 91.8 },
  { month: 'May', churn: 7.6, retained: 92.4 },
  { month: 'Jun', churn: 8.9, retained: 91.1 },
  { month: 'Jul', churn: 7.1, retained: 92.9 },
  { month: 'Aug', churn: 6.4, retained: 93.6 },
  { month: 'Sep', churn: 5.8, retained: 94.2 },
]

export const RFM_HEATMAP = [
  { segment: 'Champions', r: 5, f: 5, m: 5 },
  { segment: 'Loyal', r: 4, f: 4, m: 4 },
  { segment: 'Potential Loyalist', r: 4, f: 3, m: 4 },
  { segment: 'New', r: 4, f: 1, m: 3 },
  { segment: 'At Risk', r: 2, f: 3, m: 3 },
  { segment: 'Hibernating', r: 2, f: 2, m: 2 },
]

export const HOURLY_SALES = [
  { hour: '10', sales: 820 }, { hour: '11', sales: 1240 }, { hour: '12', sales: 2180 },
  { hour: '13', sales: 2460 }, { hour: '14', sales: 1750 }, { hour: '15', sales: 980 },
  { hour: '16', sales: 1120 }, { hour: '17', sales: 1680 }, { hour: '18', sales: 2640 },
  { hour: '19', sales: 3320 }, { hour: '20', sales: 3010 }, { hour: '21', sales: 2140 },
  { hour: '22', sales: 1180 },
]

/* ---------------- Formatters ---------------- */

export const fmtMoney = (n: number, digits = 0) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
export const fmtNum = (n: number) => n.toLocaleString('en-US')
export const fmtPct = (n: number, digits = 1) => `${n.toFixed(digits)}%`
