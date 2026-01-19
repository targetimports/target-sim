import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { ArrowRight } from 'lucide-react';

const quickAccessItems = [
  {
    id: 'rateio',
    title: '⚡ Rateio de Energia',
    description: 'Alocar energia para clientes',
    url: 'EnergyAllocationManager',
    color: 'from-amber-500 to-orange-500'
  },
  {
    id: 'billing',
    title: '💳 Faturamento',
    description: 'Gerar faturas mensais',
    url: 'AutomaticBilling',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'performance',
    title: '📊 Performance',
    description: 'Dashboard de utilização',
    url: 'PerformanceDashboard',
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'credits',
    title: '💰 Saldo Créditos',
    description: 'Ver créditos clientes',
    url: 'CreditBalanceManager',
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'reconciliation',
    title: '🔄 Reconciliação',
    description: 'Verificar geração real',
    url: 'MonthlyReconciliation',
    color: 'from-indigo-500 to-blue-500'
  },
  {
    id: 'expiring',
    title: '⏰ Expirações',
    description: 'Créditos expirando',
    url: 'ExpiringCredits',
    color: 'from-red-500 to-orange-500'
  },
  {
    id: 'onboarding',
    title: '📋 Onboarding',
    description: 'Novos clientes',
    url: 'OnboardingManager',
    color: 'from-teal-500 to-cyan-500'
  },
  {
    id: 'tasks',
    title: '📊 Tarefas',
    description: 'Dashboard de tarefas',
    url: 'TaskDashboard',
    color: 'from-indigo-500 to-purple-500'
  },
  {
    id: 'crm',
    title: '🔗 CRM',
    description: 'Integrações CRM',
    url: 'CRMIntegrations',
    color: 'from-blue-500 to-purple-500'
  },
  {
    id: 'ai',
    title: '🧠 IA Insights',
    description: 'Análises preditivas',
    url: 'AIInsightsDashboard',
    color: 'from-indigo-500 to-purple-500'
  }
];

export default function QuickAccessCards({ visibleItems = quickAccessItems.map(i => i.id) }) {
  const filteredItems = visibleItems.length > 0 
    ? quickAccessItems.filter(item => visibleItems.includes(item.id))
    : quickAccessItems;

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {filteredItems.map((item) => (
        <Link key={item.url} to={createPageUrl(item.url)}>
          <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer h-full">
            <CardContent className="p-0">
              <div className={`bg-gradient-to-br ${item.color} p-4 text-white`}>
                <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                <p className="text-sm text-white/90">{item.description}</p>
              </div>
              <div className="p-4 flex items-center justify-between bg-white">
                <span className="text-sm text-slate-600">Acessar</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}