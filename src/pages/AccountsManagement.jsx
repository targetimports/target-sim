import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ArrowLeft, CheckCircle, XCircle, Clock, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from 'date-fns';

export default function AccountsManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showPayableDialog, setShowPayableDialog] = useState(false);
  const [showReceivableDialog, setShowReceivableDialog] = useState(false);
  const [payableData, setPayableData] = useState({
    supplier_name: '',
    description: '',
    amount: 0,
    due_date: '',
    category: 'operational'
  });
  const [receivableData, setReceivableData] = useState({
    customer_name: '',
    description: '',
    amount: 0,
    due_date: ''
  });

  const { data: payables = [] } = useQuery({
    queryKey: ['accounts-payable'],
    queryFn: () => base44.entities.AccountsPayable.list('-due_date', 300)
  });

  const { data: receivables = [] } = useQuery({
    queryKey: ['accounts-receivable'],
    queryFn: () => base44.entities.AccountsReceivable.list('-due_date', 300)
  });

  const createPayable = useMutation({
    mutationFn: async (data) => {
      const payable = await base44.entities.AccountsPayable.create(data);
      // Create financial transaction
      await base44.entities.FinancialTransaction.create({
        transaction_type: 'expense',
        category: data.category,
        description: data.description,
        amount: data.amount,
        reference_id: payable.id,
        reference_type: 'accounts_payable',
        transaction_date: new Date().toISOString().split('T')[0],
        status: 'pending'
      });
      return payable;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts-payable']);
      queryClient.invalidateQueries(['financial-transactions']);
      setShowPayableDialog(false);
      setPayableData({ supplier_name: '', description: '', amount: 0, due_date: '', category: 'operational' });
    }
  });

  const createReceivable = useMutation({
    mutationFn: async (data) => {
      const receivable = await base44.entities.AccountsReceivable.create(data);
      // Create financial transaction
      await base44.entities.FinancialTransaction.create({
        transaction_type: 'revenue',
        category: 'client_subscription',
        description: data.description,
        amount: data.amount,
        reference_id: receivable.id,
        reference_type: 'accounts_receivable',
        transaction_date: new Date().toISOString().split('T')[0],
        status: 'pending'
      });
      return receivable;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts-receivable']);
      queryClient.invalidateQueries(['financial-transactions']);
      setShowReceivableDialog(false);
      setReceivableData({ customer_name: '', description: '', amount: 0, due_date: '' });
    }
  });

  const updatePayableStatus = useMutation({
    mutationFn: async ({ id, status }) => {
      const payable = await base44.entities.AccountsPayable.update(id, {
        status,
        payment_date: status === 'paid' ? new Date().toISOString().split('T')[0] : null
      });
      // Update financial transaction
      const transactions = await base44.entities.FinancialTransaction.filter({ reference_id: id });
      if (transactions.length > 0) {
        await base44.entities.FinancialTransaction.update(transactions[0].id, {
          status: status === 'paid' ? 'completed' : status === 'cancelled' ? 'cancelled' : 'pending'
        });
      }
      return payable;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts-payable']);
      queryClient.invalidateQueries(['financial-transactions']);
    }
  });

  const updateReceivableStatus = useMutation({
    mutationFn: async ({ id, status }) => {
      const receivable = await base44.entities.AccountsReceivable.update(id, {
        status,
        payment_date: status === 'received' ? new Date().toISOString().split('T')[0] : null
      });
      // Update financial transaction
      const transactions = await base44.entities.FinancialTransaction.filter({ reference_id: id });
      if (transactions.length > 0) {
        await base44.entities.FinancialTransaction.update(transactions[0].id, {
          status: status === 'received' ? 'completed' : status === 'cancelled' ? 'cancelled' : 'pending'
        });
      }
      return receivable;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts-receivable']);
      queryClient.invalidateQueries(['financial-transactions']);
    }
  });

  const filteredPayables = payables.filter(p => 
    p.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReceivables = receivables.filter(r => 
    r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingPayables = payables.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const overduePayables = payables.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0);
  const paidPayables = payables.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

  const pendingReceivables = receivables.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);
  const overdueReceivables = receivables.filter(r => r.status === 'overdue').reduce((sum, r) => sum + r.amount, 0);
  const receivedReceivables = receivables.filter(r => r.status === 'received').reduce((sum, r) => sum + r.amount, 0);

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
                <h1 className="text-2xl font-bold">Contas a Pagar e Receber</h1>
                <p className="text-amber-400 text-sm">Gestão completa de receitas e despesas</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="payable" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1">
            <TabsTrigger value="payable">Contas a Pagar</TabsTrigger>
            <TabsTrigger value="receivable">Contas a Receber</TabsTrigger>
          </TabsList>

          <TabsContent value="payable">
            <div className="grid sm:grid-cols-3 gap-6 mb-6">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Pendente</p>
                      <p className="text-2xl font-bold">R$ {pendingPayables.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Atrasado</p>
                      <p className="text-2xl font-bold text-red-600">R$ {overduePayables.toFixed(2)}</p>
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
                      <p className="text-sm text-slate-500">Pago</p>
                      <p className="text-2xl font-bold text-green-600">R$ {paidPayables.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                  <CardTitle>Contas a Pagar</CardTitle>
                  <div className="flex gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Button onClick={() => setShowPayableDialog(true)} className="bg-amber-500 hover:bg-amber-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Conta
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Fornecedor</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Descrição</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Categoria</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Valor</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Vencimento</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayables.map((payable) => (
                        <tr key={payable.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-4 px-4 font-medium">{payable.supplier_name}</td>
                          <td className="py-4 px-4 text-sm">{payable.description}</td>
                          <td className="py-4 px-4 text-sm">{payable.category}</td>
                          <td className="py-4 px-4 font-semibold">R$ {payable.amount?.toFixed(2)}</td>
                          <td className="py-4 px-4 text-sm">{payable.due_date && format(new Date(payable.due_date), 'dd/MM/yyyy')}</td>
                          <td className="py-4 px-4">
                            <Badge className={
                              payable.status === 'paid' ? 'bg-green-100 text-green-800' :
                              payable.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {payable.status === 'paid' ? 'Pago' :
                               payable.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            {payable.status === 'pending' && (
                              <Button size="sm" onClick={() => updatePayableStatus.mutate({ id: payable.id, status: 'paid' })}>
                                Marcar como Pago
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

          <TabsContent value="receivable">
            <div className="grid sm:grid-cols-3 gap-6 mb-6">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Pendente</p>
                      <p className="text-2xl font-bold">R$ {pendingReceivables.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Atrasado</p>
                      <p className="text-2xl font-bold text-red-600">R$ {overdueReceivables.toFixed(2)}</p>
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
                      <p className="text-sm text-slate-500">Recebido</p>
                      <p className="text-2xl font-bold text-green-600">R$ {receivedReceivables.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                  <CardTitle>Contas a Receber</CardTitle>
                  <div className="flex gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Button onClick={() => setShowReceivableDialog(true)} className="bg-amber-500 hover:bg-amber-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Conta
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Cliente</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Descrição</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Valor</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Vencimento</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReceivables.map((receivable) => (
                        <tr key={receivable.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-4 px-4 font-medium">{receivable.customer_name}</td>
                          <td className="py-4 px-4 text-sm">{receivable.description}</td>
                          <td className="py-4 px-4 font-semibold">R$ {receivable.amount?.toFixed(2)}</td>
                          <td className="py-4 px-4 text-sm">{receivable.due_date && format(new Date(receivable.due_date), 'dd/MM/yyyy')}</td>
                          <td className="py-4 px-4">
                            <Badge className={
                              receivable.status === 'received' ? 'bg-green-100 text-green-800' :
                              receivable.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {receivable.status === 'received' ? 'Recebido' :
                               receivable.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            {receivable.status === 'pending' && (
                              <Button size="sm" onClick={() => updateReceivableStatus.mutate({ id: receivable.id, status: 'received' })}>
                                Confirmar Recebimento
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

      <Dialog open={showPayableDialog} onOpenChange={setShowPayableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conta a Pagar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fornecedor *</Label>
              <Input value={payableData.supplier_name} onChange={(e) => setPayableData(prev => ({ ...prev, supplier_name: e.target.value }))} />
            </div>
            <div>
              <Label>Descrição *</Label>
              <Input value={payableData.description} onChange={(e) => setPayableData(prev => ({ ...prev, description: e.target.value }))} />
            </div>
            <div>
              <Label>Categoria *</Label>
              <Select value={payableData.category} onValueChange={(v) => setPayableData(prev => ({ ...prev, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="energy_purchase">Compra de Energia</SelectItem>
                  <SelectItem value="operational">Operacional</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="administrative">Administrativo</SelectItem>
                  <SelectItem value="infrastructure">Infraestrutura</SelectItem>
                  <SelectItem value="other">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor (R$) *</Label>
                <Input type="number" value={payableData.amount} onChange={(e) => setPayableData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))} />
              </div>
              <div>
                <Label>Vencimento *</Label>
                <Input type="date" value={payableData.due_date} onChange={(e) => setPayableData(prev => ({ ...prev, due_date: e.target.value }))} />
              </div>
            </div>
            <Button className="w-full bg-amber-500 hover:bg-amber-600" onClick={() => createPayable.mutate(payableData)}>Cadastrar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showReceivableDialog} onOpenChange={setShowReceivableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conta a Receber</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cliente *</Label>
              <Input value={receivableData.customer_name} onChange={(e) => setReceivableData(prev => ({ ...prev, customer_name: e.target.value }))} />
            </div>
            <div>
              <Label>Descrição *</Label>
              <Input value={receivableData.description} onChange={(e) => setReceivableData(prev => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor (R$) *</Label>
                <Input type="number" value={receivableData.amount} onChange={(e) => setReceivableData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))} />
              </div>
              <div>
                <Label>Vencimento *</Label>
                <Input type="date" value={receivableData.due_date} onChange={(e) => setReceivableData(prev => ({ ...prev, due_date: e.target.value }))} />
              </div>
            </div>
            <Button className="w-full bg-amber-500 hover:bg-amber-600" onClick={() => createReceivable.mutate(receivableData)}>Cadastrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}