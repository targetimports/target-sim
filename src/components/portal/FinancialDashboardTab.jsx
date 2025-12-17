import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, DollarSign, PiggyBank, BarChart3 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function FinancialDashboardTab({ subscription, userEmail }) {
  const { data: invoices = [] } = useQuery({
    queryKey: ['my-invoices', userEmail],
    queryFn: () => base44.entities.MonthlyInvoice.filter({ customer_email: userEmail }),
    enabled: !!userEmail
  });

  // Resumo de faturas
  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const pendingInvoices = invoices.filter(i => i.status === 'pending');
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');

  const totalPaid = paidInvoices.reduce((sum, i) => sum + (i.final_amount || 0), 0);
  const totalPending = pendingInvoices.reduce((sum, i) => sum + (i.final_amount || 0), 0);
  const totalOverdue = overdueInvoices.reduce((sum, i) => sum + (i.final_amount || 0), 0);
  const totalSavings = invoices.reduce((sum, i) => sum + (i.discount_amount || 0), 0);

  // Dados para gráfico de pizza
  const invoiceStatusData = [
    { name: 'Pagas', value: paidInvoices.length, color: '#10b981' },
    { name: 'Pendentes', value: pendingInvoices.length, color: '#f59e0b' },
    { name: 'Vencidas', value: overdueInvoices.length, color: '#ef4444' }
  ].filter(d => d.value > 0);

  // Histórico mensal (últimos 6 meses)
  const monthlyHistory = invoices
    .slice(0, 6)
    .reverse()
    .map(inv => ({
      month: inv.month_reference,
      original: inv.original_amount || 0,
      final: inv.final_amount || 0,
      savings: inv.discount_amount || 0
    }));

  // Projeção próximos 3 meses
  const avgMonthlyBill = invoices.length > 0
    ? invoices.slice(0, 3).reduce((sum, i) => sum + (i.final_amount || 0), 0) / Math.min(3, invoices.length)
    : subscription?.average_bill_value * 0.85 || 0;

  const projectionData = [
    { month: 'Mês +1', value: avgMonthlyBill },
    { month: 'Mês +2', value: avgMonthlyBill * 1.02 },
    { month: 'Mês +3', value: avgMonthlyBill * 0.98 }
  ];

  // Comparativo de economia
  const avgOriginal = invoices.length > 0
    ? invoices.slice(0, 6).reduce((sum, i) => sum + (i.original_amount || 0), 0) / Math.min(6, invoices.length)
    : subscription?.average_bill_value || 0;

  const avgFinal = invoices.length > 0
    ? invoices.slice(0, 6).reduce((sum, i) => sum + (i.final_amount || 0), 0) / Math.min(6, invoices.length)
    : subscription?.average_bill_value * 0.85 || 0;

  const avgSavings = avgOriginal - avgFinal;
  const savingsPercentage = avgOriginal > 0 ? ((avgSavings / avgOriginal) * 100).toFixed(1) : 0;

  return (
    <div className="grid gap-6">
      {/* Cards de Resumo */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Total Pago</p>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              R$ {totalPaid.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-1">{paidInvoices.length} faturas</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Pendente</p>
              <BarChart3 className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-yellow-600">
              R$ {totalPending.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-1">{pendingInvoices.length} faturas</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Vencido</p>
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">
              R$ {totalOverdue.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-1">{overdueInvoices.length} faturas</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Economia Total</p>
              <PiggyBank className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-600">
              R$ {totalSavings.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Descontos acumulados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Gráfico de Status das Faturas */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Faturas</CardTitle>
          </CardHeader>
          <CardContent>
            {invoiceStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={invoiceStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {invoiceStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-500">
                Sem dados de faturas
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projeção de Gastos */}
        <Card>
          <CardHeader>
            <CardTitle>Projeção - Próximos 3 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                <Bar dataKey="value" fill="#8b5cf6" name="Valor Projetado" />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-500 mt-3 text-center">
              Baseado na média dos últimos 3 meses: R$ {avgMonthlyBill.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Histórico Mensal Comparativo */}
      {monthlyHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico Mensal - Conta Original vs. Com Desconto</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="original" 
                  stroke="#94a3b8" 
                  strokeWidth={2}
                  name="Conta Original"
                  strokeDasharray="5 5"
                />
                <Line 
                  type="monotone" 
                  dataKey="final" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Com Desconto"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Comparativo de Economia */}
      <Card className="border-2 border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="w-6 h-6 text-amber-600" />
            Análise de Economia Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Média Conta Tradicional</p>
              <p className="text-3xl font-bold text-slate-900">
                R$ {avgOriginal.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Sem energia solar</p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Média com Energia Solar</p>
              <p className="text-3xl font-bold text-green-600">
                R$ {avgFinal.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Com desconto aplicado</p>
            </div>

            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Economia Mensal</p>
              <p className="text-3xl font-bold text-amber-600">
                R$ {avgSavings.toFixed(2)}
              </p>
              <Badge className="bg-amber-100 text-amber-800 mt-2">
                {savingsPercentage}% de desconto
              </Badge>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-green-50 rounded-lg border-2 border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">💰 Economia Projetada (12 meses)</p>
                <p className="text-2xl font-bold text-amber-600">
                  R$ {(avgSavings * 12).toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600 mb-1">🌳 Impacto Ambiental</p>
                <p className="text-lg font-bold text-green-600">
                  {(avgSavings * 12 * 0.5).toFixed(0)} kg CO₂
                </p>
                <p className="text-xs text-slate-500">Emissões evitadas</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}