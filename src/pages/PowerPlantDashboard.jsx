import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Sun, Zap, Activity, AlertTriangle, TrendingUp, TrendingDown, 
  Calendar, MapPin, ArrowLeft, BarChart3, PieChart, AlertCircle,
  Battery, Wind, Thermometer, CloudRain, RefreshCw
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

export default function PowerPlantDashboard() {
  const [selectedPlant, setSelectedPlant] = useState('all');
  const [timeRange, setTimeRange] = useState('week');
  const [comparisonMode, setComparisonMode] = useState(false);

  const { data: plants = [] } = useQuery({
    queryKey: ['powerplants'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const { data: monthlyGenerations = [] } = useQuery({
    queryKey: ['monthly-generations'],
    queryFn: () => base44.entities.MonthlyGeneration.list('-reference_month', 100)
  });

  const { data: performances = [] } = useQuery({
    queryKey: ['plant-performances'],
    queryFn: () => base44.entities.PlantPerformance.list('-date', 200)
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['plant-alerts'],
    queryFn: () => base44.entities.Alert.filter({ 
      type: 'plant_maintenance',
      status: 'active' 
    })
  });

  // Filtragem de dados
  const filteredPlants = selectedPlant === 'all' 
    ? plants 
    : plants.filter(p => p.id === selectedPlant);

  const getTimeRangeData = () => {
    const now = new Date();
    let days = 7;
    
    if (timeRange === 'month') days = 30;
    if (timeRange === 'quarter') days = 90;
    if (timeRange === 'year') days = 365;

    const startDate = subDays(now, days);
    
    return performances.filter(p => {
      const perfDate = new Date(p.date);
      return perfDate >= startDate && perfDate <= now;
    });
  };

  const timeRangeData = getTimeRangeData();

  // Cálculo de estatísticas
  const operationalPlants = plants.filter(p => 
    p.status === 'operational' || p.status === 'compensando'
  );
  
  const totalCapacity = operationalPlants.reduce((sum, p) => 
    sum + (p.capacity_kw || 0), 0
  );

  const totalMonthlyGen = plants
    .filter(p => p.operation_mode === 'monthly_generation')
    .reduce((sum, p) => sum + (p.monthly_generation_kwh || 0), 0);

  const totalCredits = plants
    .filter(p => p.operation_mode === 'accumulated_balance')
    .reduce((sum, p) => sum + (parseFloat(p.available_balance_kwh) || 0), 0);

  const avgPerformance = timeRangeData.length > 0
    ? timeRangeData.reduce((sum, p) => sum + (p.performance_ratio || 0), 0) / timeRangeData.length
    : 0;

  // Dados para gráfico de produção em tempo real
  const realtimeData = timeRangeData
    .slice(0, timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90)
    .reverse()
    .map(p => ({
      date: format(new Date(p.date), timeRange === 'week' ? 'dd/MM' : 'dd/MM/yy'),
      geração: p.actual_generation_kwh || 0,
      esperado: p.expected_generation_kwh || 0,
      performance: p.performance_ratio || 0
    }));

  // Dados para gráfico de comparação entre usinas
  const comparisonData = plants.map(plant => {
    const plantPerfs = performances
      .filter(p => p.power_plant_id === plant.id)
      .slice(0, 30);
    
    const avgGen = plantPerfs.length > 0
      ? plantPerfs.reduce((sum, p) => sum + (p.actual_generation_kwh || 0), 0) / plantPerfs.length
      : 0;

    const avgPerf = plantPerfs.length > 0
      ? plantPerfs.reduce((sum, p) => sum + (p.performance_ratio || 0), 0) / plantPerfs.length
      : 0;

    return {
      name: plant.name,
      geração: avgGen,
      performance: avgPerf,
      capacidade: plant.capacity_kw || 0,
      status: plant.status
    };
  }).sort((a, b) => b.geração - a.geração);

  // Dados de distribuição por status
  const statusDistribution = [
    { name: 'Operacional', value: plants.filter(p => p.status === 'operational').length },
    { name: 'Manutenção', value: plants.filter(p => p.status === 'maintenance').length },
    { name: 'Inativa', value: plants.filter(p => p.status === 'inactive').length },
    { name: 'Compensando', value: plants.filter(p => p.status === 'compensando').length },
    { name: 'Disponível', value: plants.filter(p => p.status === 'disponivel').length }
  ].filter(s => s.value > 0);

  // Dados mensais agregados
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = subMonths(new Date(), 11 - i);
    const monthStr = format(month, 'yyyy-MM');
    
    const monthGens = monthlyGenerations.filter(g => 
      g.reference_month === monthStr
    );
    
    const generated = monthGens.reduce((sum, g) => sum + (g.generated_kwh || 0), 0);
    const expected = monthGens.reduce((sum, g) => sum + (g.expected_generation_kwh || 0), 0);
    
    return {
      month: format(month, 'MMM'),
      gerado: generated / 1000,
      esperado: expected / 1000,
      performance: expected > 0 ? (generated / expected) * 100 : 0
    };
  });

  // Alertas ativos
  const activeAlerts = alerts.filter(a => 
    !selectedPlant || selectedPlant === 'all' || a.related_entity_id === selectedPlant
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-900 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center">
                  <Sun className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Dashboard de Usinas</h1>
                  <p className="text-amber-300 text-sm">Monitoramento completo e análise de performance</p>
                </div>
              </div>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline" className="border-white/20 text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filtros */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-64">
                <label className="text-sm font-medium text-slate-700 mb-2 block">Usina</label>
                <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Usinas</SelectItem>
                    {plants.map(plant => (
                      <SelectItem key={plant.id} value={plant.id}>{plant.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-48">
                <label className="text-sm font-medium text-slate-700 mb-2 block">Período</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Última Semana</SelectItem>
                    <SelectItem value="month">Último Mês</SelectItem>
                    <SelectItem value="quarter">Últimos 3 Meses</SelectItem>
                    <SelectItem value="year">Último Ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant={comparisonMode ? "default" : "outline"}
                  onClick={() => setComparisonMode(!comparisonMode)}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Modo Comparação
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Sun className="w-8 h-8 text-amber-600" />
                <Badge className="bg-amber-200 text-amber-900">
                  {operationalPlants.length} ativas
                </Badge>
              </div>
              <p className="text-sm text-amber-700 font-medium">Capacidade Total</p>
              <p className="text-3xl font-bold text-amber-900">{(totalCapacity / 1000).toFixed(2)} MWp</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-8 h-8 text-blue-600" />
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm text-blue-700 font-medium">Geração Mensal</p>
              <p className="text-3xl font-bold text-blue-900">{(totalMonthlyGen / 1000).toFixed(0)}k kWh</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Battery className="w-8 h-8 text-green-600" />
                <Badge className="bg-green-200 text-green-900">Disponível</Badge>
              </div>
              <p className="text-sm text-green-700 font-medium">Créditos Acumulados</p>
              <p className="text-3xl font-bold text-green-900">{(totalCredits / 1000).toFixed(0)}k kWh</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-8 h-8 text-purple-600" />
                {avgPerformance >= 85 ? (
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
              </div>
              <p className="text-sm text-purple-700 font-medium">Performance Média</p>
              <p className="text-3xl font-bold text-purple-900">{avgPerformance.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Alertas Ativos */}
        {activeAlerts.length > 0 && (
          <Card className="mb-8 border-0 shadow-sm bg-red-50 border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertTriangle className="w-5 h-5" />
                Alertas de Manutenção Ativos ({activeAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeAlerts.map(alert => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{alert.message}</p>
                      <p className="text-sm text-slate-600">{alert.description}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(alert.created_date), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                    <Badge className={
                      alert.priority === 'high' ? 'bg-red-100 text-red-800' :
                      alert.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }>
                      {alert.priority === 'high' ? 'Alta' :
                       alert.priority === 'medium' ? 'Média' : 'Baixa'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="realtime" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1">
            <TabsTrigger value="realtime">Tempo Real</TabsTrigger>
            <TabsTrigger value="historical">Histórico</TabsTrigger>
            <TabsTrigger value="comparison">Comparação</TabsTrigger>
            <TabsTrigger value="credits">Créditos</TabsTrigger>
          </TabsList>

          {/* Aba Tempo Real */}
          <TabsContent value="realtime" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Produção de Energia - {timeRange === 'week' ? 'Última Semana' : 
                    timeRange === 'month' ? 'Último Mês' : 
                    timeRange === 'quarter' ? 'Últimos 3 Meses' : 'Último Ano'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {realtimeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={realtimeData}>
                      <defs>
                        <linearGradient id="colorGen" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="geração" 
                        stroke="#f59e0b" 
                        strokeWidth={3}
                        fill="url(#colorGen)"
                        name="Geração Real (kWh)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="esperado" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Esperado (kWh)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-96 flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Sem dados para o período selecionado</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Grid de Usinas */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlants.map(plant => {
                const plantPerfs = performances.filter(p => p.power_plant_id === plant.id).slice(0, 7);
                const latest = plantPerfs[0];
                const plantAlerts = alerts.filter(a => a.related_entity_id === plant.id);

                return (
                  <Card key={plant.id} className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Sun className="w-8 h-8 text-amber-500" />
                          <div>
                            <h3 className="font-semibold text-slate-900">{plant.name}</h3>
                            <p className="text-sm text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {plant.city}/{plant.state}
                            </p>
                          </div>
                        </div>
                        <Badge className={
                          plant.status === 'operational' ? 'bg-green-100 text-green-800' :
                          plant.status === 'compensando' ? 'bg-orange-100 text-orange-800' :
                          plant.status === 'disponivel' ? 'bg-blue-100 text-blue-800' :
                          plant.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-slate-100 text-slate-800'
                        }>
                          {plant.status === 'operational' ? 'Operacional' :
                           plant.status === 'compensando' ? 'Compensando' :
                           plant.status === 'disponivel' ? 'Disponível' :
                           plant.status === 'maintenance' ? 'Manutenção' : 'Inativa'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-xs text-slate-500 mb-1">Capacidade</p>
                          <p className="text-lg font-bold text-slate-900">{plant.capacity_kw?.toLocaleString()} kWp</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-xs text-slate-500 mb-1">Performance</p>
                          <p className="text-lg font-bold text-slate-900">
                            {latest?.performance_ratio?.toFixed(1) || '--'}%
                          </p>
                        </div>
                      </div>

                      {plant.operation_mode === 'monthly_generation' && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-4 h-4 text-blue-600" />
                            <p className="text-xs text-blue-700 font-medium">Geração Mensal</p>
                          </div>
                          <p className="text-xl font-bold text-blue-900">
                            {plant.monthly_generation_kwh?.toLocaleString()} kWh
                          </p>
                        </div>
                      )}

                      {plant.operation_mode === 'accumulated_balance' && (
                        <div className="p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Battery className="w-4 h-4 text-green-600" />
                            <p className="text-xs text-green-700 font-medium">Créditos Disponíveis</p>
                          </div>
                          <p className="text-xl font-bold text-green-900">
                            {parseFloat(plant.available_balance_kwh || 0).toLocaleString()} kWh
                          </p>
                        </div>
                      )}

                      {plantAlerts.length > 0 && (
                        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <p className="text-sm font-semibold text-red-900">
                              {plantAlerts.length} alerta(s) ativo(s)
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Aba Histórico */}
          <TabsContent value="historical" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Histórico Mensal - Últimos 12 Meses</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" />
                    <YAxis stroke="#64748b" label={{ value: 'MWh', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="gerado" fill="#f59e0b" name="Gerado (MWh)" />
                    <Bar dataKey="esperado" fill="#3b82f6" name="Esperado (MWh)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Performance Mensal (%)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" />
                    <YAxis stroke="#64748b" domain={[0, 100]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="performance" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      name="Performance (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Comparação */}
          <TabsContent value="comparison" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Comparação de Performance entre Usinas</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={comparisonData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#64748b" />
                    <YAxis type="category" dataKey="name" stroke="#64748b" width={150} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="performance" fill="#8b5cf6" name="Performance (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Geração Média Diária por Usina</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" angle={-45} textAnchor="end" height={100} />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Bar dataKey="geração" fill="#f59e0b" name="Geração Média (kWh)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Distribuição por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Top 5 Melhores Performances</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {comparisonData.slice(0, 5).map((plant, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-900">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{plant.name}</p>
                            <p className="text-sm text-slate-500">{plant.capacidade.toLocaleString()} kWp</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900">{plant.performance.toFixed(1)}%</p>
                          <p className="text-xs text-slate-500">{plant.geração.toFixed(0)} kWh/dia</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Aba Créditos */}
          <TabsContent value="credits" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {plants
                .filter(p => p.operation_mode === 'accumulated_balance')
                .map(plant => (
                  <Card key={plant.id} className="border-0 shadow-sm">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Battery className="w-8 h-8 text-green-600" />
                        <div>
                          <h3 className="font-semibold text-slate-900">{plant.name}</h3>
                          <Badge className={
                            plant.status === 'compensando' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }>
                            {plant.status === 'compensando' ? 'Compensando' : 'Disponível'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-700 mb-1">Saldo Inicial</p>
                        <p className="text-2xl font-bold text-green-900">
                          {parseFloat(plant.initial_balance_kwh || 0).toLocaleString()} kWh
                        </p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700 mb-1">Saldo Disponível</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {parseFloat(plant.available_balance_kwh || 0).toLocaleString()} kWh
                        </p>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-lg">
                        <p className="text-sm text-amber-700 mb-1">Utilização</p>
                        <p className="text-2xl font-bold text-amber-900">
                          {(
                            ((parseFloat(plant.initial_balance_kwh) - parseFloat(plant.available_balance_kwh || 0)) / 
                            parseFloat(plant.initial_balance_kwh || 1)) * 100
                          ).toFixed(1)}%
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}