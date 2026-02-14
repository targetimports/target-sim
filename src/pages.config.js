/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AIInnovations from './pages/AIInnovations';
import AIInsightsDashboard from './pages/AIInsightsDashboard';
import AccountsManagement from './pages/AccountsManagement';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminDashboard from './pages/AdminDashboard';
import AdminPlans from './pages/AdminPlans';
import AdminPowerPlantContracts from './pages/AdminPowerPlantContracts';
import AdminPowerPlants from './pages/AdminPowerPlants';
import AdminServiceOrders from './pages/AdminServiceOrders';
import AdvancedAnalytics from './pages/AdvancedAnalytics';
import AdvancedReports from './pages/AdvancedReports';
import AllocationSimulator from './pages/AllocationSimulator';
import AutomatedAlerts from './pages/AutomatedAlerts';
import AutomaticBilling from './pages/AutomaticBilling';
import AutomationManager from './pages/AutomationManager';
import CRMDashboard from './pages/CRMDashboard';
import CRMIntegrations from './pages/CRMIntegrations';
import Certificates from './pages/Certificates';
import ChargeConfigurations from './pages/ChargeConfigurations';
import Chatbot from './pages/Chatbot';
import ChurnPrediction from './pages/ChurnPrediction';
import ConsumerGroups from './pages/ConsumerGroups';
import ConsumerUnitsManager from './pages/ConsumerUnitsManager';
import ConsumptionMonitor from './pages/ConsumptionMonitor';
import ContractManagement from './pages/ContractManagement';
import CreditAdjustments from './pages/CreditAdjustments';
import CreditBalanceManager from './pages/CreditBalanceManager';
import CreditMarketplace from './pages/CreditMarketplace';
import CreditSystem from './pages/CreditSystem';
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerDetails from './pages/CustomerDetails';
import CustomerManagement from './pages/CustomerManagement';
import CustomerPortal from './pages/CustomerPortal';
import DeficitCompensation from './pages/DeficitCompensation';
import DistributorIntegrations from './pages/DistributorIntegrations';
import DocumentManager from './pages/DocumentManager';
import DocumentsDashboard from './pages/DocumentsDashboard';
import EnergyAllocationManager from './pages/EnergyAllocationManager';
import EnergyCreditsMarket from './pages/EnergyCreditsMarket';
import EnergyFlowDashboard from './pages/EnergyFlowDashboard';
import EnergyPurchaseManagement from './pages/EnergyPurchaseManagement';
import ExpiringCredits from './pages/ExpiringCredits';
import FinancialDashboard from './pages/FinancialDashboard';
import Gamification from './pages/Gamification';
import Home from './pages/Home';
import InvoiceTemplateEditor from './pages/InvoiceTemplateEditor';
import LeadAutomation from './pages/LeadAutomation';
import LoyaltyProgram from './pages/LoyaltyProgram';
import MaintenanceManagement from './pages/MaintenanceManagement';
import MonthlyGenerationManager from './pages/MonthlyGenerationManager';
import MonthlyReconciliation from './pages/MonthlyReconciliation';
import MonthlyUsageReport from './pages/MonthlyUsageReport';
import NotificationCenter from './pages/NotificationCenter';
import NotificationManager from './pages/NotificationManager';
import OnboardingManager from './pages/OnboardingManager';
import OwnerContracts from './pages/OwnerContracts';
import PaymentGateway from './pages/PaymentGateway';
import PerformanceDashboard from './pages/PerformanceDashboard';
import PlantCapacityManager from './pages/PlantCapacityManager';
import PlantMonitoring from './pages/PlantMonitoring';
import PlantOwnerContracts from './pages/PlantOwnerContracts';
import PlantPerformanceDashboard from './pages/PlantPerformanceDashboard';
import PowerPlantDashboard from './pages/PowerPlantDashboard';
import PowerPlantManager from './pages/PowerPlantManager';
import PowerPlantUnitsManager from './pages/PowerPlantUnitsManager';
import ProsumerDashboard from './pages/ProsumerDashboard';
import RateioManagement from './pages/RateioManagement';
import RegulatoryReports from './pages/RegulatoryReports';
import SalesPipeline from './pages/SalesPipeline';
import ServiceOrders from './pages/ServiceOrders';
import SolarmanIntegration from './pages/SolarmanIntegration';
import Subscribe from './pages/Subscribe';
import SubscriptionImport from './pages/SubscriptionImport';
import SubscriptionManager from './pages/SubscriptionManager';
import SuperApp from './pages/SuperApp';
import SupportCenter from './pages/SupportCenter';
import SystemDocumentation from './pages/SystemDocumentation';
import SystemMap from './pages/SystemMap';
import TaskAutomationRules from './pages/TaskAutomationRules';
import TaskDashboard from './pages/TaskDashboard';
import TaskManager from './pages/TaskManager';
import TransactionHistory from './pages/TransactionHistory';
import UtilityBillManager from './pages/UtilityBillManager';
import UtilityBillProcessor from './pages/UtilityBillProcessor';
import WeatherForecast from './pages/WeatherForecast';
import WhatsAppCampaigns from './pages/WhatsAppCampaigns';
import WhatsAppEvolution from './pages/WhatsAppEvolution';
import WhatsAppManagement from './pages/WhatsAppManagement';
import DeyeIntegration from './pages/DeyeIntegration';
import DeyeConfiguration from './pages/DeyeConfiguration';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIInnovations": AIInnovations,
    "AIInsightsDashboard": AIInsightsDashboard,
    "AccountsManagement": AccountsManagement,
    "AdminAnalytics": AdminAnalytics,
    "AdminDashboard": AdminDashboard,
    "AdminPlans": AdminPlans,
    "AdminPowerPlantContracts": AdminPowerPlantContracts,
    "AdminPowerPlants": AdminPowerPlants,
    "AdminServiceOrders": AdminServiceOrders,
    "AdvancedAnalytics": AdvancedAnalytics,
    "AdvancedReports": AdvancedReports,
    "AllocationSimulator": AllocationSimulator,
    "AutomatedAlerts": AutomatedAlerts,
    "AutomaticBilling": AutomaticBilling,
    "AutomationManager": AutomationManager,
    "CRMDashboard": CRMDashboard,
    "CRMIntegrations": CRMIntegrations,
    "Certificates": Certificates,
    "ChargeConfigurations": ChargeConfigurations,
    "Chatbot": Chatbot,
    "ChurnPrediction": ChurnPrediction,
    "ConsumerGroups": ConsumerGroups,
    "ConsumerUnitsManager": ConsumerUnitsManager,
    "ConsumptionMonitor": ConsumptionMonitor,
    "ContractManagement": ContractManagement,
    "CreditAdjustments": CreditAdjustments,
    "CreditBalanceManager": CreditBalanceManager,
    "CreditMarketplace": CreditMarketplace,
    "CreditSystem": CreditSystem,
    "CustomerDashboard": CustomerDashboard,
    "CustomerDetails": CustomerDetails,
    "CustomerManagement": CustomerManagement,
    "CustomerPortal": CustomerPortal,
    "DeficitCompensation": DeficitCompensation,
    "DistributorIntegrations": DistributorIntegrations,
    "DocumentManager": DocumentManager,
    "DocumentsDashboard": DocumentsDashboard,
    "EnergyAllocationManager": EnergyAllocationManager,
    "EnergyCreditsMarket": EnergyCreditsMarket,
    "EnergyFlowDashboard": EnergyFlowDashboard,
    "EnergyPurchaseManagement": EnergyPurchaseManagement,
    "ExpiringCredits": ExpiringCredits,
    "FinancialDashboard": FinancialDashboard,
    "Gamification": Gamification,
    "Home": Home,
    "InvoiceTemplateEditor": InvoiceTemplateEditor,
    "LeadAutomation": LeadAutomation,
    "LoyaltyProgram": LoyaltyProgram,
    "MaintenanceManagement": MaintenanceManagement,
    "MonthlyGenerationManager": MonthlyGenerationManager,
    "MonthlyReconciliation": MonthlyReconciliation,
    "MonthlyUsageReport": MonthlyUsageReport,
    "NotificationCenter": NotificationCenter,
    "NotificationManager": NotificationManager,
    "OnboardingManager": OnboardingManager,
    "OwnerContracts": OwnerContracts,
    "PaymentGateway": PaymentGateway,
    "PerformanceDashboard": PerformanceDashboard,
    "PlantCapacityManager": PlantCapacityManager,
    "PlantMonitoring": PlantMonitoring,
    "PlantOwnerContracts": PlantOwnerContracts,
    "PlantPerformanceDashboard": PlantPerformanceDashboard,
    "PowerPlantDashboard": PowerPlantDashboard,
    "PowerPlantManager": PowerPlantManager,
    "PowerPlantUnitsManager": PowerPlantUnitsManager,
    "ProsumerDashboard": ProsumerDashboard,
    "RateioManagement": RateioManagement,
    "RegulatoryReports": RegulatoryReports,
    "SalesPipeline": SalesPipeline,
    "ServiceOrders": ServiceOrders,
    "SolarmanIntegration": SolarmanIntegration,
    "Subscribe": Subscribe,
    "SubscriptionImport": SubscriptionImport,
    "SubscriptionManager": SubscriptionManager,
    "SuperApp": SuperApp,
    "SupportCenter": SupportCenter,
    "SystemDocumentation": SystemDocumentation,
    "SystemMap": SystemMap,
    "TaskAutomationRules": TaskAutomationRules,
    "TaskDashboard": TaskDashboard,
    "TaskManager": TaskManager,
    "TransactionHistory": TransactionHistory,
    "UtilityBillManager": UtilityBillManager,
    "UtilityBillProcessor": UtilityBillProcessor,
    "WeatherForecast": WeatherForecast,
    "WhatsAppCampaigns": WhatsAppCampaigns,
    "WhatsAppEvolution": WhatsAppEvolution,
    "WhatsAppManagement": WhatsAppManagement,
    "DeyeIntegration": DeyeIntegration,
    "DeyeConfiguration": DeyeConfiguration,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};