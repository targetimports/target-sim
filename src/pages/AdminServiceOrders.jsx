import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Wrench, Plus, Search, Calendar, ArrowLeft,
  CheckCircle, Clock, AlertCircle, User
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminServiceOrders() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    subscription_id: '',
    consumer_unit_id: '',
    order_type: 'maintenance',
    priority: 'medium',
    description: '',
    scheduled_date: '',
    assigned_technician: '',
    estimated_duration_hours: 2,
    cost: ''
  });

  const { data: serviceOrders = [], refetch } = useQuery({
    queryKey: ['admin-service-orders'],
    queryFn: () => base44.entities.ServiceOrder.list('-created_date', 100)
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['all-subscriptions'],
    queryFn: () => base44.entities.Subscription.list()
  });

  const createOrder = useMutation({
    mutationFn: (data) => base44.entities.ServiceOrder.create({
      ...data,
      cost: data.cost ? parseFloat(data.cost) : undefined,
      estimated_duration_hours: parseFloat(data.estimated_duration_hours)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-service-orders']);
      setIsDialogOpen(false);
    }
  });

  const updateOrderStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ServiceOrder.update(id, { 
      status,
      completed_date: status === 'completed' ? new Date().toISOString() : undefined
    }),
    onSuccess: () => refetch()
  });

  const filteredOrders = serviceOrders.filter(order => {
    const matchesSearch = order.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.assigned_technician?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    pending: serviceOrders.filter(o => o.status === 'pending').length,
    scheduled: serviceOrders.filter(o => o.status === 'scheduled').length,
    inProgress: serviceOrders.filter(o => o.status === 'in_progress').length,
    completed: serviceOrders.filter(o => o.status === 'completed').length
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createOrder.mutate(formData);
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-slate-100 text-slate-800'
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
              <div>
                <h1 className="text-lg font-bold">Gestão de Ordens de Serviço</h1>
                <p className="text-xs text-slate-400">Instalações, manutenções e reparos</p>
              </div>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-amber-500 hover:bg-amber-600">
              <Plus className="w-4 h-4 mr-2" />
              Nova Ordem
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
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pendentes</p>
                  <p className="text-3xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Agendados</p>
                  <p className="text-3xl font-bold">{stats.scheduled}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Em Andamento</p>
                  <p className="text-3xl font-bold">{stats.inProgress}</p>
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
                  <p className="text-sm text-slate-500">Concluídos</p>
                  <p className="text-3xl font-bold">{stats.completed}</p>
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
              placeholder="Buscar ordens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const subscription = subscriptions.find(s => s.id === order.subscription_id);
            return (
              <Card key={order.id} className={`border-0 shadow-sm border-l-4 ${
                order.priority === 'urgent' ? 'border-l-red-500' :
                order.priority === 'high' ? 'border-l-orange-500' :
                order.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{typeIcons[order.order_type]}</span>
                      <div>
                        <h3 className="font-semibold text-slate-900">{typeLabels[order.order_type]}</h3>
                        <p className="text-sm text-slate-500">{subscription?.customer_name}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Badge className={statusColors[order.status]} role="button">
                          {order.status === 'pending' ? 'Pendente' :
                           order.status === 'scheduled' ? 'Agendado' :
                           order.status === 'in_progress' ? 'Em Andamento' :
                           order.status === 'completed' ? 'Concluído' : 'Cancelado'}
                        </Badge>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => updateOrderStatus.mutate({ id: order.id, status: 'scheduled' })}>
                          Marcar como Agendado
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateOrderStatus.mutate({ id: order.id, status: 'in_progress' })}>
                          Iniciar Serviço
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateOrderStatus.mutate({ id: order.id, status: 'completed' })}>
                          Concluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <p className="text-slate-700 mb-4">{order.description}</p>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    {order.scheduled_date && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4 text-amber-500" />
                        <span>{format(new Date(order.scheduled_date), 'dd/MM/yyyy HH:mm')}</span>
                      </div>
                    )}
                    {order.assigned_technician && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <User className="w-4 h-4 text-amber-500" />
                        <span>{order.assigned_technician}</span>
                      </div>
                    )}
                    {order.cost && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <span className="font-semibold text-amber-600">R$ {order.cost.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="text-slate-500 text-xs">
                      Criado em {format(new Date(order.created_date), 'dd/MM/yyyy')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Ordem de Serviço</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Assinatura *</Label>
              <Select 
                value={formData.subscription_id} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, subscription_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a assinatura" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptions.map(sub => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.customer_name} - {sub.city}/{sub.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Serviço *</Label>
                <Select 
                  value={formData.order_type} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, order_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="installation">Instalação</SelectItem>
                    <SelectItem value="maintenance">Manutenção</SelectItem>
                    <SelectItem value="repair">Reparo</SelectItem>
                    <SelectItem value="inspection">Inspeção</SelectItem>
                    <SelectItem value="uninstallation">Desinstalação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridade *</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o serviço a ser realizado"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Agendada</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Técnico</Label>
                <Input
                  value={formData.assigned_technician}
                  onChange={(e) => setFormData(prev => ({ ...prev, assigned_technician: e.target.value }))}
                  placeholder="Nome do técnico"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duração Estimada (h)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.estimated_duration_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration_hours: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Custo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600">
                Criar Ordem
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}