import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, TrendingUp, TrendingDown, CreditCard, 
  Wallet, PieChart, Calendar, AlertCircle, ArrowLeft
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, BarChart, Bar, PieChart as RPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";

export default function FinancialDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');

  const { data: transactions = [] } = useQuery({
    queryKey: ['financial-transactions'],
    queryFn: () => base44.entities.FinancialTransaction.list('-transaction_date', 500)
  });

  const { data: payables = [] } = useQuery({
    queryKey: ['accounts-payable'],
    queryFn: () => base44.entities.AccountsPayable.list('-due_date', 200)
  });

  const { data: receivables = [] } = useQuery({
    queryKey: ['accounts-receivable'],
    queryFn: () => base44.entities.AccountsReceivable.list('-due_date', 200)
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['energy-purchases'],
    queryFn: () => base44.entities.EnergyPurchase.list('-created_date', 200)
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-financial'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 200)
  });

  // Calculate metrics
  const revenue = transactions.filter(t => t.transaction_type === 'revenue').reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions.filter(t => t.transaction_type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const profit = revenue - expenses;
  const profitMargin = revenue > 0 ? ((profit / revenue) * 100) : 0;

  const pendingPayables = payables.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const pendingReceivables = receivables.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);
  const overduePayables = payables.filter(p => p.status === 'overdue').length;
  const overdueReceivables = receivables.filter(r => r.status === 'overdue').length;

  // Monthly data
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const monthStr = format(date, 'yyyy-MM');
    const monthRevenue = transactions.filter(t => 
      t.transaction_type === 'revenue' && 
      t.transaction_date?.startsWith(monthStr)
    ).reduce((sum, t) => sum + t.amount, 0);
    const monthExpenses = transactions.filter(t => 
      t.transaction_type === 'expense' && 
      t.transaction_date?.startsWith(monthStr)
    ).reduce((sum, t) => sum + t.amount, 0);
    return {
      month: format(date, 'MMM/yy'),
      receita: monthRevenue,
      despesa: monthExpenses,
      lucro: monthRevenue - monthExpenses
    };
  });

  // Expense categories
  const expensesByCategory = transactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const categoryData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name: name === 'energy_purchase' ? 'Compra de Energia' :
          name === 'operational' ? 'Operacional' :
          name === 'marketing' ? 'Marketing' :
          name === 'administrative' ? 'Administrativo' :
          name === 'infrastructure' ? 'Infraestrutura' : 'Outros',
    value
  }));

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Gestão Financeira</h1>
                <p className="text-amber-400 text-sm">ERP e controle completo de receitas e despesas</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link to={createPageUrl('EnergyPurchaseManagement')}>
                <Button variant="outline" className="border-white/20 text-white">
                  Compra de Energia
                </Button>
              </Link>
              <Link to={createPageUrl('AccountsManagement')}>
                <Button variant="outline" className="border-white/20 text-white">
                  Contas a Pagar/Receber
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* KPIs */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-green-100">Receita Total</p>
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-3xl font-bold">R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-red-500 to-rose-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-red-100">Despesas Total</p>
                <TrendingDown className="w-5 h-5" />
              </div>
              <p className="text-3xl font-bold">R$ {expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-800 to-slate-900 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-amber-200">Lucro Líquido</p>
                <DollarSign className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-3xl font-bold text-amber-400">R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-sm text-slate-300 mt-1">Margem: {profitMargin.toFixed(1)}%</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-blue-100">Fluxo de Caixa</p>
                <Wallet className="w-5 h-5" />
              </div>
              <p className="text-3xl font-bold">R$ {(pendingReceivables - pendingPayables).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {(overduePayables > 0 || overdueReceivables > 0) && (
          <Card className="border-0 shadow-sm mb-8 bg-red-50 border-l-4 border-red-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <div>
                  <p className="font-semibold text-red-900">Atenção: Contas em atraso</p>
                  <p className="text-sm text-red-700">
                    {overduePayables > 0 && `${overduePayables} conta(s) a pagar vencida(s)`}
                    {overduePayables > 0 && overdueReceivables > 0 && ' • '}
                    {overdueReceivables > 0 && `${overdueReceivables} conta(s) a receber vencida(s)`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="revenue">Receitas</TabsTrigger>
            <TabsTrigger value="expenses">Despesas</TabsTrigger>
            <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Evolução Financeira (6 meses)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="receita" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Receita" />
                      <Area type="monotone" dataKey="despesa" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Despesa" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Despesas por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RPieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Contas a Receber</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-600">Pendente</span>
                      <span className="font-bold text-slate-900">R$ {pendingReceivables.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-green-700">Recebido</span>
                      <span className="font-bold text-green-700">
                        R$ {receivables.filter(r => r.status === 'received').reduce((sum, r) => sum + r.amount, 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="text-red-700">Atrasado</span>
                      <span className="font-bold text-red-700">{overdueReceivables}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Contas a Pagar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-600">Pendente</span>
                      <span className="font-bold text-slate-900">R$ {pendingPayables.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-green-700">Pago</span>
                      <span className="font-bold text-green-700">
                        R$ {payables.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="text-red-700">Atrasado</span>
                      <span className="font-bold text-red-700">{overduePayables}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="revenue">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Receitas Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactions.filter(t => t.transaction_type === 'revenue').slice(0, 20).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div>
                        <p className="font-medium text-slate-900">{tx.description}</p>
                        <p className="text-sm text-slate-500">
                          {tx.category === 'client_subscription' ? 'Assinatura Cliente' : tx.category} • 
                          {tx.transaction_date && format(new Date(tx.transaction_date), ' dd/MM/yyyy')}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-green-600">+ R$ {tx.amount.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Despesas Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactions.filter(t => t.transaction_type === 'expense').slice(0, 20).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div>
                        <p className="font-medium text-slate-900">{tx.description}</p>
                        <p className="text-sm text-slate-500">
                          {tx.category === 'energy_purchase' ? 'Compra de Energia' :
                           tx.category === 'operational' ? 'Operacional' :
                           tx.category === 'marketing' ? 'Marketing' : tx.category} • 
                          {tx.transaction_date && format(new Date(tx.transaction_date), ' dd/MM/yyyy')}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-red-600">- R$ {tx.amount.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cashflow">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Lucro Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="lucro" fill="#f59e0b" name="Lucro" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}