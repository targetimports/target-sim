import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  FileText, Plus, AlertTriangle, CheckCircle, Clock,
  TrendingDown, Zap, ArrowRight, Battery, Sun, Search
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

export default function ContractManagement() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    subscription_id: '',
    power_plant_id: '',
    contract_number: '',
    allocation_type: 'monthly_generation',
    allocation_percentage: 0,
    fixed_kwh_month: 0,
    accumulated_balance_kwh: 0,
    start_date: '',
    end_date: '',
    next_plant_id: '',
    auto_transfer: false,
    priority: 1
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list('-created_date', 200)
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions-list'],
    queryFn: () => base44.entities.Subscription.list()
  });

  const { data: plants = [] } = useQuery({
    queryKey: ['plants-list'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const createContract = useMutation({
    mutationFn: (data) => {
      const remaining = data.allocation_type === 'accumulated_balance' 
        ? data.accumulated_balance_kwh 
        : null;
      return base44.entities.Contract.create({
        ...data,
        remaining_balance_kwh: remaining,
        consumed_balance_kwh: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['contracts']);
      setShowDialog(false);
      resetForm();
    }
  });

  const updateContractStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Contract.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries(['contracts'])
  });

  const consumeBalance = useMutation({
    mutationFn: async ({ contractId, consumptionKwh }) => {
      const contract = contracts.find(c => c.id === contractId);
      const newConsumed = (contract.consumed_balance_kwh || 0) + consumptionKwh;
      const newRemaining = (contract.accumulated_balance_kwh || 0) - newConsumed;
      
      const updates = {
        consumed_balance_kwh: newConsumed,
        remaining_balance_kwh: Math.max(0, newRemaining)
      };

      if (newRemaining <= 0 && contract.auto_transfer && contract.next_plant_id) {
        updates.status = 'depleted';
        // Create new contract with next plant
        await base44.entities.Contract.create({
          subscription_id: contract.subscription_id,
          power_plant_id: contract.next_plant_id,
          allocation_type: contract.allocation_type,
          allocation_percentage: contract.allocation_percentage,
          start_date: new Date().toISOString().split('T')[0],
          status: 'active',
          priority: contract.priority
        });
      } else if (newRemaining <= 0) {
        updates.status = 'depleted';
      }

      return base44.entities.Contract.update(contractId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['contracts']);
    }
  });

  const resetForm = () => {
    setFormData({
      subscription_id: '',
      power_plant_id: '',
      contract_number: '',
      allocation_type: 'monthly_generation',
      allocation_percentage: 0,
      fixed_kwh_month: 0,
      accumulated_balance_kwh: 0,
      start_date: '',
      end_date: '',
      next_plant_id: '',
      auto_transfer: false,
      priority: 1
    });
  };

  const filteredContracts = contracts.filter(c => {
    const sub = subscriptions.find(s => s.id === c.subscription_id);
    return searchTerm === '' || 
      sub?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contract_number?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const activeContracts = contracts.filter(c => c.status === 'active').length;
  const depletedContracts = contracts.filter(c => c.status === 'depleted').length;
  const totalAllocated = contracts
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + (c.allocation_percentage || 0), 0);

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    depleted: 'bg-red-100 text-red-800',
    expired: 'bg-slate-100 text-slate-800',
    cancelled: 'bg-slate-100 text-slate-800',
    pending_transfer: 'bg-yellow-100 text-yellow-800'
  };

  const statusLabels = {
    active: 'Ativo',
    depleted: 'Esgotado',
    expired: 'Expirado',
    cancelled: 'Cancelado',
    pending_transfer: 'Aguardando Transferência'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Gestão de Contratos</h1>
              <p className="text-amber-400 text-sm">Controle de geração, rateio e saldo acumulado</p>
            </div>
            <Button onClick={() => setShowDialog(true)} className="bg-amber-500 hover:bg-amber-600">
              <Plus className="w-4 h-4 mr-2" />
              Novo Contrato
            </Button>
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
                  <p className="text-sm text-slate-500">Total Contratos</p>
                  <p className="text-3xl font-bold">{contracts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Ativos</p>
                  <p className="text-3xl font-bold">{activeContracts}</p>
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
                  <p className="text-sm text-slate-500">Esgotados</p>
                  <p className="text-3xl font-bold">{depletedContracts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Alocação Total</p>
                  <p className="text-3xl font-bold">{totalAllocated.toFixed(0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Buscar por cliente ou número do contrato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Contracts List */}
        <div className="space-y-4">
          {filteredContracts.map((contract) => {
            const sub = subscriptions.find(s => s.id === contract.subscription_id);
            const plant = plants.find(p => p.id === contract.power_plant_id);
            const nextPlant = plants.find(p => p.id === contract.next_plant_id);
            const balancePercent = contract.allocation_type === 'accumulated_balance'
              ? ((contract.remaining_balance_kwh || 0) / (contract.accumulated_balance_kwh || 1)) * 100
              : null;

            return (
              <motion.div key={contract.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {sub?.customer_name || 'Cliente não encontrado'}
                          </h3>
                          <Badge className={statusColors[contract.status]}>
                            {statusLabels[contract.status]}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500 mb-1">
                          Contrato: {contract.contract_number || contract.id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-slate-600">
                          Usina: {plant?.name || 'N/A'} ({plant?.type})
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-2">
                          {contract.allocation_type === 'monthly_generation' ? 'Geração Mensal' : 'Saldo Acumulado'}
                        </Badge>
                        <p className="text-xs text-slate-500">
                          Prioridade: {contract.priority}
                        </p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      {contract.allocation_type === 'monthly_generation' ? (
                        <>
                          <div className="p-4 bg-slate-50 rounded-xl">
                            <p className="text-sm text-slate-500 mb-1">Alocação</p>
                            <p className="text-2xl font-bold text-slate-900">{contract.allocation_percentage}%</p>
                          </div>
                          {contract.fixed_kwh_month > 0 && (
                            <div className="p-4 bg-slate-50 rounded-xl">
                              <p className="text-sm text-slate-500 mb-1">kWh Fixo/Mês</p>
                              <p className="text-2xl font-bold text-slate-900">{contract.fixed_kwh_month}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="p-4 bg-amber-50 rounded-xl">
                            <p className="text-sm text-slate-500 mb-1">Saldo Inicial</p>
                            <p className="text-2xl font-bold text-amber-600">{contract.accumulated_balance_kwh} kWh</p>
                          </div>
                          <div className="p-4 bg-blue-50 rounded-xl">
                            <p className="text-sm text-slate-500 mb-1">Consumido</p>
                            <p className="text-2xl font-bold text-blue-600">{contract.consumed_balance_kwh || 0} kWh</p>
                          </div>
                          <div className="p-4 bg-green-50 rounded-xl">
                            <p className="text-sm text-slate-500 mb-1">Restante</p>
                            <p className="text-2xl font-bold text-green-600">{contract.remaining_balance_kwh || 0} kWh</p>
                          </div>
                        </>
                      )}
                    </div>

                    {contract.allocation_type === 'accumulated_balance' && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-500">Progresso de consumo</span>
                          <span className="font-semibold">{balancePercent?.toFixed(1)}% restante</span>
                        </div>
                        <Progress value={balancePercent} className="h-3" />
                      </div>
                    )}

                    {contract.auto_transfer && contract.next_plant_id && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-xl flex items-center gap-3">
                        <ArrowRight className="w-5 h-5 text-blue-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900">Transferência Automática</p>
                          <p className="text-xs text-blue-600">Próxima usina: {nextPlant?.name}</p>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedContract(contract)}
                      >
                        Ver Detalhes
                      </Button>
                      {contract.allocation_type === 'accumulated_balance' && contract.status === 'active' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            const consumption = parseFloat(prompt('Quantidade consumida (kWh):') || '0');
                            if (consumption > 0) {
                              consumeBalance.mutate({ contractId: contract.id, consumptionKwh: consumption });
                            }
                          }}
                        >
                          <TrendingDown className="w-4 h-4 mr-2" />
                          Registrar Consumo
                        </Button>
                      )}
                      {contract.status === 'depleted' && (
                        <Button 
                          size="sm" 
                          className="bg-amber-500 hover:bg-amber-600"
                          onClick={() => updateContractStatus.mutate({ id: contract.id, status: 'pending_transfer' })}
                        >
                          Realocar Cliente
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Cliente *</Label>
                <Select value={formData.subscription_id} onValueChange={(v) => setFormData(prev => ({ ...prev, subscription_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {subscriptions.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.customer_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Usina *</Label>
                <Select value={formData.power_plant_id} onValueChange={(v) => setFormData(prev => ({ ...prev, power_plant_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {plants.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Número do Contrato</Label>
              <Input
                value={formData.contract_number}
                onChange={(e) => setFormData(prev => ({ ...prev, contract_number: e.target.value }))}
                placeholder="CT-2024-001"
              />
            </div>

            <div>
              <Label>Tipo de Alocação *</Label>
              <Select value={formData.allocation_type} onValueChange={(v) => setFormData(prev => ({ ...prev, allocation_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly_generation">Geração Mensal</SelectItem>
                  <SelectItem value="accumulated_balance">Saldo Acumulado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.allocation_type === 'monthly_generation' ? (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Percentual de Alocação (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.allocation_percentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, allocation_percentage: parseFloat(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>kWh Fixo Mensal (opcional)</Label>
                  <Input
                    type="number"
                    value={formData.fixed_kwh_month}
                    onChange={(e) => setFormData(prev => ({ ...prev, fixed_kwh_month: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>
            ) : (
              <div>
                <Label>Saldo Acumulado (kWh) *</Label>
                <Input
                  type="number"
                  value={formData.accumulated_balance_kwh}
                  onChange={(e) => setFormData(prev => ({ ...prev, accumulated_balance_kwh: parseFloat(e.target.value) }))}
                />
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Data Início *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Prioridade</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <Label>Transferência Automática ao Esgotar</Label>
                <Switch
                  checked={formData.auto_transfer}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_transfer: checked }))}
                />
              </div>
              {formData.auto_transfer && (
                <div>
                  <Label>Próxima Usina</Label>
                  <Select value={formData.next_plant_id} onValueChange={(v) => setFormData(prev => ({ ...prev, next_plant_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a usina de destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {plants.filter(p => p.id !== formData.power_plant_id).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Button className="w-full bg-amber-500 hover:bg-amber-600" onClick={() => createContract.mutate(formData)}>
              Criar Contrato
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      {selectedContract && (
        <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Contrato</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Cliente</p>
                  <p className="font-semibold">{subscriptions.find(s => s.id === selectedContract.subscription_id)?.customer_name}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Usina</p>
                  <p className="font-semibold">{plants.find(p => p.id === selectedContract.power_plant_id)?.name}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Tipo</p>
                  <p className="font-semibold">{selectedContract.allocation_type === 'monthly_generation' ? 'Geração Mensal' : 'Saldo Acumulado'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Status</p>
                  <Badge className={statusColors[selectedContract.status]}>{statusLabels[selectedContract.status]}</Badge>
                </div>
              </div>
              {selectedContract.notes && (
                <div className="p-4 bg-amber-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Observações</p>
                  <p className="text-sm">{selectedContract.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}