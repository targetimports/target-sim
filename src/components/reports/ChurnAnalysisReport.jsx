import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertTriangle, TrendingDown, Users, Percent } from 'lucide-react';

export default function ChurnAnalysisReport({ subscriptions }) {
  // Métricas de churn
  const totalSubscriptions = subscriptions.length;
  const churnedSubscriptions = subscriptions.filter(s => 
    s.status === 'cancelled' || s.status === 'suspended'
  ).length;
  const churnRate = ((churnedSubscriptions / totalSubscriptions) * 100).toFixed(2);
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
  const retentionRate = ((activeSubscriptions / totalSubscriptions) * 100).toFixed(2);

  // Evolução de churn por mês
  const monthlyChurn = subscriptions.reduce((acc, sub) => {
    const month = new Date(sub.updated_date || sub.created_date).toISOString().substring(0, 7);
    if (!acc[month]) {
      acc[month] = { month, churned: 0, active: 0, total: 0 };
    }
    acc[month].total++;
    if (sub.status === 'cancelled' || sub.status === 'suspended') {
      acc[month].churned++;
    } else if (sub.status === 'active') {
      acc[month].active++;
    }
    return acc;
  }, {});

  const churnData = Object.values(monthlyChurn)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(d => ({
      ...d,
      churnRate: d.total > 0 ? ((d.churned / d.total) * 100).toFixed(1) : 0
    }));

  // Motivos de churn (por status)
  const churnReasons = [
    { name: 'Canceladas', value: subscriptions.filter(s => s.status === 'cancelled').length, color: '#ef4444' },
    { name: 'Suspensas', value: subscriptions.filter(s => s.status === 'suspended').length, color: '#f59e0b' }
  ];

  // Distribuição de churn por tipo de cliente
  const churnByType = [
    { 
      name: 'Residencial', 
      churned: subscriptions.filter(s => s.customer_type === 'residential' && (s.status === 'cancelled' || s.status === 'suspended')).length,
      active: subscriptions.filter(s => s.customer_type === 'residential' && s.status === 'active').length
    },
    { 
      name: 'Comercial', 
      churned: subscriptions.filter(s => s.customer_type === 'commercial' && (s.status === 'cancelled' || s.status === 'suspended')).length,
      active: subscriptions.filter(s => s.customer_type === 'commercial' && s.status === 'active').length
    }
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Taxa de Churn</p>
                <p className="text-2xl font-bold text-red-600">{churnRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Percent className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Taxa de Retenção</p>
                <p className="text-2xl font-bold text-green-600">{retentionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Clientes Perdidos</p>
                <p className="text-2xl font-bold">{churnedSubscriptions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Clientes Ativos</p>
                <p className="text-2xl font-bold">{activeSubscriptions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evolução de Churn */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução da Taxa de Churn</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={churnData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="churnRate" stroke="#ef4444" name="Taxa de Churn (%)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Motivos de Churn */}
        <Card>
          <CardHeader>
            <CardTitle>Status de Desligamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={churnReasons}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {churnReasons.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Churn por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle>Churn por Tipo de Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {churnByType.map((item) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-sm text-slate-500">
                      {item.churned} churned / {item.active} ativos
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className="bg-red-500 h-3 rounded-full"
                      style={{ 
                        width: `${((item.churned / (item.churned + item.active)) * 100).toFixed(1)}%` 
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Taxa de Churn: {((item.churned / (item.churned + item.active)) * 100).toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clientes em Risco */}
      <Card>
        <CardHeader>
          <CardTitle>⚠️ Clientes Suspensos (Em Risco)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {subscriptions
              .filter(s => s.status === 'suspended')
              .slice(0, 5)
              .map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div>
                    <p className="font-medium">{sub.customer_name}</p>
                    <p className="text-sm text-slate-500">{sub.customer_email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-orange-600">Suspenso</p>
                    <p className="text-xs text-slate-500">{sub.city}/{sub.state}</p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}