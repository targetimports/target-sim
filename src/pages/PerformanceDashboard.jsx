import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Zap, Users, Activity, ArrowLeft, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function PerformanceDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations-performance', selectedMonth],
    queryFn: () => base44.entities.EnergyAllocation.filter({ month_reference: selectedMonth })
  });

  const { data: plants = [] } = useQuery({
    queryKey: ['plants-performance'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions-performance'],
    queryFn: () => base44.entities.Subscription.filter({ status: 'active' })
  });

  const { data: reconciliations = [] } = useQuery({
    queryKey: ['reconciliations-performance', selectedMonth],
    queryFn: () => base44.entities.MonthlyReconciliation.filter({ month_reference: selectedMonth })
  });

  const plantPerformance = plants.map(plant => {
    const plantAllocations = allocations.filter(a => a.power_plant_id === plant.id);
    const totalAllocated = plantAllocations.reduce((sum, a) => sum + a.allocated_kwh, 0);
    const capacity = plant.monthly_generation_kwh || 0;
    const utilization = capacity > 0 ? (totalAllocated / capacity) * 100 : 0;
    const customerCount = plantAllocations.length;
    
    const reconciliation = reconciliations.find(r => r.power_plant_id === plant.id);
    const efficiency = reconciliation ? 
      (reconciliation.actual_generation_kwh / reconciliation.expected_generation_kwh) * 100 : 100;

    return {
      name: plant.name,
      capacity,
      allocated: totalAllocated,
      utilization,
      customerCount,
      efficiency,
      status: utilization > 100 ? 'over' : utilization > 90 ? 'high' : 'normal'
    };
  });

  const totalCapacity = plantPerformance.reduce((sum, p) => sum + p.capacity, 0);
  const totalAllocated = plantPerformance.reduce((sum, p) => sum + p.allocated, 0);
  const overallUtilization = totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0;
  const overAllocatedPlants = plantPerformance.filter(p => p.status === 'over').length;
  const avgEfficiency = plantPerformance.reduce((sum, p) => sum + p.efficiency, 0) / plantPerformance.length;

  const chartData = plantPerformance.map(p => ({
    name: p.name,
    capacidade: p.capacity,
    alocado: p.allocated,
    utilizacao: p.utilization.toFixed(1)
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-cyan-900 to-blue-900 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">📊 Dashboard de Performance</h1>
              <p className="text-cyan-100 text-sm">Análise completa de utilização e eficiência</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <label className="text-sm font-medium mb-2 block">Mês de Referência</label>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Utilização Geral</p>
                  <p className="text-2xl font-bold text-blue-600">{overallUtilization.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Eficiência Média</p>
                  <p className="text-2xl font-bold text-green-600">{avgEfficiency.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Clientes</p>
                  <p className="text-2xl font-bold text-purple-600">{subscriptions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Sobre-alocadas</p>
                  <p className="text-2xl font-bold text-red-600">{overAllocatedPlants}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Utilização por Usina</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="capacidade" fill="#3b82f6" name="Capacidade" />
                  <Bar dataKey="alocado" fill="#10b981" name="Alocado" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Taxa de Utilização (%)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="utilizacao" stroke="#8b5cf6" strokeWidth={2} name="Utilização %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Detalhes por Usina</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {plantPerformance.map((plant, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl border">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{plant.name}</h3>
                      <p className="text-sm text-slate-600">{plant.customerCount} clientes ativos</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={
                        plant.status === 'over' ? 'bg-red-100 text-red-800' :
                        plant.status === 'high' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }>
                        {plant.utilization.toFixed(1)}% utilização
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-800">
                        {plant.efficiency.toFixed(1)}% eficiência
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Capacidade</p>
                      <p className="text-lg font-bold">{plant.capacity.toLocaleString()} kWh</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Alocado</p>
                      <p className="text-lg font-bold text-blue-600">{plant.allocated.toLocaleString()} kWh</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Disponível</p>
                      <p className="text-lg font-bold text-green-600">
                        {(plant.capacity - plant.allocated).toLocaleString()} kWh
                      </p>
                    </div>
                  </div>
                  {plant.status === 'over' && (
                    <div className="mt-3 p-2 bg-red-50 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <p className="text-sm text-red-700">⚠️ Usina sobre-alocada! Revisar alocações.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}