import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Zap, TrendingUp, TrendingDown, AlertTriangle, 
  Activity, Clock, DollarSign, Leaf, Calendar,
  MapPin, Gauge
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function ConsumptionMonitor() {
  const [user, setUser] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [timeRange, setTimeRange] = useState('day');

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['my-subscriptions', user?.email],
    queryFn: () => base44.entities.Subscription.filter({ customer_email: user?.email }),
    enabled: !!user?.email
  });

  const { data: units = [] } = useQuery({
    queryKey: ['consumer-units', subscriptions],
    queryFn: async () => {
      if (subscriptions.length === 0) return [];
      const allUnits = await base44.entities.ConsumerUnit.list();
      return allUnits.filter(unit => 
        subscriptions.some(sub => sub.id === unit.subscription_id)
      );
    },
    enabled: subscriptions.length > 0
  });

  const { data: readings = [] } = useQuery({
    queryKey: ['consumption-readings', selectedUnit?.id, timeRange],
    queryFn: async () => {
      if (!selectedUnit) return [];
      const allReadings = await base44.entities.ConsumptionReading.list('-reading_date', 100);
      return allReadings.filter(r => r.consumer_unit_id === selectedUnit.id);
    },
    enabled: !!selectedUnit
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['consumption-alerts', selectedUnit?.id],
    queryFn: async () => {
      if (!selectedUnit) return [];
      const allAlerts = await base44.entities.Alert.filter({ 
        consumer_unit_id: selectedUnit.id,
        is_resolved: false
      });
      return allAlerts;
    },
    enabled: !!selectedUnit
  });

  useEffect(() => {
    if (units.length > 0 && !selectedUnit) {
      setSelectedUnit(units[0]);
    }
  }, [units, selectedUnit]);

  const currentConsumption = readings[0]?.consumption_kwh || 0;
  const previousConsumption = readings[1]?.consumption_kwh || 0;
  const consumptionTrend = currentConsumption > previousConsumption ? 'up' : 'down';
  const trendPercentage = previousConsumption > 0 
    ? (((currentConsumption - previousConsumption) / previousConsumption) * 100).toFixed(1)
    : 0;

  const totalConsumption = readings.reduce((sum, r) => sum + (r.consumption_kwh || 0), 0);
  const totalCost = readings.reduce((sum, r) => sum + (r.consumption_cost || 0), 0);
  const avgConsumption = readings.length > 0 ? (totalConsumption / readings.length).toFixed(2) : 0;

  const chartData = readings
    .slice(0, 24)
    .reverse()
    .map(reading => ({
      time: format(new Date(reading.reading_date), 'HH:mm', { locale: ptBR }),
      consumo: reading.consumption_kwh,
      custo: reading.consumption_cost
    }));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Monitoramento de Consumo</h1>
              <p className="text-amber-400 text-sm">Acompanhe seu consumo em tempo real</p>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="text-sm">Atualizado agora</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Unit Selector */}
        {units.length > 1 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Selecione a unidade consumidora
            </label>
            <select
              value={selectedUnit?.id || ''}
              onChange={(e) => setSelectedUnit(units.find(u => u.id === e.target.value))}
              className="w-full md:w-auto px-4 py-2 border border-slate-300 rounded-lg bg-white"
            >
              {units.map(unit => (
                <option key={unit.id} value={unit.id}>
                  {unit.unit_name} - {unit.address}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-6">
            {alerts.map(alert => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border-l-4 mb-3 ${
                  alert.severity === 'critical' 
                    ? 'bg-red-50 border-red-500' 
                    : alert.severity === 'warning'
                    ? 'bg-yellow-50 border-yellow-500'
                    : 'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                    alert.severity === 'critical' ? 'text-red-500' : 
                    alert.severity === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                  }`} />
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">{alert.title}</h4>
                    <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
                    {alert.action_required && (
                      <p className="text-sm text-slate-700 mt-2 font-medium">
                        Ação necessária: {alert.action_required}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-amber-600" />
                  </div>
                  {consumptionTrend === 'up' ? (
                    <TrendingUp className="w-5 h-5 text-red-500" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <p className="text-sm text-slate-500 mb-1">Consumo Atual</p>
                <p className="text-3xl font-bold text-slate-900">{currentConsumption} kWh</p>
                <p className={`text-sm mt-1 ${consumptionTrend === 'up' ? 'text-red-600' : 'text-green-600'}`}>
                  {consumptionTrend === 'up' ? '+' : '-'}{Math.abs(trendPercentage)}% vs anterior
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-amber-500" />
                  </div>
                </div>
                <p className="text-sm text-slate-500 mb-1">Custo Acumulado</p>
                <p className="text-3xl font-bold text-slate-900">R$ {totalCost.toFixed(2)}</p>
                <p className="text-sm text-slate-600 mt-1">Período selecionado</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Gauge className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-sm text-slate-500 mb-1">Média de Consumo</p>
                <p className="text-3xl font-bold text-slate-900">{avgConsumption} kWh</p>
                <p className="text-sm text-slate-600 mt-1">Por leitura</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Leaf className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <p className="text-sm text-slate-500 mb-1">CO² Evitado</p>
                <p className="text-3xl font-bold text-slate-900">{(totalConsumption * 0.5).toFixed(0)} kg</p>
                <p className="text-sm text-slate-600 mt-1">Com energia renovável</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-500" />
                Consumo nas últimas 24h
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="consumo" 
                    stroke="#f59e0b" 
                    fill="#fbbf24" 
                    fillOpacity={0.3}
                    name="Consumo (kWh)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-500" />
                Custo por Período
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="custo" fill="#f59e0b" name="Custo (R$)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Readings */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Leituras Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Data/Hora</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Consumo</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Custo</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Tipo</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.slice(0, 10).map((reading) => (
                    <tr key={reading.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm">
                        {format(new Date(reading.reading_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </td>
                      <td className="py-3 px-4 font-medium">{reading.consumption_kwh} kWh</td>
                      <td className="py-3 px-4 font-medium text-amber-600">R$ {reading.consumption_cost?.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">
                          {reading.reading_type === 'automatic' ? 'Automática' :
                           reading.reading_type === 'manual' ? 'Manual' : 'Estimada'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {reading.is_anomaly ? (
                          <Badge className="bg-red-100 text-red-800">Anomalia</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">Normal</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}