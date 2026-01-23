import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Zap, DollarSign, AlertCircle } from 'lucide-react';

export default function HistoricalChartsSection({ units }) {
  // Processar dados históricos (simulado - você pode substituir com dados reais)
  const monthlyData = React.useMemo(() => {
    const months = ['04/2025', '05/2025', '06/2025', '07/2025', '08/2025', '09/2025', '10/2025', '11/2025', '12/2025'];
    
    return months.map(month => {
      const totalConsumption = units.reduce((sum, u) => sum + (u.monthly_consumption_kwh || 0), 0);
      const variance = Math.random() * 0.3 + 0.85; // 85% a 115%
      
      return {
        month,
        'Hora fora ponta': Math.round(totalConsumption * 0.4 * variance),
        'Hora ponta': Math.round(totalConsumption * 0.15 * variance),
        'Horário intermediário': Math.round(totalConsumption * 0.25 * variance),
        'Horário reservado': Math.round(totalConsumption * 0.2 * variance),
        injection: Math.round(totalConsumption * 0.8 * variance),
        spending: Math.round(totalConsumption * 0.65 * variance * 0.5), // R$ aprox
      };
    });
  }, [units]);

  const expensesByMonth = React.useMemo(() => {
    const months = ['Jan/2025', 'Fev/2025', 'Mar/2025', 'Abr/2025', 'Mai/2025', 'Jun/2025', 'Jul/2025', 'Ago/2025', 'Set/2025'];
    
    return months.map(month => ({
      month,
      gasto: Math.round(15000 + Math.random() * 10000)
    })).reverse();
  }, []);

  const finesData = React.useMemo(() => {
    return [
      { type: 'Total recebido em cobranças SPE', value: Math.round(units.length * 850 + Math.random() * 5000) }
    ];
  }, [units]);

  const totalConsumption = monthlyData.reduce((sum, d) => 
    sum + d['Hora fora ponta'] + d['Hora ponta'] + d['Horário intermediário'] + d['Horário reservado'], 0
  );

  const totalInjection = monthlyData.reduce((sum, d) => sum + d.injection, 0);
  const totalExpenses = expensesByMonth.reduce((sum, d) => sum + d.gasto, 0);

  return (
    <div className="space-y-6">
      {/* Título da seção */}
      <div className="flex items-center gap-3">
        <TrendingUp className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-slate-900">Dados Históricos</h2>
        <span className="text-sm text-slate-500">Consulte os dados históricos de suas unidades consumidoras de uma especifica.</span>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium mb-1">Consumo Total</p>
                <p className="text-2xl font-bold text-blue-900">{totalConsumption.toLocaleString()}</p>
                <p className="text-xs text-blue-600 mt-1">kWh (últimos 9 meses)</p>
              </div>
              <Zap className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 font-medium mb-1">Injeção Total</p>
                <p className="text-2xl font-bold text-green-900">{totalInjection.toLocaleString()}</p>
                <p className="text-xs text-green-600 mt-1">kWh (últimos 9 meses)</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600 font-medium mb-1">Gastos Totais</p>
                <p className="text-2xl font-bold text-amber-900">R$ {totalExpenses.toLocaleString()}</p>
                <p className="text-xs text-amber-600 mt-1">últimos 9 meses</p>
              </div>
              <DollarSign className="w-8 h-8 text-amber-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 font-medium mb-1">Cobranças SPE</p>
                <p className="text-2xl font-bold text-purple-900">R$ {finesData[0].value.toLocaleString()}</p>
                <p className="text-xs text-purple-600 mt-1">total recebido</p>
              </div>
              <AlertCircle className="w-8 h-8 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consumo Total */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Consumo total</CardTitle>
            <p className="text-sm text-slate-500">04/2025 - 12/2025</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  formatter={(value) => `${value.toLocaleString()} kWh`}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Hora fora ponta" stackId="a" fill="#c084fc" />
                <Bar dataKey="Hora ponta" stackId="a" fill="#f472b6" />
                <Bar dataKey="Horário intermediário" stackId="a" fill="#fb923c" />
                <Bar dataKey="Horário reservado" stackId="a" fill="#fbbf24" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Injeção Total */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Injeção total</CardTitle>
            <p className="text-sm text-slate-500">04/2025 - 12/2025</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  formatter={(value) => `${value.toLocaleString()} kWh`}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Hora fora ponta" stackId="a" fill="#c084fc" />
                <Bar dataKey="Hora ponta" stackId="a" fill="#f472b6" />
                <Bar dataKey="Horário intermediário" stackId="a" fill="#fb923c" />
                <Bar dataKey="Horário reservado" stackId="a" fill="#fbbf24" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gastos */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Gasto total com faturas de energia</CardTitle>
            <p className="text-sm text-slate-500">Jan/2025 - Set/2025</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={expensesByMonth} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="month" type="category" tick={{ fontSize: 12 }} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  formatter={(value) => `R$ ${value.toLocaleString()}`}
                />
                <Bar dataKey="gasto" fill="#1e293b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cobranças SPE */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Total recebido em cobranças SPE</CardTitle>
            <p className="text-sm text-slate-500">Jan/2025 - Nov/2025</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  formatter={(value) => `R$ ${value.toLocaleString()}`}
                />
                <Area type="monotone" dataKey="spending" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}