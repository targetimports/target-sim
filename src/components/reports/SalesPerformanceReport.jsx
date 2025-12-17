import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Users, DollarSign, Target } from 'lucide-react';

export default function SalesPerformanceReport({ subscriptions, referrals }) {
  // Métricas principais
  const totalSubscriptions = subscriptions.length;
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
  const conversionRate = ((activeSubscriptions / totalSubscriptions) * 100).toFixed(1);
  const avgValue = subscriptions.reduce((sum, s) => sum + (s.average_bill_value || 0), 0) / totalSubscriptions;

  // Dados por mês
  const monthlyData = subscriptions.reduce((acc, sub) => {
    const month = new Date(sub.created_date).toISOString().substring(0, 7);
    if (!acc[month]) {
      acc[month] = { month, total: 0, active: 0, residential: 0, commercial: 0 };
    }
    acc[month].total++;
    if (sub.status === 'active') acc[month].active++;
    if (sub.customer_type === 'residential') acc[month].residential++;
    if (sub.customer_type === 'commercial') acc[month].commercial++;
    return acc;
  }, {});

  const chartData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

  // Conversão de indicações
  const referralConversionRate = referrals.length > 0
    ? ((referrals.filter(r => r.status === 'converted').length / referrals.length) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Vendas</p>
                <p className="text-2xl font-bold">{totalSubscriptions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Taxa Conversão</p>
                <p className="text-2xl font-bold">{conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Ticket Médio</p>
                <p className="text-2xl font-bold">R$ {avgValue.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Conv. Indicações</p>
                <p className="text-2xl font-bold">{referralConversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total" strokeWidth={2} />
              <Line type="monotone" dataKey="active" stroke="#10b981" name="Ativas" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribuição por Tipo */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Tipo de Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="residential" fill="#3b82f6" name="Residencial" />
              <Bar dataKey="commercial" fill="#8b5cf6" name="Comercial" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle>Maiores Contratos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {subscriptions
              .filter(s => s.average_bill_value)
              .sort((a, b) => (b.average_bill_value || 0) - (a.average_bill_value || 0))
              .slice(0, 5)
              .map((sub, index) => (
                <div key={sub.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{sub.customer_name}</p>
                      <p className="text-sm text-slate-500">{sub.city}/{sub.state}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-green-600">R$ {sub.average_bill_value.toFixed(2)}</p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}