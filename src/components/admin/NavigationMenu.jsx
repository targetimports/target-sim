import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from "@/components/ui/card";

const menuCategories = {
  'energy': {
    title: '⚡ Gestão de Energia',
    color: 'border-amber-500 bg-amber-50',
    items: [
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
      { name: 'Onboarding/Migração', url: 'OnboardingManager', icon: '📋' },
      { name: 'Ajustes de Crédito', url: 'CreditAdjustments', icon: '⚖️' },
      { name: 'Créditos Expirando', url: 'ExpiringCredits', icon: '⏰' },
      { name: 'Prioridades Alocação', url: 'AllocationPriorities', icon: '⭐' },
      { name: 'Central Suporte', url: 'SupportCenter', icon: '🎧' }
    ]
  },
  'operations': {
    title: '⚙️ Operações',
    color: 'border-purple-500 bg-purple-50',
    items: [
      { name: 'Gerenciar Usinas', url: 'AdminPowerPlants', icon: '🏭' },
      { name: 'Monitoramento Usinas', url: 'PlantMonitoring', icon: '📡' },
      { name: 'Manutenções', url: 'MaintenanceManagement', icon: '🔧' },
      { name: 'Contratos Proprietários', url: 'OwnerContracts', icon: '📄' },
      { name: 'Monitor Consumo', url: 'ConsumptionMonitor', icon: '📊' },
      { name: 'Ordens Serviço', url: 'AdminServiceOrders', icon: '🔨' }
    ]
  },
  'compliance': {
    title: '📑 Regulatório',
    color: 'border-slate-500 bg-slate-50',
    items: [
      { name: 'Contas de Luz', url: 'UtilityBillManager', icon: '📄' },
      { name: 'Relatórios Regulatórios', url: 'RegulatoryReports', icon: '📑' },
      { name: 'Histórico Transações', url: 'TransactionHistory', icon: '📜' },
      { name: 'Integração Distribuidoras', url: 'DistributorIntegrations', icon: '🔌' },
      { name: 'Certificados', url: 'Certificates', icon: '🏆' }
    ]
  },
  'marketing': {
    title: '📢 Marketing',
    color: 'border-pink-500 bg-pink-50',
    items: [
      { name: 'Campanhas WhatsApp', url: 'WhatsAppCampaigns', icon: '💬' },
      { name: 'WhatsApp Evolution API', url: 'WhatsAppEvolution', icon: '🟢' },
      { name: 'Gerenciar Planos', url: 'AdminPlans', icon: '📦' },
      { name: 'Chatbot', url: 'Chatbot', icon: '🤖' }
    ]
  },
  'marketplace': {
    title: '🛒 Marketplace',
    color: 'border-cyan-500 bg-cyan-50',
    items: [
      { name: 'Mercado Créditos', url: 'EnergyCreditsMarket', icon: '💹' },
      { name: 'Marketplace Créditos', url: 'CreditMarketplace', icon: '🛒' }
    ]
  },
  'analytics': {
    title: '📊 Analytics',
    color: 'border-indigo-500 bg-indigo-50',
    items: [
      { name: 'Admin Analytics', url: 'AdminAnalytics', icon: '📊' },
      { name: 'Analytics Avançado', url: 'AdvancedAnalytics', icon: '📈' },
      { name: 'Previsão Tempo', url: 'WeatherForecast', icon: '🌤️' }
    ]
  },
  'ai': {
    title: '🤖 Inteligência Artificial',
    color: 'border-violet-500 bg-violet-50',
    items: [
      { name: 'IA Inovações', url: 'AIInnovations', icon: '🤖' }
    ]
  }
};

export default function NavigationMenu({ onNavigate }) {
  const [expandedCategories, setExpandedCategories] = useState({});

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  return (
    <div className="space-y-2">
      {Object.entries(menuCategories).map(([key, category]) => (
        <Card key={key} className={`overflow-hidden ${category.color} border-l-4`}>
          <button
            onClick={() => toggleCategory(key)}
            className="w-full p-3 flex items-center justify-between hover:bg-white/50 transition-colors"
          >
            <span className="font-semibold text-sm">{category.title}</span>
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
      ))}
    </div>
  );
}

export { menuCategories };