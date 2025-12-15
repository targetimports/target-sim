import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, Users, DollarSign, Zap, 
  UserCheck, UserX, Target, Leaf, ArrowLeft,
  Activity, Clock, CheckCircle
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function AdminAnalytics() {
  const { data: subscriptions = [] } = useQuery({
    queryKey: ['all-subscriptions'],
    queryFn: () => base44.entities.Subscription.list()
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['all-invoices'],
    queryFn: () => base44.entities.Invoice.list()
  });

  const { data: serviceOrders = [] } = useQuery({
    queryKey: ['all-service-orders'],
    queryFn: () => base44.entities.ServiceOrder.list()
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ['all-tickets'],
    queryFn: () => base44.entities.SupportTicket.list()
  });

  const { data: readings = [] } = useQuery({
    queryKey: ['all-readings'],
    queryFn: () => base44.entities.ConsumptionReading.list('-reading_date', 1000)
  });

  // KPIs
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.final_value || 0), 0);
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
  const churnedSubscriptions = subscriptions.filter(s => s.status === 'cancelled').length;
  const churnRate = subscriptions.length > 0 ? ((churnedSubscriptions / subscriptions.length) * 100).toFixed(1) : 0;
  const retentionRate = (100 - parseFloat(churnRate)).toFixed(1);
  const totalConsumption = readings.reduce((sum, r) => sum + (r.consumption_kwh || 0), 0);
  const co2Avoided = (totalConsumption * 0.5).toFixed(0);
  const avgTicketResolutionTime = tickets.filter(t => t.first_response_time).reduce((sum, t) => sum + t.first_response_time, 0) / tickets.filter(t => t.first_response_time).length || 0;

  // Chart Data
  const subscriptionsByStatus = [
    { name: 'Ativas', value: subscriptions.filter(s => s.status === 'active').length, color: '#f59e0b' },
    { name: 'Pendentes', value: subscriptions.filter(s => s.status === 'pending').length, color: '#eab308' },
    { name: 'Em Análise', value: subscriptions.filter(s => s.status === 'analyzing').length, color: '#3b82f6' },
    { name: 'Canceladas', value: subscriptions.filter(s => s.status === 'cancelled').length, color: '#64748b' }
  ];

  const revenueByMonth = invoices
    .reduce((acc, inv) => {
      const month = inv.reference_month || 'N/A';
      if (!acc[month]) acc[month] = 0;
      acc[month] += inv.final_value || 0;
      return acc;
    }, {});

  const revenueChartData = Object.entries(revenueByMonth)
    .map(([month, value]) => ({ month, receita: value }))
    .slice(0, 12);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold">Analytics & KPIs</h1>
              <p className="text-xs text-slate-400">Dashboard executivo com métricas principais</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Main KPIs */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center">
                  <DollarSign className="w-7 h-7 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Receita Total</p>
                  <p className="text-3xl font-bold text-slate-900">R$ {(totalRevenue / 1000).toFixed(0)}k</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                  <UserCheck className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Taxa de Retenção</p>
                  <p className="text-3xl font-bold text-slate-900">{retentionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center">
                  <UserX className="w-7 h-7 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Churn Rate</p>
                  <p className="text-3xl font-bold text-slate-900">{churnRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                  <Leaf className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">CO² Evitado</p>
                  <p className="text-3xl font-bold text-slate-900">{(co2Avoided / 1000).toFixed(1)}t</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Receita por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="receita" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Assinaturas por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={subscriptionsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {subscriptionsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-5 h-5 text-amber-500" />
                <h4 className="font-semibold text-slate-900">Consumo Total</h4>
              </div>
              <p className="text-2xl font-bold">{(totalConsumption / 1000).toFixed(1)} MWh</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h4 className="font-semibold text-slate-900">OS Concluídas</h4>
              </div>
              <p className="text-2xl font-bold">{serviceOrders.filter(o => o.status === 'completed').length}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <h4 className="font-semibold text-slate-900">Tempo Médio (Tickets)</h4>
              </div>
              <p className="text-2xl font-bold">{avgTicketResolutionTime.toFixed(0)} min</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-5 h-5 text-purple-500" />
                <h4 className="font-semibold text-slate-900">Ticket Médio</h4>
              </div>
              <p className="text-2xl font-bold">R$ {(totalRevenue / Math.max(subscriptions.length, 1)).toFixed(0)}</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}