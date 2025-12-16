import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Zap, Users, TrendingUp, ArrowLeft, Play } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";

export default function AllocationSimulator() {
  const [plantId, setPlantId] = useState('');
  const [monthlyGeneration, setMonthlyGeneration] = useState('');
  const [newCustomerBill, setNewCustomerBill] = useState('');
  const [simulationResult, setSimulationResult] = useState(null);

  const { data: plants = [] } = useQuery({
    queryKey: ['plants-simulator'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions-simulator'],
    queryFn: () => base44.entities.Subscription.filter({ status: 'active' })
  });

  const runSimulation = () => {
    const selectedPlant = plants.find(p => p.id === plantId);
    const generation = parseFloat(monthlyGeneration) || selectedPlant?.monthly_generation_kwh || 0;
    const newBill = parseFloat(newCustomerBill);

    const existingSubscriptions = subscriptions.filter(s => s.plan_id === plantId);
    const totalCurrentBills = existingSubscriptions.reduce((sum, s) => sum + (s.average_bill_value || 0), 0);
    
    const totalBillsWithNew = totalCurrentBills + (newBill || 0);
    
    const results = existingSubscriptions.map(sub => {
      const proportionalAllocation = (sub.average_bill_value / totalCurrentBills) * generation;
      const newProportionalAllocation = (sub.average_bill_value / totalBillsWithNew) * generation;
      const impact = newProportionalAllocation - proportionalAllocation;
      return {
        email: sub.customer_email,
        name: sub.customer_name,
        currentAllocation: proportionalAllocation,
        newAllocation: newProportionalAllocation,
        impact: impact,
        impactPercent: (impact / proportionalAllocation) * 100
      };
    });

    const newCustomerAllocation = newBill ? (newBill / totalBillsWithNew) * generation : 0;
    const utilizationCurrent = (totalCurrentBills / generation) * 100;
    const utilizationNew = (totalBillsWithNew / generation) * 100;

    setSimulationResult({
      results,
      newCustomerAllocation,
      utilizationCurrent,
      utilizationNew,
      capacityAvailable: generation - totalBillsWithNew,
      totalCustomersCurrent: existingSubscriptions.length,
      totalCustomersNew: existingSubscriptions.length + (newBill ? 1 : 0)
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">🧮 Simulador de Alocação</h1>
              <p className="text-purple-100 text-sm">Teste cenários antes de executar</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Parâmetros da Simulação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Usina</Label>
                <Select value={plantId} onValueChange={setPlantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a usina" />
                  </SelectTrigger>
                  <SelectContent>
                    {plants.map(plant => (
                      <SelectItem key={plant.id} value={plant.id}>
                        {plant.name} - {plant.capacity_kw} kW
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Geração Mensal (kWh)</Label>
                <Input
                  type="number"
                  value={monthlyGeneration}
                  onChange={(e) => setMonthlyGeneration(e.target.value)}
                  placeholder={plants.find(p => p.id === plantId)?.monthly_generation_kwh || "150000"}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Deixe vazio para usar valor padrão da usina
                </p>
              </div>

              <div>
                <Label>Novo Cliente - Valor da Conta (R$)</Label>
                <Input
                  type="number"
                  value={newCustomerBill}
                  onChange={(e) => setNewCustomerBill(e.target.value)}
                  placeholder="500.00"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Opcional: simule o impacto de adicionar um novo cliente
                </p>
              </div>

              <Button 
                onClick={runSimulation} 
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={!plantId}
              >
                <Play className="w-4 h-4 mr-2" />
                Executar Simulação
              </Button>
            </CardContent>
          </Card>

          {simulationResult && (
            <Card>
              <CardHeader>
                <CardTitle>Resultado da Simulação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-blue-900">Clientes</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">
                      {simulationResult.totalCustomersCurrent} → {simulationResult.totalCustomersNew}
                    </p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-purple-900">Taxa de Utilização</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-700">
                      {simulationResult.utilizationCurrent.toFixed(1)}% → {simulationResult.utilizationNew.toFixed(1)}%
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-900">Capacidade Disponível</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700">
                      {simulationResult.capacityAvailable.toFixed(0)} kWh
                    </p>
                  </div>

                  {newCustomerBill && (
                    <div className="p-4 bg-amber-50 rounded-lg">
                      <p className="text-sm font-semibold text-amber-900 mb-1">Novo Cliente Receberia:</p>
                      <p className="text-2xl font-bold text-amber-700">
                        {simulationResult.newCustomerAllocation.toFixed(2)} kWh/mês
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {simulationResult && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Impacto nos Clientes Existentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Cliente</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Alocação Atual</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Nova Alocação</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Impacto</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Variação %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulationResult.results.map((result, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm">
                          <p className="font-medium">{result.name}</p>
                          <p className="text-xs text-slate-500">{result.email}</p>
                        </td>
                        <td className="py-3 px-4 text-right text-sm">{result.currentAllocation.toFixed(2)} kWh</td>
                        <td className="py-3 px-4 text-right text-sm font-medium">{result.newAllocation.toFixed(2)} kWh</td>
                        <td className="py-3 px-4 text-right text-sm">
                          <span className={result.impact >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {result.impact >= 0 ? '+' : ''}{result.impact.toFixed(2)} kWh
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Badge className={result.impact >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {result.impactPercent >= 0 ? '+' : ''}{result.impactPercent.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}