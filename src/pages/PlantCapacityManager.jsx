import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Progress } from "@/components/ui/progress";

export default function PlantCapacityManager() {
  const { data: powerPlants = [] } = useQuery({
    queryKey: ['plants-capacity'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions-capacity'],
    queryFn: () => base44.entities.Subscription.filter({ status: 'active' })
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations-capacity'],
    queryFn: () => base44.entities.EnergyAllocation.list('-created_date', 500)
  });

  const plantsWithCapacity = powerPlants.map(plant => {
    const totalCapacity = plant.monthly_generation_kwh || 0;
    const plantAllocations = allocations.filter(a => a.power_plant_id === plant.id);
    const allocated = plantAllocations.reduce((sum, a) => sum + (a.allocated_kwh || 0), 0);
    const available = totalCapacity - allocated;
    const utilization = totalCapacity > 0 ? (allocated / totalCapacity) * 100 : 0;
    const activeSubscriptions = new Set(plantAllocations.map(a => a.subscription_id)).size;

    let status = 'available';
    if (utilization >= 100) status = 'full';
    if (utilization > 100) status = 'overallocated';

    return {
      ...plant,
      totalCapacity,
      allocated,
      available,
      utilization,
      activeSubscriptions,
      status
    };
  });

  const totalCapacity = plantsWithCapacity.reduce((sum, p) => sum + p.totalCapacity, 0);
  const totalAllocated = plantsWithCapacity.reduce((sum, p) => sum + p.allocated, 0);
  const totalAvailable = totalCapacity - totalAllocated;
  const overallocated = plantsWithCapacity.filter(p => p.status === 'overallocated').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Gestão de Capacidade</h1>
                <p className="text-violet-100 text-sm">Controle de alocação das usinas</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Capacidade Total</p>
                  <p className="text-2xl font-bold">{totalCapacity.toLocaleString()} kWh</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Disponível</p>
                  <p className="text-2xl font-bold">{totalAvailable.toLocaleString()} kWh</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Sobrealocadas</p>
                  <p className="text-2xl font-bold">{overallocated}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {plantsWithCapacity.map((plant) => (
            <Card key={plant.id} className="border border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{plant.name}</h3>
                    <p className="text-sm text-slate-500">{plant.city}/{plant.state}</p>
                  </div>
                  <Badge className={
                    plant.status === 'available' ? 'bg-green-100 text-green-800' :
                    plant.status === 'full' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {plant.status === 'available' ? 'Disponível' :
                     plant.status === 'full' ? 'Completa' : 'Sobrealocada'}
                  </Badge>
                </div>

                <div className="grid md:grid-cols-4 gap-4 mb-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 mb-1">Capacidade Total</p>
                    <p className="text-lg font-bold text-blue-700">
                      {plant.totalCapacity.toLocaleString()} kWh
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-600 mb-1">Alocado</p>
                    <p className="text-lg font-bold text-purple-700">
                      {plant.allocated.toLocaleString()} kWh
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600 mb-1">Disponível</p>
                    <p className="text-lg font-bold text-green-700">
                      {plant.available.toLocaleString()} kWh
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <p className="text-xs text-amber-600 mb-1">Assinantes</p>
                    <p className="text-lg font-bold text-amber-700">
                      {plant.activeSubscriptions}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Utilização</span>
                    <span className="font-semibold">{plant.utilization.toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(plant.utilization, 100)} className="h-3" />
                </div>

                {plant.status === 'overallocated' && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900">Sobrealocação Detectada</p>
                      <p className="text-sm text-red-700">
                        A capacidade alocada excede a geração mensal. Revise as alocações.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {plantsWithCapacity.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Zap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nenhuma usina cadastrada</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}