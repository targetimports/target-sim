import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, Edit, Trash2, ArrowLeft, FileText, Search, Users, TrendingUp, DollarSign, AlertCircle, CheckCircle, Factory
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
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    power_plant_id: '',
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

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list()
  });

  const { data: consumerUnits = [] } = useQuery({
    queryKey: ['consumer-units', selectedCustomerId],
    queryFn: () => base44.entities.ConsumerUnit.filter({ customer_email: customers.find(c => c.id === selectedCustomerId)?.email }),
    enabled: !!selectedCustomerId
  });

  const { data: powerPlantContracts = [] } = useQuery({
    queryKey: ['power-plant-contracts'],
    queryFn: () => base44.entities.PowerPlantContract.list()
  });

  const createSubscription = useMutation({
    mutationFn: async (data) => {
      const customer = customers.find(c => c.id === data.customer_id);
      const powerPlant = powerPlants.find(p => p.id === data.power_plant_id);
      
      const subscription = await base44.entities.Subscription.create({
        customer_number: customer.customer_number,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        customer_cpf_cnpj: customer.cpf_cnpj,
        customer_type: customer.customer_type,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        zip_code: customer.zip_code,
        power_plant_id: powerPlant.id,
        power_plant_name: powerPlant.name,
        status: data.status,
        discount_percentage: data.discount_percentage ? parseFloat(data.discount_percentage) : undefined,
        notes: data.notes,
        contract_start_date: data.contract_start_date,
        contract_end_date: data.contract_end_date
      });

      // Vincular unidades consumidoras selecionadas
      for (const unitId of selectedUnits) {
        await base44.entities.ConsumerUnit.update(unitId, { 
          subscription_id: subscription.id,
          power_plant_name: powerPlant.name
        });
      }

      return subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['subscriptions']);
      queryClient.invalidateQueries(['consumer-units']);
      setIsDialogOpen(false);
      resetForm();
      toast.success('Assinatura criada com sucesso!');
    }
  });

  const updateSubscription = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Subscription.update(id, {
      status: data.status,
      discount_percentage: data.discount_percentage ? parseFloat(data.discount_percentage) : undefined,
      notes: data.notes,
      contract_start_date: data.contract_start_date,
      contract_end_date: data.contract_end_date
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
      customer_id: '',
      power_plant_id: '',
      status: 'pending',
      discount_percentage: '',
      notes: '',
      contract_start_date: '',
      contract_end_date: ''
    });
    setSelectedCustomerId(null);
    setSelectedUnits([]);
    setEditingSubscription(null);
  };

  const openEditDialog = (subscription) => {
    setEditingSubscription(subscription);
    setFormData({
      status: subscription.status || 'pending',
      discount_percentage: subscription.discount_percentage?.toString() || '',
      notes: subscription.notes || '',
      contract_start_date: subscription.contract_start_date || '',
      contract_end_date: subscription.contract_end_date || ''
    });
    setIsDialogOpen(true);
  };

  const getAvailablePlants = () => {
    return powerPlants
      .filter(plant => 
        plant.status === 'operational' || 
        plant.status === 'compensando' || 
        plant.status === 'disponivel'
      )
      .map(plant => {
        const allocated = powerPlantContracts
          .filter(c => c.power_plant_id === plant.id && c.status === 'active')
          .reduce((sum, c) => sum + (c.monthly_allocation_kwh || 0), 0);
        
        const available = (plant.monthly_generation_kwh || 0) - allocated;
        
        return {
          ...plant,
          allocated,
          available,
          availablePercentage: plant.monthly_generation_kwh ? (available / plant.monthly_generation_kwh * 100) : 0
        };
      }).filter(plant => plant.available > 0);
  };

  const toggleUnitSelection = (unitId) => {
    setSelectedUnits(prev => 
      prev.includes(unitId) 
        ? prev.filter(id => id !== unitId)
        : [...prev, unitId]
    );
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
            {!editingSubscription && (
              <>
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">1. Selecionar Cliente</h3>
                  
                  <div className="space-y-2">
                    <Label>Cliente *</Label>
                    <Select 
                      value={formData.customer_id} 
                      onValueChange={(v) => {
                        setFormData(prev => ({ ...prev, customer_id: v }));
                        setSelectedCustomerId(v);
                        setSelectedUnits([]);
                      }}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} - {customer.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCustomerId && (
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="text-sm">
                          <p className="font-semibold text-blue-900">
                            {customers.find(c => c.id === selectedCustomerId)?.name}
                          </p>
                          <p className="text-blue-700">
                            {customers.find(c => c.id === selectedCustomerId)?.email}
                          </p>
                          <p className="text-blue-600">
                            {customers.find(c => c.id === selectedCustomerId)?.phone}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {selectedCustomerId && consumerUnits.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">2. Selecionar Unidades Consumidoras</h3>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {consumerUnits.map(unit => (
                        <Card 
                          key={unit.id}
                          className={`cursor-pointer transition-all ${
                            selectedUnits.includes(unit.id) 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'hover:bg-slate-50'
                          }`}
                          onClick={() => toggleUnitSelection(unit.id)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                selectedUnits.includes(unit.id) 
                                  ? 'bg-blue-600 border-blue-600' 
                                  : 'border-slate-300'
                              }`}>
                                {selectedUnits.includes(unit.id) && (
                                  <CheckCircle className="w-4 h-4 text-white" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-sm">{unit.unit_name || unit.unit_number}</p>
                                <p className="text-xs text-slate-600">
                                  {unit.unit_number} - {unit.distributor}
                                </p>
                              </div>
                              {unit.monthly_consumption_kwh && (
                                <Badge variant="outline">
                                  {unit.monthly_consumption_kwh} kWh/mês
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <p className="text-sm text-slate-600">
                      {selectedUnits.length} unidade{selectedUnits.length !== 1 ? 's' : ''} selecionada{selectedUnits.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                {selectedCustomerId && consumerUnits.length === 0 && (
                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-4 text-center">
                      <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                      <p className="text-sm text-yellow-800">
                        Este cliente não possui unidades consumidoras cadastradas.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {selectedUnits.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">3. Selecionar Usina com Capacidade Disponível</h3>
                    
                    <div className="space-y-2">
                      <Label>Usina *</Label>
                      <Select 
                        value={formData.power_plant_id} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, power_plant_id: v }))}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a usina" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailablePlants().map(plant => (
                            <SelectItem key={plant.id} value={plant.id}>
                              <div className="flex items-center gap-2">
                                <Factory className="w-4 h-4" />
                                <span>{plant.name}</span>
                                <Badge variant="outline" className="ml-2">
                                  {Math.round(plant.available)} kWh disponível
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.power_plant_id && (
                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="p-4">
                          {(() => {
                            const plant = getAvailablePlants().find(p => p.id === formData.power_plant_id);
                            return plant ? (
                              <div className="text-sm">
                                <p className="font-semibold text-green-900">{plant.name}</p>
                                <p className="text-green-700">
                                  Capacidade Disponível: {Math.round(plant.available)} kWh/mês 
                                  ({Math.round(plant.availablePercentage)}%)
                                </p>
                                <p className="text-green-600">
                                  Total: {plant.monthly_generation_kwh} kWh/mês
                                </p>
                              </div>
                            ) : null;
                          })()}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">
                {editingSubscription ? 'Editar Informações' : '4. Configurações da Assinatura'}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
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