import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TrendingDown, TrendingUp, Zap, ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from 'sonner';

export default function DeficitCompensation() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const { data: reconciliations = [] } = useQuery({
    queryKey: ['reconciliations-compensation', selectedMonth],
    queryFn: () => base44.entities.MonthlyReconciliation.filter({ month_reference: selectedMonth })
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations-compensation', selectedMonth],
    queryFn: () => base44.entities.EnergyAllocation.filter({ month_reference: selectedMonth })
  });

  const { data: balances = [] } = useQuery({
    queryKey: ['balances-compensation'],
    queryFn: () => base44.entities.CreditBalance.list()
  });

  const compensateDeficitMutation = useMutation({
    mutationFn: async (reconciliation) => {
      const deficit = Math.abs(reconciliation.variance_kwh);
      const affectedAllocations = allocations.filter(a => a.power_plant_id === reconciliation.power_plant_id);
      
      const compensations = [];
      for (const allocation of affectedAllocations) {
        const proportionalDeficit = (allocation.allocated_kwh / reconciliation.allocated_kwh) * deficit;
        
        const balance = balances.find(b => b.customer_email === allocation.customer_email);
        if (balance) {
          await base44.entities.CreditBalance.update(balance.id, {
            balance_kwh: balance.balance_kwh - proportionalDeficit
          });
        }

        await base44.entities.CreditTransaction.create({
          customer_email: allocation.customer_email,
          subscription_id: allocation.subscription_id,
          transaction_type: 'compensation',
          amount_kwh: -proportionalDeficit,
          balance_before: balance?.balance_kwh || 0,
          balance_after: (balance?.balance_kwh || 0) - proportionalDeficit,
          reference_id: reconciliation.id,
          description: `Compensação déficit usina ${reconciliation.power_plant_id}`,
          month_reference: selectedMonth
        });

        compensations.push({ email: allocation.customer_email, amount: proportionalDeficit });
      }

      await base44.entities.MonthlyReconciliation.update(reconciliation.id, {
        status: 'completed',
        adjustments_made: true,
        notes: `Compensado déficit de ${deficit.toFixed(2)} kWh entre ${affectedAllocations.length} clientes`
      });

      return compensations;
    },
    onSuccess: (compensations) => {
      queryClient.invalidateQueries(['reconciliations-compensation']);
      queryClient.invalidateQueries(['balances-compensation']);
      toast.success(`Déficit compensado para ${compensations.length} clientes`);
    }
  });

  const distributeExcessMutation = useMutation({
    mutationFn: async (reconciliation) => {
      const excess = reconciliation.variance_kwh;
      const affectedAllocations = allocations.filter(a => a.power_plant_id === reconciliation.power_plant_id);
      
      const distributions = [];
      for (const allocation of affectedAllocations) {
        const proportionalExcess = (allocation.allocated_kwh / reconciliation.allocated_kwh) * excess;
        
        const balance = balances.find(b => b.customer_email === allocation.customer_email);
        if (balance) {
          await base44.entities.CreditBalance.update(balance.id, {
            balance_kwh: balance.balance_kwh + proportionalExcess,
            accumulated_kwh: balance.accumulated_kwh + proportionalExcess
          });
        }

        await base44.entities.CreditTransaction.create({
          customer_email: allocation.customer_email,
          subscription_id: allocation.subscription_id,
          transaction_type: 'compensation',
          amount_kwh: proportionalExcess,
          balance_before: balance?.balance_kwh || 0,
          balance_after: (balance?.balance_kwh || 0) + proportionalExcess,
          reference_id: reconciliation.id,
          description: `Bônus excedente usina ${reconciliation.power_plant_id}`,
          month_reference: selectedMonth
        });

        distributions.push({ email: allocation.customer_email, amount: proportionalExcess });
      }

      await base44.entities.MonthlyReconciliation.update(reconciliation.id, {
        status: 'completed',
        adjustments_made: true,
        notes: `Distribuído excedente de ${excess.toFixed(2)} kWh entre ${affectedAllocations.length} clientes`
      });

      return distributions;
    },
    onSuccess: (distributions) => {
      queryClient.invalidateQueries(['reconciliations-compensation']);
      queryClient.invalidateQueries(['balances-compensation']);
      toast.success(`Excedente distribuído para ${distributions.length} clientes`);
    }
  });

  const deficits = reconciliations.filter(r => r.variance_kwh < 0 && r.status !== 'completed');
  const excesses = reconciliations.filter(r => r.variance_kwh > 0 && r.status !== 'completed');
  const completed = reconciliations.filter(r => r.status === 'completed');

  const totalDeficit = deficits.reduce((sum, r) => sum + Math.abs(r.variance_kwh), 0);
  const totalExcess = excesses.reduce((sum, r) => sum + r.variance_kwh, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-blue-900 to-cyan-900 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">⚖️ Compensação Déficit/Superávit</h1>
              <p className="text-cyan-100 text-sm">Gestão de variações de geração</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-200 rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-700" />
                </div>
                <div>
                  <p className="text-sm text-red-600">Déficits Pendentes</p>
                  <p className="text-2xl font-bold text-red-700">{totalDeficit.toFixed(0)} kWh</p>
                  <p className="text-xs text-red-600">{deficits.length} ocorrências</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-200 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-700" />
                </div>
                <div>
                  <p className="text-sm text-green-600">Excedentes Pendentes</p>
                  <p className="text-2xl font-bold text-green-700">{totalExcess.toFixed(0)} kWh</p>
                  <p className="text-xs text-green-600">{excesses.length} ocorrências</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-200 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm text-blue-600">Compensações Feitas</p>
                  <p className="text-2xl font-bold text-blue-700">{completed.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <label className="text-sm font-medium mb-2 block">Mês de Referência</label>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {deficits.length > 0 && (
          <Card className="mb-6 border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                Déficits Requerem Compensação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deficits.map((rec) => (
                  <div key={rec.id} className="p-4 bg-red-50 rounded-xl border border-red-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-red-100 text-red-800">Déficit</Badge>
                          <span className="font-bold text-lg text-red-700">
                            {Math.abs(rec.variance_kwh).toFixed(2)} kWh
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">
                          <strong>Usina:</strong> {rec.power_plant_id}
                        </p>
                        <p className="text-sm text-slate-600">
                          Esperado: {rec.expected_generation_kwh?.toFixed(2)} kWh | 
                          Real: {rec.actual_generation_kwh?.toFixed(2)} kWh
                        </p>
                      </div>
                      <Button
                        onClick={() => compensateDeficitMutation.mutate(rec)}
                        disabled={compensateDeficitMutation.isPending}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Compensar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {excesses.length > 0 && (
          <Card className="mb-6 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Zap className="w-5 h-5" />
                Excedentes para Distribuição
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {excesses.map((rec) => (
                  <div key={rec.id} className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-green-100 text-green-800">Excedente</Badge>
                          <span className="font-bold text-lg text-green-700">
                            +{rec.variance_kwh.toFixed(2)} kWh
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">
                          <strong>Usina:</strong> {rec.power_plant_id}
                        </p>
                        <p className="text-sm text-slate-600">
                          Esperado: {rec.expected_generation_kwh?.toFixed(2)} kWh | 
                          Real: {rec.actual_generation_kwh?.toFixed(2)} kWh
                        </p>
                      </div>
                      <Button
                        onClick={() => distributeExcessMutation.mutate(rec)}
                        disabled={distributeExcessMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Distribuir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {completed.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Compensações Concluídas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {completed.map((rec) => (
                  <div key={rec.id} className="p-4 bg-slate-50 rounded-xl border">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <Badge className="bg-blue-100 text-blue-800">Concluído</Badge>
                    </div>
                    <p className="text-sm text-slate-700 mb-1">
                      <strong>Usina:</strong> {rec.power_plant_id}
                    </p>
                    <p className="text-sm text-slate-600">{rec.notes}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {format(new Date(rec.updated_date), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {deficits.length === 0 && excesses.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Tudo em dia!</h3>
              <p className="text-slate-500">Não há déficits ou excedentes pendentes de compensação</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}