import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';

const menuCategories = {
  'energy': {
    title: '⚡ Gestão de Energia',
    color: 'border-amber-500 bg-amber-50',
    items: [
      { name: 'Dashboard Fluxo Energético', url: 'EnergyFlowDashboard', icon: '🔄' },
      { name: 'Vincular Unidades → Usinas', url: 'PowerPlantUnitsManager', icon: '🔗' },
      { name: 'Relatório Uso Mensal', url: 'MonthlyUsageReport', icon: '📊' },
      { name: 'Gestão Rateio Lei 14.300', url: 'RateioManagement', icon: '⚖️' },
      { name: 'Rateio de Energia', url: 'EnergyAllocationManager', icon: '⚡' },
      { name: 'Saldo de Créditos', url: 'CreditBalanceManager', icon: '💰' },
      { name: 'Reconciliação Mensal', url: 'MonthlyReconciliation', icon: '🔄' },
      { name: 'Capacidade Usinas', url: 'PlantCapacityManager', icon: '📊' },
      { name: 'Compensação Déficit', url: 'DeficitCompensation', icon: '⚖️' },
      { name: 'Simulador Alocação', url: 'AllocationSimulator', icon: '🧮' },
      { name: 'Dashboard Performance', url: 'PerformanceDashboard', icon: '📈' }
    ]
  },
  'financial': {
    title: '💰 Financeiro',
    color: 'border-green-500 bg-green-50',
    items: [
      { name: 'Dashboard Financeiro', url: 'FinancialDashboard', icon: '💵' },
      { name: 'Faturamento Automático', url: 'AutomaticBilling', icon: '💳' },
      { name: 'Contas Pagar/Receber', url: 'AccountsManagement', icon: '📋' },
      { name: 'Compra Energia', url: 'EnergyPurchaseManagement', icon: '🛒' },
      { name: 'Gateway Pagamento', url: 'PaymentGateway', icon: '💳' }
    ]
  },
  'customers': {
    title: '👥 Clientes',
    color: 'border-blue-500 bg-blue-50',
    items: [
      { name: 'CRM Dashboard', url: 'CRMDashboard', icon: '📊' },
      { name: 'CRM Integrações', url: 'CRMIntegrations', icon: '🔗' },
      { name: 'Gestão Clientes', url: 'CustomerManagement', icon: '👥' },
      { name: 'Gestão Assinaturas', url: 'SubscriptionManager', icon: '📋' },
      { name: 'Onboarding/Migração', url: 'OnboardingManager', icon: '📋' },
      { name: 'Ajustes de Crédito', url: 'CreditAdjustments', icon: '⚖️' },
      { name: 'Créditos Expirando', url: 'ExpiringCredits', icon: '⏰' },
      { name: 'Central Suporte', url: 'SupportCenter', icon: '🎧' },
      { name: 'Programa Fidelidade', url: 'LoyaltyProgram', icon: '⭐' },
      { name: 'Grupos Consumidores', url: 'ConsumerGroups', icon: '👨‍👩‍👧‍👦' },
      { name: 'Unidades Consumidoras', url: 'ConsumerUnitsManager', icon: '🏠' }
    ]
  },
  'operations': {
    title: '⚙️ Operações',
    color: 'border-purple-500 bg-purple-50',
    items: [
      { name: 'Gerenciar Usinas', url: 'AdminPowerPlants', icon: '🏭' },
      { name: 'Dashboard Usinas', url: 'PowerPlantDashboard', icon: '⚡' },
      { name: 'Geração Mensal', url: 'MonthlyGenerationManager', icon: '📊' },
      { name: 'Integração Solarman', url: 'SolarmanIntegration', icon: '☀️' },
      { name: 'Monitoramento Usinas', url: 'PlantMonitoring', icon: '📡' },
      { name: 'Performance Usinas', url: 'PlantPerformanceDashboard', icon: '📈' },
      { name: 'Manutenções', url: 'MaintenanceManagement', icon: '🔧' },
      { name: 'Contratos Proprietários', url: 'OwnerContracts', icon: '📄' },
      { name: 'Contratos Usinas', url: 'AdminPowerPlantContracts', icon: '📋' },
      { name: 'Monitor Consumo', url: 'ConsumptionMonitor', icon: '📊' },
      { name: 'Ordens Serviço', url: 'AdminServiceOrders', icon: '🔨' }
    ]
  },
  'compliance': {
    title: '📑 Regulatório & Documentos',
    color: 'border-slate-500 bg-slate-50',
    items: [
      { name: 'Documentação Sistema', url: 'SystemDocumentation', icon: '📖' },
      { name: 'Modelos de Fatura', url: 'InvoiceTemplateEditor', icon: '📝' },
      { name: 'Processador OCR', url: 'UtilityBillProcessor', icon: '🤖' },
      { name: 'Config. Cobranças', url: 'ChargeConfigurations', icon: '⚙️' },
      { name: 'Contas de Luz', url: 'UtilityBillManager', icon: '📄' },
      { name: 'Gerenciar Documentos', url: 'DocumentManager', icon: '📁' },
      { name: 'Dashboard Documentos', url: 'DocumentsDashboard', icon: '📊' },
      { name: 'Relatórios Regulatórios', url: 'RegulatoryReports', icon: '📑' },
      { name: 'Histórico Transações', url: 'TransactionHistory', icon: '📜' },
      { name: 'Integração Distribuidoras', url: 'DistributorIntegrations', icon: '🔌' },
      { name: 'Certificados', url: 'Certificates', icon: '🏆' }
    ]
  },
  'marketing': {
    title: '📢 Marketing & Vendas',
    color: 'border-pink-500 bg-pink-50',
    items: [
      { name: 'Funil de Vendas', url: 'SalesPipeline', icon: '🎯' },
      { name: 'Automação Leads', url: 'LeadAutomation', icon: '🤖' },
      { name: 'Campanhas WhatsApp', url: 'WhatsAppCampaigns', icon: '💬' },
      { name: 'WhatsApp Evolution API', url: 'WhatsAppEvolution', icon: '🟢' },
      { name: 'Gestão WhatsApp', url: 'WhatsAppManagement', icon: '📱' },
      { name: 'Gerenciar Planos', url: 'AdminPlans', icon: '📦' },
      { name: 'Chatbot', url: 'Chatbot', icon: '🤖' }
    ]
  },
  'marketplace': {
    title: '🛒 Marketplace',
    color: 'border-cyan-500 bg-cyan-50',
    items: [
      { name: 'Mercado Créditos', url: 'EnergyCreditsMarket', icon: '💹' },
      { name: 'Marketplace Créditos', url: 'CreditMarketplace', icon: '🛒' },
      { name: 'Dashboard Prosumer', url: 'ProsumerDashboard', icon: '⚡' },
      { name: 'Gamificação', url: 'Gamification', icon: '🎮' }
    ]
  },
  'analytics': {
    title: '📊 Analytics & Relatórios',
    color: 'border-indigo-500 bg-indigo-50',
    items: [
      { name: 'Admin Analytics', url: 'AdminAnalytics', icon: '📊' },
      { name: 'Analytics Avançado', url: 'AdvancedAnalytics', icon: '📈' },
      { name: 'Relatórios Avançados', url: 'AdvancedReports', icon: '📋' },
      { name: 'Análise Churn', url: 'ChurnPrediction', icon: '📉' },
      { name: 'Previsão Tempo', url: 'WeatherForecast', icon: '🌤️' },
      { name: 'Dashboard Tarefas', url: 'TaskDashboard', icon: '✅' },
      { name: 'Gestão Tarefas', url: 'TaskManager', icon: '📋' },
      { name: 'Automação Tarefas', url: 'TaskAutomationRules', icon: '⚡' }
    ]
  },
  'ai': {
    title: '🤖 Automação & IA',
    color: 'border-violet-500 bg-violet-50',
    items: [
      { name: 'Dashboard IA', url: 'AIInsightsDashboard', icon: '🧠' },
      { name: 'Gestão Automações', url: 'AutomationManager', icon: '⚡' },
      { name: 'Alertas Automáticos', url: 'AutomatedAlerts', icon: '🔔' },
      { name: 'Notificações', url: 'NotificationManager', icon: '📬' },
      { name: 'Central Notificações', url: 'NotificationCenter', icon: '🔔' },
      { name: 'IA Inovações', url: 'AIInnovations', icon: '🤖' }
    ]
  },
  'owners': {
    title: '👨‍💼 Usineiros',
    color: 'border-orange-500 bg-orange-50',
    items: [
      { name: 'Contratos Proprietários', url: 'OwnerContracts', icon: '📄' },
      { name: 'Pagamentos a Usineiros', url: 'OwnerPayments', icon: '💳' },
      { name: 'Histórico Pagamentos', url: 'TransactionHistory', icon: '📊' },
      { name: 'Gestão Proprietários', url: 'PlantOwnerContracts', icon: '👨‍🌾' }
    ]
  },
  'billing': {
    title: '💼 Faturamento & Gestão',
    color: 'border-emerald-500 bg-emerald-50',
    items: [
      { name: 'Faturamento Automático', url: 'AutomaticBilling', icon: '💳' },
      { name: 'Modelos de Fatura', url: 'InvoiceTemplateEditor', icon: '📝' },
      { name: 'Contas Pagar/Receber', url: 'AccountsManagement', icon: '📋' },
      { name: 'Processador OCR', url: 'UtilityBillProcessor', icon: '🤖' },
      { name: 'Contas de Luz', url: 'UtilityBillManager', icon: '📄' }
    ]
  }
};

