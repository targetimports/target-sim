import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Plus, ArrowLeft, DollarSign, Calendar, TrendingUp, 
  CheckCircle, Clock, AlertCircle, Search
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, addDays } from 'date-fns';

export default function PlantOwnerContracts() {
  const queryClient = useQueryClient();
  const [selectedContract, setSelectedContract] = useState(null);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [contractData, setContractData] = useState({
    plant_owner_id: '',
    power_plant_id: '',
    contract_number: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 365), 'yyyy-MM-dd'),
    price_per_kwh: 0,
    minimum_monthly_purchase: 0,
    payment_terms: '30_days',
    payment_method: 'bank_transfer',
    indexation: 'none',
    automatic_renewal: false
  });

  const [paymentData, setPaymentData] = useState({
    contract_id: '',
    plant_owner_id: '',
    reference_period: format(new Date(), 'yyyy-MM'),
    energy_kwh: 0,
    base_amount: 0,
    bonus_amount: 0,
    penalty_amount: 0
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['proprietario-contratos'],
    queryFn: () => base44.entities.ProprietarioContrato.list('-created_date')
  });

  const { data: owners = [] } = useQuery({
    queryKey: ['plant-owners'],
    queryFn: () => base44.entities.PlantOwner.list()
  });

  const { data: plants = [] } = useQuery({
    queryKey: ['plants'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['owner-payments'],
    queryFn: () => base44.entities.OwnerPaymentHistory.list('-created_date', 200)
  });

  const createContract = useMutation({
    mutationFn: (data) => base44.entities.ProprietarioContrato.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['proprietario-contratos']);
      setShowContractDialog(false);
      setContractData({
        plant_owner_id: '',
        power_plant_id: '',
        contract_number: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(addDays(new Date(), 365), 'yyyy-MM-dd'),
        price_per_kwh: 0,
        minimum_monthly_purchase: 0,
        payment_terms: '30_days',
        payment_method: 'bank_transfer',
        indexation: 'none',
        automatic_renewal: false
      });
    }
  });

  const createPayment = useMutation({
    mutationFn: async (data) => {
      const daysMap = {
        'immediate': 0,
        '15_days': 15,
        '30_days': 30,
        '45_days': 45,
        '60_days': 60
      };
      const contract = contracts.find(c => c.id === data.contract_id);
      const days = contract ? daysMap[contract.payment_terms] || 30 : 30;
      
      const total = data.base_amount + data.bonus_amount - data.penalty_amount;
      
      return await base44.entities.OwnerPaymentHistory.create({
        ...data,
        total_amount: total,
        due_date: format(addDays(new Date(), days), 'yyyy-MM-dd'),
        status: 'pending'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['owner-payments']);
      setShowPaymentDialog(false);
    }
  });

  const updatePaymentStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.OwnerPaymentHistory.update(id, {
      status,
      payment_date: status === 'paid' ? format(new Date(), 'yyyy-MM-dd') : null
    }),
    onSuccess: () => queryClient.invalidateQueries(['owner-payments'])
  });

  const filteredContracts = contracts.filter(c => {
    const owner = owners.find(o => o.id === c.plant_owner_id);
    const plant = plants.find(p => p.id === c.power_plant_id);
    return owner?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           plant?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           c.contract_number?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const activeContracts = contracts.filter(c => c.status === 'active').length;
  const totalPayments = payments.reduce((sum, p) => sum + (p.total_amount || 0), 0);
  const pendingPayments = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.total_amount || 0), 0);
  const overduePayments = payments.filter(p => p.status === 'overdue').length;

  const paymentTermsLabels = {
    'immediate': 'À vista',
    '15_days': '15 dias',
    '30_days': '30 dias',
    '45_days': '45 dias',
    '60_days': '60 dias'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('FinancialDashboard')}>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Contratos de Proprietários</h1>
                <p className="text-amber-400 text-sm">Gestão completa de contratos e pagamentos</p>
              </div>
            </div>
            <Button onClick={() => setShowContractDialog(true)} className="bg-amber-500 hover:bg-amber-600">
              <Plus className="w-4 h-4 mr-2" />
              Novo Contrato
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid sm:grid-cols-4 gap-6 mb-8">
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
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Pago</p>
                  <p className="text-2xl font-bold">R$ {totalPayments.toFixed(0)}</p>
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
                  <p className="text-2xl font-bold">R$ {pendingPayments.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Atrasados</p>
                  <p className="text-2xl font-bold">{overduePayments}</p>
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
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                  <CardTitle>Contratos Cadastrados</CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Buscar contrato..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredContracts.map((contract) => {
                    const owner = owners.find(o => o.id === contract.plant_owner_id);
                    const plant = plants.find(p => p.id === contract.power_plant_id);
                    const contractPayments = payments.filter(p => p.contract_id === contract.id);
                    
                    return (
                      <Card key={contract.id} className="border border-slate-200">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-bold">{owner?.name}</h3>
                                <Badge className={
                                  contract.status === 'active' ? 'bg-green-100 text-green-800' :
                                  contract.status === 'expired' ? 'bg-slate-100 text-slate-800' :
                                  'bg-red-100 text-red-800'
                                }>
                                  {contract.status === 'active' ? 'Ativo' :
                                   contract.status === 'expired' ? 'Expirado' :
                                   contract.status === 'suspended' ? 'Suspenso' : 'Cancelado'}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-500">
                                Contrato: {contract.contract_number || 'N/A'} • Usina: {plant?.name}
                              </p>
                            </div>
                            <Button 
                              size="sm" 
                              onClick={() => {
                                setPaymentData({
                                  contract_id: contract.id,
                                  plant_owner_id: contract.plant_owner_id,
                                  reference_period: format(new Date(), 'yyyy-MM'),
                                  energy_kwh: contract.minimum_monthly_purchase || 0,
                                  base_amount: (contract.minimum_monthly_purchase || 0) * contract.price_per_kwh,
                                  bonus_amount: 0,
                                  penalty_amount: 0
                                });
                                setShowPaymentDialog(true);
                              }}
                              className="bg-amber-500 hover:bg-amber-600"
                            >
                              Registrar Pagamento
                            </Button>
                          </div>

                          <div className="grid md:grid-cols-4 gap-4 mb-4">
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-xs text-slate-500 mb-1">Preço/kWh</p>
                              <p className="font-semibold">R$ {contract.price_per_kwh?.toFixed(3)}</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-xs text-slate-500 mb-1">Compra Mínima</p>
                              <p className="font-semibold">{contract.minimum_monthly_purchase || 0} kWh</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-xs text-slate-500 mb-1">Prazo Pagamento</p>
                              <p className="font-semibold">{paymentTermsLabels[contract.payment_terms]}</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-xs text-slate-500 mb-1">Indexação</p>
                              <p className="font-semibold">{contract.indexation === 'none' ? 'Nenhuma' : contract.indexation?.toUpperCase()}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-4 text-slate-600">
                              <span>Início: {contract.start_date && format(new Date(contract.start_date), 'dd/MM/yyyy')}</span>
                              <span>•</span>
                              <span>Término: {contract.end_date && format(new Date(contract.end_date), 'dd/MM/yyyy')}</span>
                            </div>
                            <div className="text-slate-600">
                              Pagamentos: {contractPayments.length}
                            </div>
                          </div>

                          {contract.special_terms && (
                            <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                              <p className="text-xs text-slate-600 mb-1 font-medium">Termos Especiais:</p>
                              <p className="text-sm text-slate-700">{contract.special_terms}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Histórico de Pagamentos aos Proprietários</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Proprietário</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Período</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Energia (kWh)</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Base</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Bônus</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Penalidade</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Total</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Vencimento</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => {
                        const owner = owners.find(o => o.id === payment.plant_owner_id);
                        return (
                          <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-4 px-4 font-medium">{owner?.name}</td>
                            <td className="py-4 px-4 text-sm">{payment.reference_period}</td>
                            <td className="py-4 px-4">{payment.energy_kwh}</td>
                            <td className="py-4 px-4">R$ {payment.base_amount?.toFixed(2)}</td>
                            <td className="py-4 px-4 text-green-600">+ R$ {payment.bonus_amount?.toFixed(2)}</td>
                            <td className="py-4 px-4 text-red-600">- R$ {payment.penalty_amount?.toFixed(2)}</td>
                            <td className="py-4 px-4 font-semibold">R$ {payment.total_amount?.toFixed(2)}</td>
                            <td className="py-4 px-4 text-sm">{payment.due_date && format(new Date(payment.due_date), 'dd/MM/yyyy')}</td>
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
                                  onClick={() => updatePaymentStatus.mutate({ id: payment.id, status: 'paid' })}
                                >
                                  Confirmar Pagamento
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showContractDialog} onOpenChange={setShowContractDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Contrato de Proprietário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                <Label>Usina</Label>
                <Select value={contractData.power_plant_id} onValueChange={(v) => setContractData(prev => ({ ...prev, power_plant_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {plants.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Número do Contrato</Label>
                <Input value={contractData.contract_number} onChange={(e) => setContractData(prev => ({ ...prev, contract_number: e.target.value }))} />
              </div>
              <div>
                <Label>Preço/kWh (R$) *</Label>
                <Input type="number" step="0.001" value={contractData.price_per_kwh} onChange={(e) => setContractData(prev => ({ ...prev, price_per_kwh: parseFloat(e.target.value) }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Início *</Label>
                <Input type="date" value={contractData.start_date} onChange={(e) => setContractData(prev => ({ ...prev, start_date: e.target.value }))} />
              </div>
              <div>
                <Label>Data de Término</Label>
                <Input type="date" value={contractData.end_date} onChange={(e) => setContractData(prev => ({ ...prev, end_date: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label>Compra Mínima Mensal (kWh)</Label>
              <Input type="number" value={contractData.minimum_monthly_purchase} onChange={(e) => setContractData(prev => ({ ...prev, minimum_monthly_purchase: parseFloat(e.target.value) }))} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prazo de Pagamento *</Label>
                <Select value={contractData.payment_terms} onValueChange={(v) => setContractData(prev => ({ ...prev, payment_terms: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">À vista</SelectItem>
                    <SelectItem value="15_days">15 dias</SelectItem>
                    <SelectItem value="30_days">30 dias</SelectItem>
                    <SelectItem value="45_days">45 dias</SelectItem>
                    <SelectItem value="60_days">60 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={contractData.payment_method} onValueChange={(v) => setContractData(prev => ({ ...prev, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Transferência</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="bank_slip">Boleto</SelectItem>
                    <SelectItem value="check">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Indexação</Label>
              <Select value={contractData.indexation} onValueChange={(v) => setContractData(prev => ({ ...prev, indexation: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="ipca">IPCA</SelectItem>
                  <SelectItem value="igpm">IGP-M</SelectItem>
                  <SelectItem value="inpc">INPC</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <Label>Renovação Automática</Label>
              <Switch checked={contractData.automatic_renewal} onCheckedChange={(checked) => setContractData(prev => ({ ...prev, automatic_renewal: checked }))} />
            </div>

            <Button className="w-full bg-amber-500 hover:bg-amber-600" onClick={() => createContract.mutate(contractData)}>
              Criar Contrato
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento ao Proprietário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Período de Referência *</Label>
              <Input type="month" value={paymentData.reference_period} onChange={(e) => setPaymentData(prev => ({ ...prev, reference_period: e.target.value }))} />
            </div>
            <div>
              <Label>Energia (kWh) *</Label>
              <Input type="number" value={paymentData.energy_kwh} onChange={(e) => setPaymentData(prev => ({ ...prev, energy_kwh: parseFloat(e.target.value) }))} />
            </div>
            <div>
              <Label>Valor Base (R$) *</Label>
              <Input type="number" value={paymentData.base_amount} onChange={(e) => setPaymentData(prev => ({ ...prev, base_amount: parseFloat(e.target.value) }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bônus (R$)</Label>
                <Input type="number" value={paymentData.bonus_amount} onChange={(e) => setPaymentData(prev => ({ ...prev, bonus_amount: parseFloat(e.target.value) }))} />
              </div>
              <div>
                <Label>Penalidade (R$)</Label>
                <Input type="number" value={paymentData.penalty_amount} onChange={(e) => setPaymentData(prev => ({ ...prev, penalty_amount: parseFloat(e.target.value) }))} />
              </div>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl">
              <p className="text-sm text-slate-600 mb-1">Total a Pagar</p>
              <p className="text-2xl font-bold">R$ {(paymentData.base_amount + paymentData.bonus_amount - paymentData.penalty_amount).toFixed(2)}</p>
            </div>
            <Button className="w-full bg-amber-500 hover:bg-amber-600" onClick={() => createPayment.mutate(paymentData)}>
              Registrar Pagamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}