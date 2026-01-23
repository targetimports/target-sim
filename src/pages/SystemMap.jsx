import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Zap, Users, Building2, FileText, TrendingUp, Bell, MessageSquare, 
  Settings, DollarSign, BarChart3, Calendar, Wrench, Shield, 
  Database, Plug, Bot, Sun, MapPin, Home, ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion";
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';

export default function SystemMap() {
  const [selectedCategory, setSelectedCategory] = useState(null);

  const mapData = {
    core: {
      title: "Núcleo do Sistema",
      icon: Database,
      color: "bg-blue-500",
      items: [
        { name: "Clientes", icon: Users, route: "CustomerManagement", entities: ["Customer"] },
        { name: "Usinas", icon: Sun, route: "AdminPowerPlants", entities: ["PowerPlant", "PlantOwner", "OwnerContract"] },
        { name: "Unidades Consumidoras", icon: Building2, route: "ConsumerUnitsManager", entities: ["ConsumerUnit"] },
        { name: "Assinaturas", icon: FileText, route: "SubscriptionManager", entities: ["Subscription", "PowerPlantContract"] },
      ]
    },
    financial: {
      title: "Financeiro",
      icon: DollarSign,
      color: "bg-green-500",
      items: [
        { name: "Faturas", icon: FileText, route: "UtilityBillManager", entities: ["UtilityBill", "MonthlyInvoice"] },
        { name: "Contas a Pagar", icon: TrendingUp, route: "AccountsManagement", entities: ["AccountsPayable", "OwnerPayment"] },
        { name: "Contas a Receber", icon: DollarSign, route: "AccountsManagement", entities: ["AccountsReceivable", "Payment"] },
        { name: "Créditos de Energia", icon: Zap, route: "CreditBalanceManager", entities: ["EnergyCredit", "CreditBalance", "CreditTransaction"] },
        { name: "Transações", icon: BarChart3, route: "TransactionHistory", entities: ["FinancialTransaction"] },
      ]
    },
    operations: {
      title: "Operações",
      icon: Settings,
      color: "bg-orange-500",
      items: [
        { name: "Alocação de Energia", icon: Zap, route: "EnergyAllocationManager", entities: ["EnergyAllocation"] },
        { name: "Rateio Mensal", icon: Calendar, route: "RateioManagement", entities: ["MonthlyReconciliation"] },
        { name: "Monitoramento", icon: BarChart3, route: "PlantMonitoring", entities: ["PowerPlantProduction", "PlantPerformance"] },
        { name: "Ordens de Serviço", icon: Wrench, route: "AdminServiceOrders", entities: ["ServiceOrder"] },
        { name: "Manutenção", icon: Wrench, route: "MaintenanceManagement", entities: ["MaintenanceSchedule", "PredictiveMaintenance"] },
      ]
    },
    crm: {
      title: "CRM & Vendas",
      icon: Users,
      color: "bg-purple-500",
      items: [
        { name: "Leads", icon: Users, route: "SalesPipeline", entities: ["SalesLead"] },
        { name: "Tarefas", icon: FileText, route: "TaskManager", entities: ["Task", "TaskAutomationRule"] },
        { name: "Automações", icon: Bot, route: "AutomationManager", entities: ["Automation"] },
        { name: "Programa de Fidelidade", icon: Shield, route: "LoyaltyProgram", entities: ["LoyaltyProgram", "Referral"] },
        { name: "Previsão de Churn", icon: TrendingUp, route: "ChurnPrediction", entities: ["ChurnPrediction"] },
      ]
    },
    communication: {
      title: "Comunicação",
      icon: MessageSquare,
      color: "bg-pink-500",
      items: [
        { name: "WhatsApp", icon: MessageSquare, route: "WhatsAppEvolution", entities: ["WhatsAppSession", "WhatsAppMessage"] },
        { name: "Campanhas", icon: Bell, route: "WhatsAppCampaigns", entities: ["WhatsAppCampaign"] },
        { name: "Notificações", icon: Bell, route: "NotificationManager", entities: ["SystemNotification", "AutomatedAlert"] },
        { name: "Suporte", icon: MessageSquare, route: "SupportCenter", entities: ["SupportTicket"] },
        { name: "Templates", icon: FileText, route: "InvoiceTemplateEditor", entities: ["InvoiceTemplate", "MessageTemplate"] },
      ]
    },
    integrations: {
      title: "Integrações",
      icon: Plug,
      color: "bg-cyan-500",
      items: [
        { name: "Solarman", icon: Sun, route: "SolarmanIntegration", entities: ["SolarmanIntegration"] },
        { name: "Distribuidoras", icon: Building2, route: "DistributorIntegrations", entities: ["DistributorIntegration"] },
        { name: "CRM Externo", icon: Users, route: "CRMIntegrations", entities: ["CRMIntegration", "CRMSyncLog"] },
        { name: "WhatsApp Evolution", icon: MessageSquare, route: "WhatsAppEvolution", entities: ["EvolutionConfig"] },
      ]
    },
    analytics: {
      title: "Analytics & BI",
      icon: BarChart3,
      color: "bg-indigo-500",
      items: [
        { name: "Dashboard Admin", icon: BarChart3, route: "AdminDashboard", entities: ["DashboardPreference"] },
        { name: "Relatórios", icon: FileText, route: "AdvancedReports", entities: ["AutomatedReport"] },
        { name: "Analytics", icon: TrendingUp, route: "AdminAnalytics", entities: [] },
        { name: "Insights AI", icon: Bot, route: "AIInsightsDashboard", entities: [] },
        { name: "Performance Usinas", icon: Sun, route: "PlantPerformanceDashboard", entities: ["PlantPerformance"] },
      ]
    },
    portal: {
      title: "Portal do Cliente",
      icon: Users,
      color: "bg-teal-500",
      items: [
        { name: "Dashboard Cliente", icon: BarChart3, route: "CustomerPortal", entities: [] },
        { name: "Documentos", icon: FileText, route: "DocumentsDashboard", entities: ["Document"] },
        { name: "Suporte", icon: MessageSquare, route: "SupportCenter", entities: ["SupportTicket"] },
        { name: "Gamificação", icon: Shield, route: "Gamification", entities: ["Achievement", "Certificate"] },
      ]
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to={createPageUrl('AdminDashboard')}>
            <Button variant="ghost" className="mb-4">
              <Home className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Mapa Mental do Sistema</h1>
          <p className="text-slate-600">Visão geral da arquitetura e funcionalidades da plataforma</p>
        </div>

        {/* Central Hub */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-12"
        >
          <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white border-0 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <Zap className="w-16 h-16 mx-auto mb-4" />
              <CardTitle className="text-3xl">Sistema de Gestão de Energia Solar</CardTitle>
              <p className="text-blue-100 mt-2">Plataforma completa para gerenciamento de usinas solares e energia distribuída</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
                  <Database className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-2xl font-bold">50+</div>
                  <div className="text-sm text-blue-100">Entidades</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
                  <Settings className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-2xl font-bold">8</div>
                  <div className="text-sm text-blue-100">Módulos</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
                  <Plug className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-2xl font-bold">4</div>
                  <div className="text-sm text-blue-100">Integrações</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
                  <Bot className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-2xl font-bold">AI</div>
                  <div className="text-sm text-blue-100">Powered</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(mapData).map(([key, category], idx) => {
            const Icon = category.icon;
            return (
              <motion.div
                key={key}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card 
                  className="hover:shadow-xl transition-all cursor-pointer border-2 hover:border-blue-300"
                  onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                >
                  <CardHeader className="pb-3">
                    <div className={`w-12 h-12 rounded-lg ${category.color} flex items-center justify-center mb-3`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-lg flex items-center justify-between">
                      {category.title}
                      <ChevronRight className={`w-5 h-5 transition-transform ${selectedCategory === key ? 'rotate-90' : ''}`} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Badge variant="outline" className="mb-3">
                      {category.items.length} funcionalidades
                    </Badge>
                    
                    {selectedCategory === key && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="space-y-2 pt-3 border-t"
                      >
                        {category.items.map((item, itemIdx) => {
                          const ItemIcon = item.icon;
                          return (
                            <Link 
                              key={itemIdx}
                              to={createPageUrl(item.route)}
                              className="flex items-center gap-2 p-2 rounded hover:bg-slate-100 transition-colors group"
                            >
                              <ItemIcon className="w-4 h-4 text-slate-600 group-hover:text-blue-600" />
                              <span className="text-sm text-slate-700 group-hover:text-blue-700">{item.name}</span>
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Fluxo Principal */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-6 h-6" />
                Fluxo Principal do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {[
                  { label: "1. Cadastro", desc: "Cliente e UCs", icon: Users, color: "bg-blue-500" },
                  { label: "2. Alocação", desc: "Vincular Usina", icon: Zap, color: "bg-yellow-500" },
                  { label: "3. Monitoramento", desc: "Geração Real", icon: BarChart3, color: "bg-green-500" },
                  { label: "4. Rateio", desc: "Distribuição kWh", icon: Calendar, color: "bg-orange-500" },
                  { label: "5. Faturamento", desc: "Cobrança", icon: DollarSign, color: "bg-purple-500" },
                  { label: "6. Comunicação", desc: "WhatsApp/Email", icon: MessageSquare, color: "bg-pink-500" },
                ].map((step, idx) => {
                  const StepIcon = step.icon;
                  return (
                    <React.Fragment key={idx}>
                      <div className="flex flex-col items-center text-center">
                        <div className={`w-16 h-16 rounded-full ${step.color} flex items-center justify-center mb-2 shadow-lg`}>
                          <StepIcon className="w-8 h-8 text-white" />
                        </div>
                        <div className="font-semibold text-sm">{step.label}</div>
                        <div className="text-xs text-slate-600">{step.desc}</div>
                      </div>
                      {idx < 5 && (
                        <ChevronRight className="hidden md:block w-6 h-6 text-slate-400" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Legenda */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Clique em cada módulo para ver as funcionalidades detalhadas</p>
        </div>
      </div>
    </div>
  );
}