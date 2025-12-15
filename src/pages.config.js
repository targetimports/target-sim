import Home from './pages/Home';
import Subscribe from './pages/Subscribe';
import CustomerDashboard from './pages/CustomerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminPlans from './pages/AdminPlans';
import AdminPowerPlants from './pages/AdminPowerPlants';
import ConsumptionMonitor from './pages/ConsumptionMonitor';
import SupportCenter from './pages/SupportCenter';
import ServiceOrders from './pages/ServiceOrders';
import AdminServiceOrders from './pages/AdminServiceOrders';
import AdminAnalytics from './pages/AdminAnalytics';
import CreditSystem from './pages/CreditSystem';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Subscribe": Subscribe,
    "CustomerDashboard": CustomerDashboard,
    "AdminDashboard": AdminDashboard,
    "AdminPlans": AdminPlans,
    "AdminPowerPlants": AdminPowerPlants,
    "ConsumptionMonitor": ConsumptionMonitor,
    "SupportCenter": SupportCenter,
    "ServiceOrders": ServiceOrders,
    "AdminServiceOrders": AdminServiceOrders,
    "AdminAnalytics": AdminAnalytics,
    "CreditSystem": CreditSystem,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};