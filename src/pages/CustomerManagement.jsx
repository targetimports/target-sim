import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, Search, Download, Upload, Eye, ArrowLeft, Filter, Plus, Pencil, Trash2
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CustomerDetails from '../components/customers/CustomerDetails';
import { toast } from 'sonner';

export default function CustomerManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const queryClient = useQueryClient();

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
    average_bill_value: '',
    status: 'pending'
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions-all'],
    queryFn: () => base44.entities.Subscription.list('-created_date', 500)
  });

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = 
      sub.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.customer_cpf_cnpj?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExportCSV = () => {
    const headers = ['Nome', 'Email', 'Telefone', 'CPF/CNPJ', 'Status', 'Cidade', 'UF', 'Valor Conta', 'Data Cadastro'];
    const rows = filteredSubscriptions.map(sub => [
      sub.customer_name,
      sub.customer_email,
      sub.customer_phone,
      sub.customer_cpf_cnpj,
      sub.status,
      sub.city,
      sub.state,
      sub.average_bill_value,
      format(new Date(sub.created_date), 'dd/MM/yyyy')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Lista de clientes exportada!');
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csv = event.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',');
        
        toast.success(`Arquivo carregado. ${lines.length - 1} linhas encontradas.`);
        // Aqui você pode processar e importar os dados
      } catch (error) {
        toast.error('Erro ao importar arquivo');
      }
    };
    reader.readAsText(file);
  };

  const openDetails = (subscription) => {
    setSelectedCustomer(subscription);
    setIsDetailsOpen(true);
  };

  const createSubscription = useMutation({
    mutationFn: (data) => base44.entities.Subscription.create({
      ...data,
      average_bill_value: parseFloat(data.average_bill_value) || 0
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['subscriptions-all']);
      setIsEditDialogOpen(false);
      resetForm();
      toast.success('Cliente criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar cliente');
    }
  });

  const updateSubscription = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Subscription.update(id, {
      ...data,
      average_bill_value: parseFloat(data.average_bill_value) || 0
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['subscriptions-all']);
      setIsEditDialogOpen(false);
      resetForm();
      toast.success('Cliente atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar cliente');
    }
  });

  const deleteSubscription = useMutation({
    mutationFn: (id) => base44.entities.Subscription.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['subscriptions-all']);
      setDeleteConfirmOpen(false);
      setCustomerToDelete(null);
      toast.success('Cliente excluído com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir cliente');
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
      average_bill_value: '',
      status: 'pending'
    });
    setEditingCustomer(null);
  };

  const openEditDialog = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      customer_name: customer.customer_name || '',
      customer_email: customer.customer_email || '',
      customer_phone: customer.customer_phone || '',
      customer_cpf_cnpj: customer.customer_cpf_cnpj || '',
      customer_type: customer.customer_type || 'residential',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      zip_code: customer.zip_code || '',
      average_bill_value: customer.average_bill_value?.toString() || '',
      status: customer.status || 'pending'
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCustomer) {
      updateSubscription.mutate({ id: editingCustomer.id, data: formData });
    } else {
      createSubscription.mutate(formData);
    }
  };

  const handleDeleteClick = (customer) => {
    setCustomerToDelete(customer);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      deleteSubscription.mutate(customerToDelete.id);
    }
  };

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    pending: subscriptions.filter(s => s.status === 'pending' || s.status === 'analyzing').length,
    residential: subscriptions.filter(s => s.customer_type === 'residential').length,
    commercial: subscriptions.filter(s => s.customer_type === 'commercial').length
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    analyzing: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-red-100 text-red-800',
    cancelled: 'bg-slate-100 text-slate-800'
  };

  const statusLabels = {
    pending: 'Pendente',
    analyzing: 'Em análise',
    active: 'Ativa',
    suspended: 'Suspensa',
    cancelled: 'Cancelada'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">Gerenciamento de Clientes</h1>
                  <p className="text-sm text-white/80">Visualize e gerencie todos os clientes</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                className="bg-white text-indigo-600 hover:bg-white/90"
                onClick={() => { resetForm(); setIsEditDialogOpen(true); }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
              <label htmlFor="import-csv">
                <Button variant="ghost" className="text-white hover:bg-white/20" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Importar
                  </span>
                </Button>
              </label>
              <input
                id="import-csv"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportCSV}
              />
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/20"
                onClick={handleExportCSV}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Ativos</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Residencial</p>
              <p className="text-2xl font-bold text-blue-600">{stats.residential}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Comercial</p>
              <p className="text-2xl font-bold text-purple-600">{stats.commercial}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nome, email ou CPF/CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Filter className="w-5 h-5 text-slate-500 mt-2" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="all">Todos os status</option>
                  <option value="active">Ativa</option>
                  <option value="pending">Pendente</option>
                  <option value="analyzing">Em análise</option>
                  <option value="suspended">Suspensa</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer List */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes ({filteredSubscriptions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Cliente</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Contato</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Tipo</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Localização</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Valor Conta</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-slate-900">{sub.customer_name}</p>
                          <p className="text-xs text-slate-500">{sub.customer_cpf_cnpj}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">
                          <p className="text-slate-700">{sub.customer_email}</p>
                          <p className="text-slate-500">{sub.customer_phone}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="outline">
                          {sub.customer_type === 'commercial' ? '🏢 PJ' : '🏠 PF'}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600">
                        {sub.city}/{sub.state}
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={statusColors[sub.status]}>
                          {statusLabels[sub.status]}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 font-medium">
                        R$ {sub.average_bill_value?.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetails(sub)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(sub)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(sub)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredSubscriptions.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhum cliente encontrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Customer Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <CustomerDetails 
              subscription={selectedCustomer} 
              onClose={() => setIsDetailsOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit/Create Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.customer_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>CPF/CNPJ</Label>
                <Input
                  value={formData.customer_cpf_cnpj}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_cpf_cnpj: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={formData.customer_type} onValueChange={(value) => setFormData(prev => ({ ...prev, customer_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residencial</SelectItem>
                    <SelectItem value="commercial">Comercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor Conta Mensal</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.average_bill_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, average_bill_value: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input
                  value={formData.zip_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="analyzing">Em análise</SelectItem>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="suspended">Suspensa</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                {editingCustomer ? 'Salvar alterações' : 'Criar cliente'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cliente <strong>{customerToDelete?.customer_name}</strong> será permanentemente removido do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCustomerToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Sim, excluir cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}