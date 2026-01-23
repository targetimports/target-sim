import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, Edit, Trash2, ArrowLeft, FileText, Search, Users, TrendingUp, DollarSign, AlertCircle
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';

const STATUS_OPTIONS = ['pending', 'analyzing', 'active', 'suspended', 'cancelled'];
const CUSTOMER_TYPES = ['residential', 'commercial'];

export default function SubscriptionManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_cpf_cnpj: '',
    customer_type: 'residential',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    distributor: '',
    installation_number: '',
    average_bill_value: '',
    power_plant_name: '',
    business_type: '',
    status: 'pending',
    discount_percentage: '',
    notes: '',
    contract_start_date: '',
    contract_end_date: ''
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => base44.entities.Subscription.list()
  });

  const { data: powerPlants = [] } = useQuery({
    queryKey: ['power-plants'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const createSubscription = useMutation({
    mutationFn: (data) => base44.entities.Subscription.create({
      ...data,
      average_bill_value: data.average_bill_value ? parseFloat(data.average_bill_value) : undefined,
      discount_percentage: data.discount_percentage ? parseFloat(data.discount_percentage) : undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['subscriptions']);
      setIsDialogOpen(false);
      resetForm();
      toast.success('Assinatura criada com sucesso!');
    }
  });

  const updateSubscription = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Subscription.update(id, {
      ...data,
      average_bill_value: data.average_bill_value ? parseFloat(data.average_bill_value) : undefined,
      discount_percentage: data.discount_percentage ? parseFloat(data.discount_percentage) : undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['subscriptions']);
      setIsDialogOpen(false);
      resetForm();
      toast.success('Assinatura atualizada com sucesso!');
    }
  });

  const deleteSubscription = useMutation({
    mutationFn: (id) => base44.entities.Subscription.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['subscriptions']);
      setDeleteConfirmOpen(false);
      setSubscriptionToDelete(null);
      toast.success('Assinatura excluída com sucesso!');
    }
  });

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      customer_cpf_cnpj: '',
      customer_type: 'residential',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      distributor: '',
      installation_number: '',
      average_bill_value: '',
      power_plant_name: '',
      business_type: '',
      status: 'pending',
      discount_percentage: '',
      notes: '',
      contract_start_date: '',
      contract_end_date: ''
    });
    setEditingSubscription(null);
  };

  const openEditDialog = (subscription) => {
    setEditingSubscription(subscription);
    setFormData({
      customer_name: subscription.customer_name || '',
      customer_email: subscription.customer_email || '',
      customer_phone: subscription.customer_phone || '',
      customer_cpf_cnpj: subscription.customer_cpf_cnpj || '',
      customer_type: subscription.customer_type || 'residential',
      address: subscription.address || '',
      city: subscription.city || '',
      state: subscription.state || '',
      zip_code: subscription.zip_code || '',
      distributor: subscription.distributor || '',
      installation_number: subscription.installation_number || '',
      average_bill_value: subscription.average_bill_value?.toString() || '',
      power_plant_name: subscription.power_plant_name || '',
      business_type: subscription.business_type || '',
      status: subscription.status || 'pending',
      discount_percentage: subscription.discount_percentage?.toString() || '',
      notes: subscription.notes || '',
      contract_start_date: subscription.contract_start_date || '',
      contract_end_date: subscription.contract_end_date || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingSubscription) {
      updateSubscription.mutate({ id: editingSubscription.id, data: formData });
    } else {
      createSubscription.mutate(formData);
    }
  };

  const handleDeleteClick = (subscription) => {
    setSubscriptionToDelete(subscription);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (subscriptionToDelete) {
      deleteSubscription.mutate(subscriptionToDelete.id);
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = 
      sub.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.customer_phone?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    pending: subscriptions.filter(s => s.status === 'pending').length,
    revenue: subscriptions
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + (s.average_bill_value || 0), 0)
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'analyzing': return 'bg-blue-100 text-blue-800';
      case 'suspended': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Ativa';
      case 'pending': return 'Pendente';
      case 'analyzing': return 'Analisando';
      case 'suspended': return 'Suspensa';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-900 to-blue-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Gerenciamento de Assinaturas</h1>
                  <p className="text-xs text-slate-400">Gerencie todas as assinaturas de clientes</p>
                </div>
              </div>
            </div>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nova Assinatura
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
                  <p className="text-sm text-slate-500">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Ativas</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pendentes</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Receita Mensal</p>
                  <p className="text-2xl font-bold">R$ {stats.revenue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Pesquisar por nome, email ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="analyzing">Analisando</SelectItem>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="suspended">Suspensa</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Cliente</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Contato</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Concessionária</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Valor Médio</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Usina</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.map((subscription) => (
                  <motion.tr
                    key={subscription.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{subscription.customer_name}</div>
                      <div className="text-xs text-slate-500">{subscription.customer_type === 'residential' ? '🏠 Residencial' : '🏢 Comercial'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900">{subscription.customer_email}</div>
                      <div className="text-xs text-slate-500">{subscription.customer_phone}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{subscription.distributor || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">
                        R$ {(subscription.average_bill_value || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{subscription.power_plant_name || '-'}</td>
                    <td className="px-6 py-4">
                      <Badge className={getStatusColor(subscription.status)}>
                        {getStatusLabel(subscription.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(subscription)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(subscription)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredSubscriptions.length === 0 && (
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma assinatura encontrada</h3>
              <p className="text-slate-500 mb-6">Cadastre a primeira assinatura</p>
              <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nova Assinatura
              </Button>
            </CardContent>
          )}
        </Card>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSubscription ? 'Editar Assinatura' : 'Nova Assinatura'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">Dados do Cliente</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Cliente *</Label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                    placeholder="Nome completo"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Telefone *</Label>
                  <Input
                    value={formData.customer_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>CPF/CNPJ</Label>
                  <Input
                    value={formData.customer_cpf_cnpj}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_cpf_cnpj: e.target.value }))}
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Cliente</Label>
                  <Select value={formData.customer_type} onValueChange={(v) => setFormData(prev => ({ ...prev, customer_type: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residencial</SelectItem>
                      <SelectItem value="commercial">Comercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">Endereço</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Endereço</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Rua, número, complemento"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Cidade"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">Informações da Assinatura</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Concessionária</Label>
                  <Input
                    value={formData.distributor}
                    onChange={(e) => setFormData(prev => ({ ...prev, distributor: e.target.value }))}
                    placeholder="Nome da concessionária"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Número da Instalação</Label>
                  <Input
                    value={formData.installation_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, installation_number: e.target.value }))}
                    placeholder="Número"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor Médio da Conta (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.average_bill_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, average_bill_value: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Usina</Label>
                  <Select value={formData.power_plant_name} onValueChange={(v) => setFormData(prev => ({ ...prev, power_plant_name: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a usina" />
                    </SelectTrigger>
                    <SelectContent>
                      {powerPlants.map(plant => (
                        <SelectItem key={plant.id} value={plant.name}>{plant.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Desconto (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_percentage: e.target.value }))}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="analyzing">Analisando</SelectItem>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="suspended">Suspensa</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Data de Início</Label>
                  <Input
                    type="date"
                    value={formData.contract_start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, contract_start_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data de Término</Label>
                  <Input
                    type="date"
                    value={formData.contract_end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, contract_end_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observações internas..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                {editingSubscription ? 'Salvar Alterações' : 'Criar Assinatura'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Assinatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a assinatura de <strong>{subscriptionToDelete?.customer_name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSubscriptionToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}