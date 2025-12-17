import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sun, AlertTriangle, Activity, ArrowLeft, TrendingUp, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function PlantPerformanceDashboard() {
  const { data: plants = [] } = useQuery({
    queryKey: ['power-plants'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const { data: performances = [] } = useQuery({
    queryKey: ['plant-performances'],
    queryFn: () => base44.entities.PlantPerformance.list('-date', 100)
  });

  const statusColors = {
    normal: 'bg-green-100 text-green-800',
    low_performance: 'bg-yellow-100 text-yellow-800',
    maintenance_needed: 'bg-orange-100 text-orange-800',
    offline: 'bg-red-100 text-red-800'
  };

  const statusLabels = {
    normal: 'Normal',
    low_performance: 'Baixa Performance',
    maintenance_needed: 'Manutenção Necessária',
    offline: 'Offline'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Sun className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Performance das Usinas</h1>
                <p className="text-sm text-white/80">Monitoramento em tempo real</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {plants.map((plant) => {
            const plantPerformances = performances
              .filter(p => p.power_plant_id === plant.id)
              .slice(0, 7)
              .reverse();

            const latestPerformance = plantPerformances[plantPerformances.length - 1];
            const avgPerformance = plantPerformances.length > 0
              ? plantPerformances.reduce((sum, p) => sum + (p.performance_ratio || 0), 0) / plantPerformances.length
              : 0;

            return (
              <Card key={plant.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                        <Sun className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <CardTitle>{plant.name}</CardTitle>
                        <p className="text-sm text-slate-500">{plant.city}/{plant.state}</p>
                      </div>
                    </div>
                    {latestPerformance && (
                      <Badge className={statusColors[latestPerformance.status]}>
                        {statusLabels[latestPerformance.status]}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-4 mb-6">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-blue-600" />
                        <p className="text-xs text-slate-600">Capacidade</p>
                      </div>
                      <p className="text-xl font-bold text-blue-600">{plant.capacity_kw} kW</p>
                    </div>

                    {latestPerformance && (
                      <>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <p className="text-xs text-slate-600">Performance</p>
                          </div>
                          <p className="text-xl font-bold text-green-600">
                            {latestPerformance.performance_ratio?.toFixed(1)}%
                          </p>
                        </div>

                        <div className="p-3 bg-purple-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Activity className="w-4 h-4 text-purple-600" />
                            <p className="text-xs text-slate-600">Geração Hoje</p>
                          </div>
                          <p className="text-xl font-bold text-purple-600">
                            {latestPerformance.actual_generation_kwh?.toFixed(0)} kWh
                          </p>
                        </div>

                        <div className="p-3 bg-amber-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Sun className="w-4 h-4 text-amber-600" />
                            <p className="text-xs text-slate-600">Disponibilidade</p>
                          </div>
                          <p className="text-xl font-bold text-amber-600">
                            {latestPerformance.availability?.toFixed(1)}%
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {plantPerformances.length > 0 && (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={plantPerformances}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(date) => format(new Date(date), 'dd/MM')}
                          />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="expected_generation_kwh" 
                            stroke="#94a3b8" 
                            name="Esperado" 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="actual_generation_kwh" 
                            stroke="#10b981" 
                            name="Real" 
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>

                      {latestPerformance?.alerts && latestPerformance.alerts.length > 0 && (
                        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                            <p className="font-medium text-sm text-orange-900">Alertas:</p>
                          </div>
                          <ul className="space-y-1">
                            {latestPerformance.alerts.map((alert, idx) => (
                              <li key={idx} className="text-sm text-orange-800">• {alert}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}