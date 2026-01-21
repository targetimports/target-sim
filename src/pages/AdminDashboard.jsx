import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sun, Users, FileText, Zap, TrendingUp, Search,
  MoreVertical, Eye, CheckCircle, XCircle, Clock,
  Building2, Wallet, Activity, Menu, X, LayoutGrid
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import WhatsAppStatusIndicator from '../components/WhatsAppStatusIndicator';
import NavigationMenu from '../components/admin/NavigationMenu';
import QuickAccessCards from '../components/admin/QuickAccessCards';
import DashboardCustomizer from '../components/dashboard/DashboardCustomizer';
import QuickAccessCustomizer from '../components/dashboard/QuickAccessCustomizer';
import NotificationBell from '../components/notifications/NotificationBell';
import SubscriptionTrendsWidget from '../components/dashboard/widgets/SubscriptionTrendsWidget';
import RevenueChartWidget from '../components/dashboard/widgets/RevenueChartWidget';
import CustomerDistributionWidget from '../components/dashboard/widgets/CustomerDistributionWidget';
import RecentActivityWidget from '../components/dashboard/widgets/RecentActivityWidget';
import TopCustomersWidget from '../components/dashboard/widgets/TopCustomersWidget';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const queryClient = useQueryClient();

  // Widgets disponíveis
  const availableWidgets = [
    { id: 'trends', title: 'Tendência de Assinaturas', description: 'Gráfico de crescimento mensal' },
    { id: 'revenue', title: 'Receita Mensal', description: 'Faturamento por mês' },
    { id: 'distribution', title: 'Distribuição de Clientes', description: 'PF vs PJ' },
    { id: 'activity', title: 'Atividades Recentes', description: 'Últimas ações no sistema' },
    { id: 'top', title: 'Top Clientes', description: 'Maiores contas' }
  ];

  // Quick access items disponíveis
  const availableQuickAccess = [
    { id: 'rateio', title: '⚡ Rateio de Energia', description: 'Alocar energia para clientes' },
    { id: 'billing', title: '💳 Faturamento', description: 'Gerar faturas mensais' },
    { id: 'performance', title: '📊 Performance', description: 'Dashboard de utilização' },
    { id: 'credits', title: '💰 Saldo Créditos', description: 'Ver créditos clientes' },
    { id: 'reconciliation', title: '🔄 Reconciliação', description: 'Verificar geração real' },
    { id: 'expiring', title: '⏰ Expirações', description: 'Créditos expirando' },
    { id: 'onboarding', title: '📋 Onboarding', description: 'Novos clientes' },
    { id: 'tasks', title: '📊 Tarefas', description: 'Dashboard de tarefas' },
    { id: 'crm', title: '🔗 CRM', description: 'Integrações CRM' },
    { id: 'ai', title: '🧠 IA Insights', description: 'Análises preditivas' },
    { id: 'customers', title: '👥 Clientes', description: 'Gestão de clientes' },
    { id: 'plants', title: '🏭 Usinas', description: 'Gerenciar usinas' },
    { id: 'analytics', title: '📈 Analytics', description: 'Relatórios e métricas' },
    { id: 'financial', title: '💵 Financeiro', description: 'Dashboard financeiro' },
    { id: 'support', title: '🎧 Suporte', description: 'Central de suporte' },
    { id: 'documents', title: '📁 Documentos', description: 'Gerenciar documentos' },
    { id: 'automation', title: '⚡ Automações', description: 'Gestão de automações' },
    { id: 'whatsapp', title: '💬 WhatsApp', description: 'Gestão WhatsApp' },
    { id: 'sales', title: '🎯 Vendas', description: 'Funil de vendas' },
    { id: 'reports', title: '📋 Relatórios', description: 'Relatórios avançados' }
  ];

  // Buscar preferências do usuário
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: preferences } = useQuery({
    queryKey: ['dashboard-preferences', user?.email],
    queryFn: () => base44.entities.DashboardPreference.filter({ 
      user_email: user?.email,
      dashboard_type: 'admin'
    }),
    enabled: !!user?.email
  });

  const [visibleWidgets, setVisibleWidgets] = useState(['trends', 'revenue', 'distribution', 'activity', 'top']);
  const [visibleQuickAccess, setVisibleQuickAccess] = useState(['rateio', 'billing', 'performance', 'credits', 'reconciliation']);

  React.useEffect(() => {
    if (preferences?.[0]) {
      setVisibleWidgets(preferences[0].visible_widgets || ['trends', 'revenue', 'distribution', 'activity', 'top']);
      setVisibleQuickAccess(preferences[0].visible_quick_access || ['rateio', 'billing', 'performance', 'credits', 'reconciliation']);
    }
  }, [preferences]);

  // Salvar preferências
  const savePreferences = async (newVisibleWidgets) => {
    setVisibleWidgets(newVisibleWidgets);
    
    if (preferences && preferences.length > 0) {
      await base44.entities.DashboardPreference.update(preferences[0].id, {
        visible_widgets: newVisibleWidgets
      });
    } else {
      await base44.entities.DashboardPreference.create({
        user_email: user?.email,
        dashboard_type: 'admin',
        visible_widgets: newVisibleWidgets
      });
    }
    queryClient.invalidateQueries(['dashboard-preferences']);
  };

  const saveQuickAccessPreferences = async (newVisibleItems) => {
    setVisibleQuickAccess(newVisibleItems);
    
    if (preferences && preferences.length > 0) {
      await base44.entities.DashboardPreference.update(preferences[0].id, {
        visible_quick_access: newVisibleItems
      });
    } else {
      await base44.entities.DashboardPreference.create({
        user_email: user?.email,
        dashboard_type: 'admin',
        visible_quick_access: newVisibleItems
      });
    }
    queryClient.invalidateQueries(['dashboard-preferences']);
  };

  const { data: subscriptions = [], refetch: refetchSubscriptions } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: () => base44.entities.Subscription.list('-created_date', 100)
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 100)
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['admin-referrals'],
    queryFn: () => base44.entities.Referral.list('-created_date', 100)
  });

  const { data: powerPlants = [] } = useQuery({
    queryKey: ['admin-powerplants'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: () => base44.entities.SupportTicket.list('-created_date', 50)
  });

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.customer_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    pending: subscriptions.filter(s => s.status === 'pending' || s.status === 'analyzing').length,
    revenue: subscriptions.filter(s => s.status === 'active').reduce((sum, s) => sum + (s.average_bill_value || 0) * 0.15, 0)
  };

  const updateSubscriptionStatus = async (id, status) => {
    await base44.entities.Subscription.update(id, { status });
    refetchSubscriptions();
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    analyzing: 'bg-blue-100 text-blue-800',
    active: 'bg-amber-100 text-amber-900',
    suspended: 'bg-red-100 text-red-800',
    cancelled: 'bg-slate-100 text-slate-800'
  };

  const statusLabels = {
    pending: 'Pendente',
    analyzing: 'Em análise',
    active: 'Ativa',
    suspended: 'Suspensa',
    cancelled: 'Cancelada'
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-slate-900 text-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-900 to-amber-600 rounded-xl flex items-center justify-center">
                <Sun className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Target Sim - Admin</h1>
                <p className="text-xs text-slate-400">Gestão de assinaturas</p>
              </div>
              <div className="ml-4 flex items-center gap-2">
                  <WhatsAppStatusIndicator />
                </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center gap-2">
              <NotificationBell userEmail={user?.email} />
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" className="text-slate-300 hover:text-amber-400">
                    <LayoutGrid className="w-4 h-4 mr-2" />
                    Todas Funções
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[400px] sm:w-[500px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Menu de Navegação</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <NavigationMenu onNavigate={() => setSidebarOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/20" onClick={() => base44.auth.logout()}>
                Sair
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="lg:hidden text-white"
                >
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <NavigationMenu onNavigate={() => setMobileMenuOpen(false)} />
                </div>
                <div className="mt-6">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => base44.auth.logout()}
                  >
                    Sair
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            </div>
            </div>
            </header>

      <main className="container mx-auto px-4 py-8">
        {/* Quick Access */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">⚡ Acesso Rápido</h2>
            <QuickAccessCustomizer
              availableItems={availableQuickAccess}
              visibleItems={visibleQuickAccess}
              onSave={saveQuickAccessPreferences}
            />
          </div>
          <QuickAccessCards visibleItems={visibleQuickAccess} />
        </div>

        {/* Stats */}
        <h2 className="text-xl font-bold text-slate-900 mb-4">📊 Visão Geral</h2>
        
        {/* Widgets Interativos */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {visibleWidgets.includes('trends') && (
            <SubscriptionTrendsWidget subscriptions={subscriptions} />
          )}
          {visibleWidgets.includes('revenue') && (
            <RevenueChartWidget invoices={invoices} />
          )}
          {visibleWidgets.includes('distribution') && (
            <CustomerDistributionWidget subscriptions={subscriptions} />
          )}
          {visibleWidgets.includes('activity') && (
            <RecentActivityWidget 
              subscriptions={subscriptions}
              invoices={invoices}
              tickets={tickets}
            />
          )}
          {visibleWidgets.includes('top') && (
            <TopCustomersWidget subscriptions={subscriptions} />
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center">
                    <Users className="w-7 h-7 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total de assinaturas</p>
                    <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                    <Activity className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Assinaturas ativas</p>
                    <p className="text-3xl font-bold text-slate-900">{stats.active}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-yellow-100 rounded-2xl flex items-center justify-center">
                    <Clock className="w-7 h-7 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Pendentes</p>
                    <p className="text-3xl font-bold text-slate-900">{stats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center">
                    <Wallet className="w-7 h-7 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Receita estimada/mês</p>
                    <p className="text-3xl font-bold text-slate-900">R$ {stats.revenue.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <Tabs defaultValue="subscriptions" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1">
            <TabsTrigger value="subscriptions" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Assinaturas
            </TabsTrigger>
            <TabsTrigger value="referrals" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-2" />
              Indicações
            </TabsTrigger>
            <TabsTrigger value="powerplants" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Building2 className="w-4 h-4 mr-2" />
              Usinas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="subscriptions">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                  <CardTitle>Assinaturas</CardTitle>
                  <div className="flex gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        placeholder="Buscar cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="all">Todos os status</option>
                      <option value="pending">Pendente</option>
                      <option value="analyzing">Em análise</option>
                      <option value="active">Ativa</option>
                      <option value="suspended">Suspensa</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Cliente</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Tipo</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Cidade/UF</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Valor conta</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Data</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubscriptions.map((sub) => (
                        <tr key={sub.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-medium text-slate-900">{sub.customer_name}</p>
                              <p className="text-sm text-slate-500">{sub.customer_email}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant="outline">
                              {sub.customer_type === 'commercial' ? 'PJ' : 'PF'}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-slate-600">{sub.city}/{sub.state}</td>
                          <td className="py-4 px-4 font-medium">R$ {sub.average_bill_value?.toFixed(2)}</td>
                          <td className="py-4 px-4">
                            <Badge className={statusColors[sub.status]}>
                              {statusLabels[sub.status]}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-slate-500 text-sm">
                            {format(new Date(sub.created_date), 'dd/MM/yyyy')}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => updateSubscriptionStatus(sub.id, 'analyzing')}>
                                  <Eye className="w-4 h-4 mr-2" /> Em análise
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateSubscriptionStatus(sub.id, 'active')}>
                                  <CheckCircle className="w-4 h-4 mr-2" /> Aprovar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateSubscriptionStatus(sub.id, 'suspended')}>
                                  <XCircle className="w-4 h-4 mr-2" /> Suspender
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Indicações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Indicou</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Indicado</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Recompensa</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referrals.map((ref) => (
                        <tr key={ref.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-medium text-slate-900">{ref.referrer_name}</p>
                              <p className="text-sm text-slate-500">{ref.referrer_email}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-medium text-slate-900">{ref.referred_name}</p>
                              <p className="text-sm text-slate-500">{ref.referred_email}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge className={
                              ref.status === 'converted' ? 'bg-amber-100 text-amber-900' :
                              ref.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {ref.status === 'converted' ? 'Convertido' :
                               ref.status === 'contacted' ? 'Contatado' : 'Pendente'}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <span className={ref.reward_paid ? 'text-emerald-600' : 'text-slate-500'}>
                              R$ {ref.reward_amount} {ref.reward_paid ? '(Pago)' : '(Pendente)'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-500 text-sm">
                            {format(new Date(ref.created_date), 'dd/MM/yyyy')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="powerplants">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Usinas</CardTitle>
                <Link to={createPageUrl('AdminPowerPlants')}>
                  <Button>Gerenciar usinas</Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {powerPlants.map((plant) => (
                    <Card key={plant.id} className="border border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <Sun className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div>
                            <p className="font-semibold">{plant.name}</p>
                            <p className="text-sm text-slate-500">{plant.city}/{plant.state}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500">{plant.capacity_kw} kW</span>
                          <Badge className={
                            plant.status === 'operational' ? 'bg-amber-100 text-amber-900' :
                            plant.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-slate-100 text-slate-800'
                          }>
                            {plant.status === 'operational' ? 'Operacional' :
                             plant.status === 'maintenance' ? 'Manutenção' :
                             plant.status === 'under_construction' ? 'Em construção' : 'Inativa'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}