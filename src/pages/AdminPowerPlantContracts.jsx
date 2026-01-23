import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, Sun, Users, TrendingDown, AlertTriangle, 
  Plus, ArrowLeft, Gauge, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from 'date-fns';

export default function AdminPowerPlantContracts() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [formData, setFormData] = useState({
    subscription_id: '',
    power_plant_id: '',
    allocation_percentage: 5,
    monthly_allocation_kwh: 0,
    start_date: new Date().toISOString().split('T')[0]
  });
  const [balanceData, setBalanceData] = useState({
    power_plant_id: '',
    initial_balance_kwh: 0
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['power-plant-contracts'],
    queryFn: () => base44.entities.PowerPlantContract.list('-created_date')
  });

  const { data: plants = [] } = useQuery({
    queryKey: ['power-plants'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => base44.entities.Subscription.list()
  });

  const { data: balances = [] } = useQuery({
    queryKey: ['power-plant-balances'],
    queryFn: () => base44.entities.PowerPlantBalance.list()
  });

  const createContract = useMutation({
    mutationFn: (data) => base44.entities.PowerPlantContract.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['power-plant-contracts']);
      setShowDialog(false);
      setFormData({
        subscription_id: '',
        power_plant_id: '',
        allocation_percentage: 5,
        monthly_allocation_kwh: 0,
        start_date: new Date().toISOString().split('T')[0]
      });
    }
  });

  const createBalance = useMutation({
    mutationFn: (data) => base44.entities.PowerPlantBalance.create({
      ...data,
      current_balance_kwh: data.initial_balance_kwh,
      status: 'available'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['power-plant-balances']);
      setShowBalanceDialog(false);
      setBalanceData({ power_plant_id: '', initial_balance_kwh: 0 });
    }
  });

  const updateContractStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.PowerPlantContract.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries(['power-plant-contracts'])
  });

  const reallocateClient = useMutation({
    mutationFn: async ({ contractId, newPlantId }) => {
      const contract = contracts.find(c => c.id === contractId);
      await base44.entities.PowerPlantContract.update(contractId, { status: 'completed' });
      await base44.entities.PowerPlantContract.create({
        subscription_id: contract.subscription_id,
        power_plant_id: newPlantId,
        allocation_percentage: contract.allocation_percentage,
        monthly_allocation_kwh: contract.monthly_allocation_kwh,
        start_date: new Date().toISOString().split('T')[0],
        status: 'active'
      });
    },
    onSuccess: () => queryClient.invalidateQueries(['power-plant-contracts'])
  });

  const getPlantName = (id) => plants.find(p => p.id === id)?.name || 'N/A';
  const getSubscriptionName = (id) => subscriptions.find(s => s.id === id)?.customer_name || 'N/A';
  const getPlantBalance = (plantId) => balances.find(b => b.power_plant_id === plantId);

  const plantStats = plants
    .filter(p => p.status === 'operational')
    .map(plant => {
      const plantContracts = contracts.filter(c => c.power_plant_id === plant.id && c.status === 'active');
      const totalAllocation = plantContracts.reduce((sum, c) => sum + (c.allocation_percentage || 0), 0);
      const balance = getPlantBalance(plant.id);
      return { ...plant, contractCount: plantContracts.length, totalAllocation, balance };
    });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Contratos e Alocação</h1>
                <p className="text-amber-400 text-sm">Gestão de contratos e saldos de usinas</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setShowBalanceDialog(true)} variant="outline" className="border-white/20 text-white">
                <Gauge className="w-4 h-4 mr-2" />
                Configurar Saldo
              </Button>
              <Button onClick={() => setShowDialog(true)} className="bg-amber-500 hover:bg-amber-600">
                <Plus className="w-4 h-4 mr-2" />
                Novo Contrato
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid sm:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Contratos Ativos</p>
                  <p className="text-3xl font-bold">{contracts.filter(c => c.status === 'active').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Sun className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Usinas em Operação</p>
                  <p className="text-3xl font-bold">{plants.filter(p => p.status === 'operational').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Gauge className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Saldo Acumulado</p>
                  <p className="text-3xl font-bold">{balances.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Saldos Críticos</p>
                  <p className="text-3xl font-bold">{balances.filter(b => b.status === 'critical' || b.status === 'low').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plants Overview */}
        <Card className="border-0 shadow-sm mb-8">
          <CardHeader>
            <CardTitle>Visão Geral das Usinas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {plantStats.map((plant) => (
                <div key={plant.id} className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Sun className="w-8 h-8 text-amber-500" />
                      <div>
                        <h3 className="font-semibold text-slate-900">{plant.name}</h3>
                        <p className="text-sm text-slate-500">
                          {plant.operation_mode === 'accumulated_balance' ? 'Saldo Acumulado' : 'Geração Mensal'} • {plant.capacity_kw} kW
                        </p>
                      </div>
                    </div>
                    <Badge className={plant.status === 'operational' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {plant.status === 'operational' ? 'Operacional' : 'Manutenção'}
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Contratos Ativos</p>
                      <p className="text-xl font-bold text-slate-900">{plant.contractCount}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Alocação Total</p>
                      <p className="text-xl font-bold text-amber-600">{plant.totalAllocation.toFixed(1)}%</p>
                    </div>
                    {plant.balance && (
                      <>
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-xs text-slate-500 mb-1">Saldo Atual</p>
                          <p className="text-xl font-bold text-blue-600">{(plant.balance.current_balance_kwh / 1000).toFixed(1)} MWh</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-xs text-slate-500 mb-1">Status Saldo</p>
                          <Badge className={
                            plant.balance.status === 'available' ? 'bg-green-100 text-green-800' :
                            plant.balance.status === 'low' ? 'bg-yellow-100 text-yellow-800' :
                            plant.balance.status === 'critical' ? 'bg-red-100 text-red-800' :
                            'bg-slate-100 text-slate-800'
                          }>
                            {plant.balance.status === 'available' ? 'Disponível' :
                             plant.balance.status === 'low' ? 'Baixo' :
                             plant.balance.status === 'critical' ? 'Crítico' : 'Esgotado'}
                          </Badge>
                        </div>
                      </>
                    )}
                  </div>

                  {plant.balance?.status === 'critical' && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <p className="text-sm text-red-900">
                        <strong>Atenção:</strong> Saldo crítico. Realoque clientes em breve.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contracts List */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Contratos de Alocação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Cliente</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Usina</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Alocação</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Consumido</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Data Início</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((contract) => {
                    const plant = plants.find(p => p.id === contract.power_plant_id);
                    const balance = getPlantBalance(contract.power_plant_id);
                    const needsReallocation = balance?.status === 'critical' || balance?.status === 'depleted';
                    
                    return (
                      <tr key={contract.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-4 px-4">
                          <p className="font-medium text-slate-900">{getSubscriptionName(contract.subscription_id)}</p>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <p className="text-slate-900">{getPlantName(contract.power_plant_id)}</p>
                            {needsReallocation && (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-semibold">{contract.allocation_percentage}%</p>
                          {contract.monthly_allocation_kwh > 0 && (
                            <p className="text-sm text-slate-500">{contract.monthly_allocation_kwh} kWh/mês</p>
                          )}
                        </td>
                        <td className="py-4 px-4 text-slate-600">{(contract.consumed_kwh || 0).toFixed(0)} kWh</td>
                        <td className="py-4 px-4">
                          <Badge className={
                            contract.status === 'active' ? 'bg-green-100 text-green-800' :
                            contract.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                            contract.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-slate-100 text-slate-800'
                          }>
                            {contract.status === 'active' ? 'Ativo' :
                             contract.status === 'suspended' ? 'Suspenso' :
                             contract.status === 'completed' ? 'Concluído' : 'Cancelado'}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-slate-500 text-sm">
                          {contract.start_date ? format(new Date(contract.start_date), 'dd/MM/yyyy') : 'N/A'}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            {contract.status === 'active' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateContractStatus.mutate({ id: contract.id, status: 'suspended' })}
                              >
                                Suspender
                              </Button>
                            )}
                            {needsReallocation && contract.status === 'active' && (
                              <Select onValueChange={(plantId) => reallocateClient.mutate({ contractId: contract.id, newPlantId: plantId })}>
                                <SelectTrigger className="w-32 h-8">
                                  <SelectValue placeholder="Realocar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {plants
                                    .filter(p => p.id !== contract.power_plant_id && p.status === 'operational')
                                    .map(p => (
                                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* New Contract Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Contrato de Alocação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Assinatura *</Label>
              <Select value={formData.subscription_id} onValueChange={(v) => setFormData(prev => ({ ...prev, subscription_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptions.map(sub => (
                    <SelectItem key={sub.id} value={sub.id}>{sub.customer_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Usina *</Label>
              <Select value={formData.power_plant_id} onValueChange={(v) => setFormData(prev => ({ ...prev, power_plant_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a usina" />
                </SelectTrigger>
                <SelectContent>
                  {plants.filter(p => p.status === 'operational').map(plant => (
                    <SelectItem key={plant.id} value={plant.id}>{plant.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Alocação (%) *</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.allocation_percentage}
                  onChange={(e) => setFormData(prev => ({ ...prev, allocation_percentage: parseFloat(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Alocação Mensal (kWh)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.monthly_allocation_kwh}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthly_allocation_kwh: parseFloat(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <Label>Data de Início</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>

            <Button className="w-full bg-amber-500 hover:bg-amber-600" onClick={() => createContract.mutate(formData)}>
              Criar Contrato
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Balance Dialog */}
      <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Saldo Acumulado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Usina *</Label>
              <Select value={balanceData.power_plant_id} onValueChange={(v) => setBalanceData(prev => ({ ...prev, power_plant_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a usina" />
                </SelectTrigger>
                <SelectContent>
                  {plants.filter(p => p.operation_mode === 'accumulated_balance').map(plant => (
                    <SelectItem key={plant.id} value={plant.id}>{plant.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Saldo Inicial (kWh) *</Label>
              <Input
                type="number"
                min="0"
                value={balanceData.initial_balance_kwh}
                onChange={(e) => setBalanceData(prev => ({ ...prev, initial_balance_kwh: parseFloat(e.target.value) }))}
                placeholder="Ex: 100000"
              />
              <p className="text-sm text-slate-500 mt-1">
                Equivalente a {(balanceData.initial_balance_kwh / 1000).toFixed(1)} MWh
              </p>
            </div>

            <Button className="w-full bg-amber-500 hover:bg-amber-600" onClick={() => createBalance.mutate(balanceData)}>
              Configurar Saldo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}