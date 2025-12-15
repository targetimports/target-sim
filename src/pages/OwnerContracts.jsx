import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, ArrowLeft, FileText, DollarSign, Calendar, 
  TrendingUp, CheckCircle, Clock, AlertCircle 
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, addDays } from 'date-fns';

export default function OwnerContracts() {
  const queryClient = useQueryClient();
  const [selectedContract, setSelectedContract] = useState(null);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [contractData, setContractData] = useState({
    plant_owner_id: '',
    contract_number: '',
    start_date: '',
    end_date: '',
    price_per_kwh: 0.08,
    minimum_monthly_kwh: 0,
    payment_terms: 'net_30',
    payment_method: 'bank_transfer',
    adjustment_index: 'none',
    bonus_per_kwh: 0
  });
  const [paymentData, setPaymentData] = useState({
    plant_owner_id: '',
    owner_contract_id: '',
    energy_kwh: 0,
    price_per_kwh: 0,
    reference_month: format(new Date(), 'yyyy-MM')
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['owner-contracts'],
    queryFn: () => base44.entities.OwnerContract.list('-created_date')
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['owner-payments'],
    queryFn: () => base44.entities.OwnerPayment.list('-created_date', 300)
  });

  const { data: owners = [] } = useQuery({
    queryKey: ['plant-owners'],
    queryFn: () => base44.entities.PlantOwner.list()
  });

  const createContract = useMutation({
    mutationFn: (data) => base44.entities.OwnerContract.create({ ...data, status: 'active' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['owner-contracts']);
      setShowContractDialog(false);
      resetContractForm();
    }
  });

  const createPayment = useMutation({
    mutationFn: async (data) => {
      const contract = contracts.find(c => c.id === data.owner_contract_id);
      const baseAmount = data.energy_kwh * data.price_per_kwh;
      const bonusAmount = contract?.bonus_per_kwh && data.energy_kwh > (contract.minimum_monthly_kwh || 0) 
        ? (data.energy_kwh - contract.minimum_monthly_kwh) * contract.bonus_per_kwh 
        : 0;
      const totalAmount = baseAmount + bonusAmount;
      
      const paymentTermsDays = {
        immediate: 0,
        net_15: 15,
        net_30: 30,
        net_45: 45,
        net_60: 60
      };
      const dueDate = addDays(new Date(), paymentTermsDays[contract?.payment_terms || 'net_30']);

      const payment = await base44.entities.OwnerPayment.create({
        ...data,
        base_amount: baseAmount,
        bonus_amount: bonusAmount,
        total_amount: totalAmount,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending'
      });

      // Update contract totals
      await base44.entities.OwnerContract.update(data.owner_contract_id, {
        total_purchased_kwh: (contract.total_purchased_kwh || 0) + data.energy_kwh,
        total_paid: (contract.total_paid || 0) + totalAmount
      });

      // Create accounts payable
      await base44.entities.AccountsPayable.create({
        supplier_name: owners.find(o => o.id === data.plant_owner_id)?.name,
        description: `Pagamento energia - ${data.reference_month}`,
        amount: totalAmount,
        due_date: dueDate.toISOString().split('T')[0],
        category: 'energy_purchase',
        reference_id: payment.id,
        status: 'pending'
      });

      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['owner-payments']);
      queryClient.invalidateQueries(['owner-contracts']);
      queryClient.invalidateQueries(['accounts-payable']);
      setShowPaymentDialog(false);
      resetPaymentForm();
    }
  });

  const markPaymentAsPaid = useMutation({
    mutationFn: async ({ id }) => {
      const payment = await base44.entities.OwnerPayment.update(id, {
        status: 'paid',
        payment_date: new Date().toISOString().split('T')[0]
      });
      
      // Update accounts payable
      const payables = await base44.entities.AccountsPayable.filter({ reference_id: id });
      if (payables.length > 0) {
        await base44.entities.AccountsPayable.update(payables[0].id, {
          status: 'paid',
          payment_date: new Date().toISOString().split('T')[0]
        });
      }
      
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['owner-payments']);
      queryClient.invalidateQueries(['accounts-payable']);
    }
  });

  const resetContractForm = () => {
    setContractData({
      plant_owner_id: '',
      contract_number: '',
      start_date: '',
      end_date: '',
      price_per_kwh: 0.08,
      minimum_monthly_kwh: 0,
      payment_terms: 'net_30',
      payment_method: 'bank_transfer',
      adjustment_index: 'none',
      bonus_per_kwh: 0
    });
  };

  const resetPaymentForm = () => {
    setPaymentData({
      plant_owner_id: '',
      owner_contract_id: '',
      energy_kwh: 0,
      price_per_kwh: 0,
      reference_month: format(new Date(), 'yyyy-MM')
    });
  };

  const activeContracts = contracts.filter(c => c.status === 'active').length;
  const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.total_amount || 0), 0);
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.total_amount || 0), 0);

  const paymentTermsLabels = {
    immediate: 'À vista',
    net_15: '15 dias',
    net_30: '30 dias',
    net_45: '45 dias',
    net_60: '60 dias'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('EnergyPurchaseManagement')}>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Contratos com Proprietários</h1>
                <p className="text-amber-400 text-sm">Gestão de termos contratuais e histórico de pagamentos</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setShowPaymentDialog(true)} variant="outline" className="border-white/20 text-white">
                <DollarSign className="w-4 h-4 mr-2" />
                Registrar Pagamento
              </Button>
              <Button onClick={() => setShowContractDialog(true)} className="bg-amber-500 hover:bg-amber-600">
                <Plus className="w-4 h-4 mr-2" />
                Novo Contrato
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid sm:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Contratos Ativos</p>
                  <p className="text-2xl font-bold">{activeContracts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pendente</p>
                  <p className="text-2xl font-bold">R$ {totalPending.toFixed(2)}</p>
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
                  <p className="text-sm text-slate-500">Total Pago</p>
                  <p className="text-2xl font-bold">R$ {totalPaid.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="contracts" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1">
            <TabsTrigger value="contracts">Contratos</TabsTrigger>
            <TabsTrigger value="payments">Histórico de Pagamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="contracts">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contracts.map((contract) => {
                const owner = owners.find(o => o.id === contract.plant_owner_id);
                const contractPayments = payments.filter(p => p.owner_contract_id === contract.id);
                const pendingPayments = contractPayments.filter(p => p.status === 'pending').length;

                return (
                  <Card key={contract.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{owner?.name}</CardTitle>
                          <p className="text-sm text-slate-500">Contrato #{contract.contract_number}</p>
                        </div>
                        <Badge className={
                          contract.status === 'active' ? 'bg-green-100 text-green-800' :
                          contract.status === 'expired' ? 'bg-red-100 text-red-800' :
                          'bg-slate-100 text-slate-800'
                        }>
                          {contract.status === 'active' ? 'Ativo' :
                           contract.status === 'expired' ? 'Expirado' :
                           contract.status === 'suspended' ? 'Suspenso' : contract.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="p-3 bg-amber-50 rounded-lg">
                          <p className="text-xs text-slate-500 mb-1">Preço por kWh</p>
                          <p className="text-2xl font-bold text-amber-600">R$ {contract.price_per_kwh?.toFixed(3)}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-slate-500">Prazo</p>
                            <p className="font-medium">{paymentTermsLabels[contract.payment_terms]}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Forma</p>
                            <p className="font-medium">
                              {contract.payment_method === 'bank_transfer' ? 'Transferência' :
                               contract.payment_method === 'pix' ? 'PIX' :
                               contract.payment_method === 'bank_slip' ? 'Boleto' : 'Crédito'}
                            </p>
                          </div>
                        </div>

                        {contract.minimum_monthly_kwh > 0 && (
                          <div className="text-sm">
                            <p className="text-slate-500">Compra mínima mensal</p>
                            <p className="font-medium">{contract.minimum_monthly_kwh} kWh</p>
                          </div>
                        )}

                        {contract.bonus_per_kwh > 0 && (
                          <div className="text-sm p-2 bg-green-50 rounded">
                            <p className="text-green-700">Bônus: R$ {contract.bonus_per_kwh.toFixed(3)}/kWh acima do mínimo</p>
                          </div>
                        )}

                        <div className="pt-3 border-t border-slate-100 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Total comprado</span>
                            <span className="font-medium">{contract.total_purchased_kwh || 0} kWh</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Total pago</span>
                            <span className="font-medium">R$ {(contract.total_paid || 0).toFixed(2)}</span>
                          </div>
                        </div>

                        {pendingPayments > 0 && (
                          <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded text-sm">
                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                            <span className="text-yellow-700">{pendingPayments} pagamento(s) pendente(s)</span>
                          </div>
                        )}

                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => setSelectedContract(contract)}
                        >
                          Ver Detalhes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Histórico de Pagamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Proprietário</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Referência</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Energia</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Valor Base</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Bônus</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Total</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Vencimento</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-4 px-4 font-medium">
                            {owners.find(o => o.id === payment.plant_owner_id)?.name}
                          </td>
                          <td className="py-4 px-4 text-sm">{payment.reference_month}</td>
                          <td className="py-4 px-4">{payment.energy_kwh} kWh</td>
                          <td className="py-4 px-4">R$ {payment.base_amount?.toFixed(2)}</td>
                          <td className="py-4 px-4 text-green-600">
                            {payment.bonus_amount > 0 ? `+ R$ ${payment.bonus_amount.toFixed(2)}` : '-'}
                          </td>
                          <td className="py-4 px-4 font-semibold">R$ {payment.total_amount?.toFixed(2)}</td>
                          <td className="py-4 px-4 text-sm">
                            {payment.due_date && format(new Date(payment.due_date), 'dd/MM/yyyy')}
                          </td>
                          <td className="py-4 px-4">
                            <Badge className={
                              payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                              payment.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {payment.status === 'paid' ? 'Pago' :
                               payment.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            {payment.status === 'pending' && (
                              <Button 
                                size="sm" 
                                onClick={() => markPaymentAsPaid.mutate({ id: payment.id })}
                              >
                                Confirmar Pagamento
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Contract Dialog */}
      <Dialog open={showContractDialog} onOpenChange={setShowContractDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Proprietário *</Label>
                <Select value={contractData.plant_owner_id} onValueChange={(v) => setContractData(prev => ({ ...prev, plant_owner_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {owners.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Número do Contrato</Label>
                <Input value={contractData.contract_number} onChange={(e) => setContractData(prev => ({ ...prev, contract_number: e.target.value }))} />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Data de Início *</Label>
                <Input type="date" value={contractData.start_date} onChange={(e) => setContractData(prev => ({ ...prev, start_date: e.target.value }))} />
              </div>
              <div>
                <Label>Data de Término</Label>
                <Input type="date" value={contractData.end_date} onChange={(e) => setContractData(prev => ({ ...prev, end_date: e.target.value }))} />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Preço por kWh (R$) *</Label>
                <Input type="number" step="0.001" value={contractData.price_per_kwh} onChange={(e) => setContractData(prev => ({ ...prev, price_per_kwh: parseFloat(e.target.value) }))} />
              </div>
              <div>
                <Label>Compra Mínima Mensal (kWh)</Label>
                <Input type="number" value={contractData.minimum_monthly_kwh} onChange={(e) => setContractData(prev => ({ ...prev, minimum_monthly_kwh: parseFloat(e.target.value) }))} />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Prazo de Pagamento *</Label>
                <Select value={contractData.payment_terms} onValueChange={(v) => setContractData(prev => ({ ...prev, payment_terms: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">À vista</SelectItem>
                    <SelectItem value="net_15">15 dias</SelectItem>
                    <SelectItem value="net_30">30 dias</SelectItem>
                    <SelectItem value="net_45">45 dias</SelectItem>
                    <SelectItem value="net_60">60 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={contractData.payment_method} onValueChange={(v) => setContractData(prev => ({ ...prev, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="bank_slip">Boleto</SelectItem>
                    <SelectItem value="credit">Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Índice de Reajuste</Label>
                <Select value={contractData.adjustment_index} onValueChange={(v) => setContractData(prev => ({ ...prev, adjustment_index: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    <SelectItem value="ipca">IPCA</SelectItem>
                    <SelectItem value="igpm">IGP-M</SelectItem>
                    <SelectItem value="fixed">Fixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bônus por kWh acima do mínimo (R$)</Label>
                <Input type="number" step="0.001" value={contractData.bonus_per_kwh} onChange={(e) => setContractData(prev => ({ ...prev, bonus_per_kwh: parseFloat(e.target.value) }))} />
              </div>
            </div>

            <div>
              <Label>Condições Especiais</Label>
              <Textarea 
                value={contractData.special_conditions} 
                onChange={(e) => setContractData(prev => ({ ...prev, special_conditions: e.target.value }))}
                rows={3}
              />
            </div>

            <Button className="w-full bg-amber-500 hover:bg-amber-600" onClick={() => createContract.mutate(contractData)}>
              Criar Contrato
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Contrato *</Label>
              <Select 
                value={paymentData.owner_contract_id} 
                onValueChange={(v) => {
                  const contract = contracts.find(c => c.id === v);
                  setPaymentData(prev => ({ 
                    ...prev, 
                    owner_contract_id: v,
                    plant_owner_id: contract?.plant_owner_id || '',
                    price_per_kwh: contract?.price_per_kwh || 0
                  }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {contracts.filter(c => c.status === 'active').map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {owners.find(o => o.id === c.plant_owner_id)?.name} - #{c.contract_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Mês de Referência *</Label>
              <Input 
                type="month" 
                value={paymentData.reference_month} 
                onChange={(e) => setPaymentData(prev => ({ ...prev, reference_month: e.target.value }))} 
              />
            </div>

            <div>
              <Label>Energia (kWh) *</Label>
              <Input 
                type="number" 
                value={paymentData.energy_kwh} 
                onChange={(e) => setPaymentData(prev => ({ ...prev, energy_kwh: parseFloat(e.target.value) }))} 
              />
            </div>

            {paymentData.owner_contract_id && (
              <div className="p-4 bg-amber-50 rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Valor Base</span>
                  <span className="font-medium">R$ {(paymentData.energy_kwh * paymentData.price_per_kwh).toFixed(2)}</span>
                </div>
                {(() => {
                  const contract = contracts.find(c => c.id === paymentData.owner_contract_id);
                  const bonus = contract?.bonus_per_kwh && paymentData.energy_kwh > (contract.minimum_monthly_kwh || 0)
                    ? (paymentData.energy_kwh - contract.minimum_monthly_kwh) * contract.bonus_per_kwh
                    : 0;
                  return bonus > 0 ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Bônus</span>
                      <span className="font-medium text-green-600">+ R$ {bonus.toFixed(2)}</span>
                    </div>
                  ) : null;
                })()}
                <div className="flex justify-between pt-2 border-t border-amber-200">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-amber-600">
                    R$ {(() => {
                      const contract = contracts.find(c => c.id === paymentData.owner_contract_id);
                      const base = paymentData.energy_kwh * paymentData.price_per_kwh;
                      const bonus = contract?.bonus_per_kwh && paymentData.energy_kwh > (contract.minimum_monthly_kwh || 0)
                        ? (paymentData.energy_kwh - contract.minimum_monthly_kwh) * contract.bonus_per_kwh
                        : 0;
                      return (base + bonus).toFixed(2);
                    })()}
                  </span>
                </div>
              </div>
            )}

            <Button 
              className="w-full bg-amber-500 hover:bg-amber-600" 
              onClick={() => createPayment.mutate(paymentData)}
              disabled={!paymentData.owner_contract_id}
            >
              Registrar Pagamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}