export default function NavigationMenu({ onNavigate }) {
  const [expandedCategories, setExpandedCategories] = useState({});
  const [menuOrder, setMenuOrder] = useState(Object.keys(menuCategories));
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadPreferences = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      if (currentUser?.email) {
        const prefs = await base44.entities.DashboardPreference.filter({ 
          user_email: currentUser.email,
          dashboard_type: 'admin'
        });
        
        if (prefs && prefs.length > 0 && prefs[0].menu_order) {
          setMenuOrder(prefs[0].menu_order);
        }
      }
    };
    
    loadPreferences();
  }, []);

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleDragEnd = async (result) => {
    const { source, destination } = result;
    
    if (!destination) return;
    if (source.index === destination.index) return;

    const newOrder = Array.from(menuOrder);
    const [moved] = newOrder.splice(source.index, 1);
    newOrder.splice(destination.index, 0, moved);
    
    setMenuOrder(newOrder);
    
    // Salvar preferências
    if (user?.email) {
      const prefs = await base44.entities.DashboardPreference.filter({ 
        user_email: user.email,
        dashboard_type: 'admin'
      });
      
      if (prefs && prefs.length > 0) {
        await base44.entities.DashboardPreference.update(prefs[0].id, { menu_order: newOrder });
      } else {
        await base44.entities.DashboardPreference.create({
          user_email: user.email,
          dashboard_type: 'admin',
          menu_order: newOrder
        });
      }
    }
  };

  const saveOrder = async () => {
    if (user?.email) {
      const prefs = await base44.entities.DashboardPreference.filter({ 
        user_email: user.email,
        dashboard_type: 'admin'
      });
      
      if (prefs && prefs.length > 0) {
        await base44.entities.DashboardPreference.update(prefs[0].id, { menu_order: menuOrder });
      } else {
        await base44.entities.DashboardPreference.create({
          user_email: user.email,
          dashboard_type: 'admin',
          menu_order: menuOrder
        });
      }
    }
  };

  return (
    <>
      <Button onClick={saveOrder} className="w-full mb-2 bg-amber-500 hover:bg-amber-600">
        💾 Salvar Ordem dos Menus
      </Button>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="menu-categories">
          {(provided, snapshot) => (
            <div 
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2"
            >
            {menuOrder.map((key, index) => {
              const category = menuCategories[key];
              if (!category) return null;
              
              return (
                <Draggable key={key} draggableId={key} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={snapshot.isDragging ? 'opacity-50' : ''}
                    >
                      <Card className={`overflow-hidden ${category.color} border-l-4`}>
                        <button
                          {...provided.dragHandleProps}
                          onClick={() => toggleCategory(key)}
                          className="w-full p-3 flex items-center justify-between hover:bg-white/50 transition-colors cursor-move"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <GripVertical className="w-4 h-4 text-slate-400" />
                            <span className="font-semibold text-sm">{category.title}</span>
                          </div>
                          {expandedCategories[key] ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        
                        {expandedCategories[key] && (
                          <div className="bg-white/60 border-t">
                            {category.items.map((item) => (
                              <Link
                                key={item.url}
                                to={createPageUrl(item.url)}
                                onClick={onNavigate}
                                className="block px-4 py-2 text-sm hover:bg-white/80 transition-colors"
                              >
                                {item.icon} {item.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </Card>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
    </>
  );
}

export { menuCategories };