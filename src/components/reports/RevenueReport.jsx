import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSign, TrendingUp, CreditCard, Wallet } from 'lucide-react';

export default function RevenueReport({ invoices, subscriptions }) {
  // Métricas principais
  const totalRevenue = invoices.reduce((sum, i) => sum + (i.final_amount || 0), 0);
  const paidRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.final_amount || 0), 0);
  const pendingRevenue = invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + (i.final_amount || 0), 0);
  const overdueRevenue = invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + (i.final_amount || 0), 0);

  // Receita por mês
  const monthlyRevenue = invoices.reduce((acc, inv) => {
    const month = inv.month_reference || new Date(inv.created_date).toISOString().substring(0, 7);
    if (!acc[month]) {
      acc[month] = { month, total: 0, paid: 0, pending: 0, discount: 0 };
    }
    acc[month].total += inv.final_amount || 0;
    if (inv.status === 'paid') acc[month].paid += inv.final_amount || 0;
    if (inv.status === 'pending') acc[month].pending += inv.final_amount || 0;
    acc[month].discount += inv.discount_amount || 0;
    return acc;
  }, {});

  const revenueData = Object.values(monthlyRevenue).sort((a, b) => a.month.localeCompare(b.month));

  // MRR (Monthly Recurring Revenue)
  const mrr = subscriptions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + ((s.average_bill_value || 0) * (s.discount_percentage || 15) / 100), 0);

  // Receita por tipo de cliente
  const revenueByType = invoices.reduce((acc, inv) => {
    const subscription = subscriptions.find(s => s.customer_email === inv.customer_email);
    const type = subscription?.customer_type || 'unknown';
    if (!acc[type]) acc[type] = 0;
    acc[type] += inv.final_amount || 0;
    return acc;
  }, {});

  const typeData = Object.entries(revenueByType).map(([type, amount]) => ({
    type: type === 'residential' ? 'Residencial' : type === 'commercial' ? 'Comercial' : 'Outros',
    amount
  }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Receita Total</p>
                <p className="text-2xl font-bold text-green-600">R$ {totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Recebido</p>
                <p className="text-2xl font-bold text-blue-600">R$ {paidRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pendente</p>
                <p className="text-2xl font-bold text-yellow-600">R$ {pendingRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">MRR</p>
                <p className="text-2xl font-bold text-purple-600">R$ {mrr.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evolução de Receita */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução da Receita</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
              <Legend />
              <Area type="monotone" dataKey="paid" stackId="1" stroke="#10b981" fill="#10b981" name="Recebido" />
              <Area type="monotone" dataKey="pending" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Pendente" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Receita e Desconto por Mês */}
      <Card>
        <CardHeader>
          <CardTitle>Receita vs Descontos</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="total" fill="#3b82f6" name="Receita Total" />
              <Bar dataKey="discount" fill="#ef4444" name="Descontos" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Receita por Tipo */}
      <Card>
        <CardHeader>
          <CardTitle>Receita por Tipo de Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={typeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="type" type="category" />
              <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
              <Bar dataKey="amount" fill="#8b5cf6" name="Receita" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Faturas em Atraso */}
      {overdueRevenue > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">⚠️ Faturas em Atraso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-red-900">Valor Total em Atraso</span>
                <span className="text-2xl font-bold text-red-600">R$ {overdueRevenue.toFixed(2)}</span>
              </div>
              <div className="space-y-2">
                {invoices
                  .filter(i => i.status === 'overdue')
                  .slice(0, 5)
                  .map((inv) => (
                    <div key={inv.id} className="flex justify-between items-center p-2 bg-white rounded">
                      <span className="text-sm">{inv.customer_email}</span>
                      <span className="font-medium text-red-600">R$ {inv.final_amount?.toFixed(2)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}