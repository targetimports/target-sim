import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, AlertTriangle, TrendingUp, ArrowLeft, PlayCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function MonthlyReconciliation() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedPlant, setSelectedPlant] = useState('');

  const { data: powerPlants = [] } = useQuery({
    queryKey: ['plants-reconciliation'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const { data: reconciliations = [] } = useQuery({
    queryKey: ['reconciliations', selectedMonth],
    queryFn: () => base44.entities.MonthlyReconciliation.filter({ month_reference: selectedMonth })
  });

  const { data: performances = [] } = useQuery({
    queryKey: ['performances-reconciliation', selectedMonth],
    queryFn: () => base44.entities.PlantPerformance.list('-date', 100)
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations-reconciliation', selectedMonth],
    queryFn: () => base44.entities.EnergyAllocation.filter({ month_reference: selectedMonth })
  });

  const runReconciliation = useMutation({
    mutationFn: async () => {
      if (!selectedPlant) throw new Error('Selecione uma usina');

      const plant = powerPlants.find(p => p.id === selectedPlant);
      const monthPerformances = performances.filter(p => 
        p.power_plant_id === selectedPlant && 
        p.date?.startsWith(selectedMonth)
      );
      
      const actualGeneration = monthPerformances.reduce((sum, p) => sum + (p.actual_generation_kwh || 0), 0);
      const expectedGeneration = plant.monthly_generation_kwh || 0;
      const allocated = allocations
        .filter(a => a.power_plant_id === selectedPlant)
        .reduce((sum, a) => sum + (a.allocated_kwh || 0), 0);
      
      const variance = actualGeneration - expectedGeneration;
      const variancePercentage = expectedGeneration > 0 ? (variance / expectedGeneration) * 100 : 0;
      
      let status = 'completed';
      if (Math.abs(variancePercentage) > 10) {
        status = 'requires_adjustment';
      }

      await base44.entities.MonthlyReconciliation.create({
        power_plant_id: selectedPlant,
        month_reference: selectedMonth,
        expected_generation_kwh: expectedGeneration,
        actual_generation_kwh: actualGeneration,
        allocated_kwh: allocated,
        variance_kwh: variance,
        variance_percentage: variancePercentage,
        status,
        adjustments_made: false
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['reconciliations']);
      toast.success('Reconciliação realizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro: ' + error.message);
    }
  });

  const totalExpected = reconciliations.reduce((sum, r) => sum + (r.expected_generation_kwh || 0), 0);
  const totalActual = reconciliations.reduce((sum, r) => sum + (r.actual_generation_kwh || 0), 0);
  const requiresAdjustment = reconciliations.filter(r => r.status === 'requires_adjustment').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Reconciliação Mensal</h1>
                <p className="text-amber-100 text-sm">Comparação: prometido vs real</p>
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
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Esperado Total</p>
                  <p className="text-2xl font-bold">{totalExpected.toLocaleString()} kWh</p>
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
                  <p className="text-sm text-slate-500">Geração Real</p>
                  <p className="text-2xl font-bold">{totalActual.toLocaleString()} kWh</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Requer Ajuste</p>
                  <p className="text-2xl font-bold">{requiresAdjustment}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Executar Reconciliação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Usina *</label>
                <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {powerPlants.map(plant => (
                      <SelectItem key={plant.id} value={plant.id}>{plant.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Mês</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={() => runReconciliation.mutate()}
                  disabled={!selectedPlant || runReconciliation.isPending}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  {runReconciliation.isPending ? 'Processando...' : 'Reconciliar'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reconciliações ({selectedMonth})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reconciliations.map((rec) => {
                const plant = powerPlants.find(p => p.id === rec.power_plant_id);
                return (
                  <Card key={rec.id} className="border border-slate-200">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{plant?.name}</h3>
                          <p className="text-sm text-slate-500">{rec.month_reference}</p>
                        </div>
                        <Badge className={
                          rec.status === 'completed' ? 'bg-green-100 text-green-800' :
                          rec.status === 'requires_adjustment' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {rec.status === 'completed' ? 'Concluída' :
                           rec.status === 'requires_adjustment' ? 'Requer Ajuste' : 'Pendente'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs text-blue-600 mb-1">Esperado</p>
                          <p className="text-lg font-bold text-blue-700">
                            {rec.expected_generation_kwh?.toLocaleString()} kWh
                          </p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-xs text-green-600 mb-1">Real</p>
                          <p className="text-lg font-bold text-green-700">
                            {rec.actual_generation_kwh?.toLocaleString()} kWh
                          </p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <p className="text-xs text-purple-600 mb-1">Alocado</p>
                          <p className="text-lg font-bold text-purple-700">
                            {rec.allocated_kwh?.toLocaleString()} kWh
                          </p>
                        </div>
                        <div className={`p-3 rounded-lg ${
                          rec.variance_kwh >= 0 ? 'bg-emerald-50' : 'bg-red-50'
                        }`}>
                          <p className={`text-xs mb-1 ${
                            rec.variance_kwh >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}>Variação</p>
                          <p className={`text-lg font-bold ${
                            rec.variance_kwh >= 0 ? 'text-emerald-700' : 'text-red-700'
                          }`}>
                            {rec.variance_kwh >= 0 ? '+' : ''}{rec.variance_kwh?.toFixed(0)} kWh
                            <span className="text-xs ml-1">
                              ({rec.variance_percentage?.toFixed(1)}%)
                            </span>
                          </p>
                        </div>
                      </div>

                      {rec.notes && (
                        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                          <p className="text-sm text-slate-600">{rec.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {reconciliations.length === 0 && (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhuma reconciliação neste mês</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}