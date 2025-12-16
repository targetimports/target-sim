import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Users, TrendingUp, ArrowLeft, PlayCircle, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function EnergyAllocationManager() {
  const queryClient = useQueryClient();
  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const { data: powerPlants = [] } = useQuery({
    queryKey: ['plants-allocation'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions-allocation'],
    queryFn: () => base44.entities.Subscription.filter({ status: 'active' })
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['energy-allocations', selectedMonth],
    queryFn: () => base44.entities.EnergyAllocation.filter({ month_reference: selectedMonth })
  });

  const runAllocation = useMutation({
    mutationFn: async () => {
      if (!selectedPlant) {
        throw new Error('Selecione uma usina');
      }

      const plant = powerPlants.find(p => p.id === selectedPlant);
      const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
      
      const totalConsumption = activeSubscriptions.reduce((sum, s) => sum + (s.average_bill_value || 0), 0);
      const monthlyGeneration = plant.monthly_generation_kwh || 0;

      const newAllocations = [];
      
      for (const sub of activeSubscriptions) {
        const proportion = (sub.average_bill_value || 0) / totalConsumption;
        const allocatedEnergy = monthlyGeneration * proportion;

        await base44.entities.EnergyAllocation.create({
          subscription_id: sub.id,
          customer_email: sub.customer_email,
          power_plant_id: plant.id,
          allocated_kwh: allocatedEnergy,
          month_reference: selectedMonth,
          allocation_percentage: proportion * 100,
          status: 'allocated'
        });

        await base44.entities.CreditBalance.create({
          customer_email: sub.customer_email,
          subscription_id: sub.id,
          power_plant_id: plant.id,
          balance_kwh: allocatedEnergy,
          accumulated_kwh: allocatedEnergy,
          consumed_kwh: 0,
          month_reference: selectedMonth,
          last_update: new Date().toISOString().split('T')[0]
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['energy-allocations']);
      queryClient.invalidateQueries(['credit-balances']);
      toast.success('Rateio executado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao executar rateio: ' + error.message);
    }
  });

  const selectedPlantData = powerPlants.find(p => p.id === selectedPlant);
  const totalAllocated = allocations.reduce((sum, a) => sum + (a.allocated_kwh || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Sistema de Rateio de Energia</h1>
                <p className="text-indigo-100 text-sm">Distribuição automática entre assinantes</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Energia do Mês</p>
                  <p className="text-2xl font-bold">{selectedPlantData?.monthly_generation_kwh?.toLocaleString() || 0} kWh</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Assinantes Ativos</p>
                  <p className="text-2xl font-bold">{subscriptions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Alocado</p>
                  <p className="text-2xl font-bold">{totalAllocated.toLocaleString()} kWh</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Executar Rateio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Usina *</label>
                <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a usina" />
                  </SelectTrigger>
                  <SelectContent>
                    {powerPlants.map(plant => (
                      <SelectItem key={plant.id} value={plant.id}>
                        {plant.name} ({plant.monthly_generation_kwh?.toLocaleString()} kWh)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Mês de Referência *</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={() => runAllocation.mutate()}
                  disabled={!selectedPlant || runAllocation.isPending}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  {runAllocation.isPending ? 'Processando...' : 'Executar Rateio'}
                </Button>
              </div>
            </div>

            {selectedPlantData && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-600 inline mr-2" />
                <span className="text-sm text-blue-800">
                  Serão distribuídos <strong>{selectedPlantData.monthly_generation_kwh?.toLocaleString()} kWh</strong> entre <strong>{subscriptions.length} assinantes</strong> proporcionalmente ao consumo
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alocações do Mês ({selectedMonth})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allocations.map((allocation) => {
                const subscription = subscriptions.find(s => s.id === allocation.subscription_id);
                return (
                  <div key={allocation.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{allocation.customer_email}</p>
                        <p className="text-sm text-slate-500">
                          {subscription?.customer_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-indigo-600">
                          {allocation.allocated_kwh?.toFixed(2)} kWh
                        </p>
                        <Badge variant="outline">
                          {allocation.allocation_percentage?.toFixed(2)}% do total
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}

              {allocations.length === 0 && (
                <div className="text-center py-12">
                  <Zap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhuma alocação realizada neste mês</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}