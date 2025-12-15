import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Zap, TrendingUp, AlertTriangle, ArrowLeft, MapPin } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

export default function PlantMonitoring() {
  const { data: plants = [] } = useQuery({
    queryKey: ['plants-monitoring'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const { data: performances = [] } = useQuery({
    queryKey: ['plant-performances'],
    queryFn: () => base44.entities.PlantPerformance.list('-date', 100)
  });

  const { data: forecasts = [] } = useQuery({
    queryKey: ['forecasts'],
    queryFn: () => base44.entities.WeatherForecast.list('-forecast_date', 50)
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminPowerPlants')}>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-amber-400" />
                <div>
                  <h1 className="text-2xl font-bold">Monitoramento em Tempo Real</h1>
                  <p className="text-amber-400 text-sm">Performance e alertas das usinas</p>
                </div>
              </div>
            </div>
            <Link to={createPageUrl('WeatherForecast')}>
              <Button variant="outline" className="border-white/20 text-white">
                Ver Previsão do Tempo
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {plants.map((plant) => {
            const plantPerformances = performances.filter(p => p.power_plant_id === plant.id).slice(0, 7);
            const latestPerformance = plantPerformances[0];
            const avgPerformance = plantPerformances.length > 0
              ? plantPerformances.reduce((sum, p) => sum + (p.performance_ratio || 0), 0) / plantPerformances.length
              : 0;

            const chartData = plantPerformances.reverse().map(p => ({
              date: format(new Date(p.date), 'dd/MM'),
              geração: p.actual_generation_kwh,
              esperado: p.expected_generation_kwh
            }));

            return (
              <Card key={plant.id} className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{plant.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                        <MapPin className="w-4 h-4" />
                        {plant.city}/{plant.state}
                      </div>
                    </div>
                    <Badge className={
                      plant.status === 'operational' ? 'bg-green-100 text-green-800' :
                      plant.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {plant.status === 'operational' ? 'Operacional' :
                       plant.status === 'maintenance' ? 'Manutenção' : 'Inativa'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid lg:grid-cols-4 gap-6 mb-6">
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5 text-blue-600" />
                        <p className="text-sm text-blue-600">Geração Hoje</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-700">
                        {latestPerformance?.actual_generation_kwh || 0} kWh
                      </p>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-amber-600" />
                        <p className="text-sm text-amber-600">Performance</p>
                      </div>
                      <p className="text-2xl font-bold text-amber-700">
                        {latestPerformance?.performance_ratio?.toFixed(1) || 0}%
                      </p>
                    </div>

                    <div className="p-4 bg-green-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-5 h-5 text-green-600" />
                        <p className="text-sm text-green-600">Disponibilidade</p>
                      </div>
                      <p className="text-2xl font-bold text-green-700">
                        {latestPerformance?.availability?.toFixed(1) || 0}%
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-slate-600" />
                        <p className="text-sm text-slate-600">Alertas</p>
                      </div>
                      <p className="text-2xl font-bold text-slate-700">
                        {latestPerformance?.alerts_triggered || 0}
                      </p>
                    </div>
                  </div>

                  {chartData.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-4">Geração - Últimos 7 dias</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                          <YAxis stroke="#64748b" fontSize={12} />
                          <Tooltip />
                          <Line type="monotone" dataKey="geração" stroke="#f59e0b" strokeWidth={2} name="Geração Real" />
                          <Line type="monotone" dataKey="esperado" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" name="Esperado" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {latestPerformance && latestPerformance.performance_ratio < 80 && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-900">Alerta de Performance Baixa</p>
                        <p className="text-sm text-red-700">
                          A performance está abaixo de 80%. Recomenda-se verificar a usina.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {plants.length === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nenhuma usina cadastrada</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}