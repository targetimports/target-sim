import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Sun, Plus, Pencil, Trash2, ArrowLeft, MapPin, Zap, Calendar, DollarSign
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 
  'SP', 'SE', 'TO'
];

export default function AdminPowerPlants() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [plantToDelete, setPlantToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'solar',
    tariff_group: '',
    gd_type: '',
    capacity_kw: '',
    monthly_generation_kwh: '',
    annual_generation_kwh: '',
    accumulated_credits_kwh: '',
    initial_balance_kwh: '',
    available_balance_kwh: '',
    location: '',
    city: '',
    state: '',
    status: 'operational',
    construction_phase: '',
    operation_mode: 'monthly_generation',
    start_date: '',
    reading_day: '',
    image_url: '',
    utility_portal_login: '',
    utility_portal_password: '',
    leasing_active: false,
    leasing_client_email: '',
    leasing_client_name: '',
    leasing_monthly_value: '',
    leasing_asset_value: '',
    leasing_contract_start: '',
    leasing_contract_end: '',
    leasing_notes: ''
  });

  const { data: powerPlants = [] } = useQuery({
    queryKey: ['powerplants'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const createPlant = useMutation({
    mutationFn: (data) => base44.entities.PowerPlant.create({
      ...data,
      type: 'solar',
      capacity_kw: data.capacity_kw ? parseFloat(data.capacity_kw) : undefined,
      monthly_generation_kwh: data.monthly_generation_kwh ? parseFloat(data.monthly_generation_kwh) : undefined,
      annual_generation_kwh: data.annual_generation_kwh ? parseFloat(data.annual_generation_kwh) : undefined,
      accumulated_credits_kwh: data.accumulated_credits_kwh ? parseFloat(data.accumulated_credits_kwh) : undefined,
      initial_balance_kwh: data.initial_balance_kwh ? parseFloat(data.initial_balance_kwh) : undefined,
      available_balance_kwh: data.available_balance_kwh ? parseFloat(data.available_balance_kwh) : undefined,
      reading_day: data.reading_day ? parseInt(data.reading_day) : undefined,
      leasing_monthly_value: data.leasing_monthly_value ? parseFloat(data.leasing_monthly_value) : undefined,
      leasing_asset_value: data.leasing_asset_value ? parseFloat(data.leasing_asset_value) : undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['powerplants']);
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const updatePlant = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PowerPlant.update(id, {
      ...data,
      type: 'solar',
      capacity_kw: data.capacity_kw ? parseFloat(data.capacity_kw) : undefined,
      monthly_generation_kwh: data.monthly_generation_kwh ? parseFloat(data.monthly_generation_kwh) : undefined,
      annual_generation_kwh: data.annual_generation_kwh ? parseFloat(data.annual_generation_kwh) : undefined,
      accumulated_credits_kwh: data.accumulated_credits_kwh ? parseFloat(data.accumulated_credits_kwh) : undefined,
      initial_balance_kwh: data.initial_balance_kwh ? parseFloat(data.initial_balance_kwh) : undefined,
      available_balance_kwh: data.available_balance_kwh ? parseFloat(data.available_balance_kwh) : undefined,
      reading_day: data.reading_day ? parseInt(data.reading_day) : undefined,
      leasing_monthly_value: data.leasing_monthly_value ? parseFloat(data.leasing_monthly_value) : undefined,
      leasing_asset_value: data.leasing_asset_value ? parseFloat(data.leasing_asset_value) : undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['powerplants']);
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const deletePlant = useMutation({
    mutationFn: (id) => base44.entities.PowerPlant.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['powerplants']);
      setDeleteConfirmOpen(false);
      setPlantToDelete(null);
    }
  });

  const handleDeleteClick = (plant) => {
    setPlantToDelete(plant);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (plantToDelete) {
      deletePlant.mutate(plantToDelete.id);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'solar',
      tariff_group: '',
      gd_type: '',
      capacity_kw: '',
      monthly_generation_kwh: '',
      annual_generation_kwh: '',
      accumulated_credits_kwh: '',
      location: '',
      city: '',
      state: '',
      status: 'operational',
      operation_mode: 'monthly_generation',
      start_date: '',
      image_url: '',
      leasing_active: false,
      leasing_client_email: '',
      leasing_client_name: '',
      leasing_monthly_value: '',
      leasing_contract_start: '',
      leasing_contract_end: '',
      leasing_notes: ''
    });
    setEditingPlant(null);
  };

  const openEditDialog = (plant) => {
    setEditingPlant(plant);
    setFormData({
      name: plant.name,
      type: plant.type,
      tariff_group: plant.tariff_group || '',
      gd_type: plant.gd_type || '',
      capacity_kw: plant.capacity_kw?.toString() || '',
      monthly_generation_kwh: plant.monthly_generation_kwh?.toString() || '',
      annual_generation_kwh: plant.annual_generation_kwh?.toString() || '',
      accumulated_credits_kwh: plant.accumulated_credits_kwh?.toString() || '',
      initial_balance_kwh: plant.initial_balance_kwh?.toString() || '',
      available_balance_kwh: plant.available_balance_kwh?.toString() || '',
      location: plant.location || '',
      city: plant.city || '',
      state: plant.state || '',
      status: plant.status || 'operational',
      construction_phase: plant.construction_phase || '',
      operation_mode: plant.operation_mode || 'monthly_generation',
      start_date: plant.start_date || '',
      reading_day: plant.reading_day?.toString() || '',
      image_url: plant.image_url || '',
      utility_portal_login: plant.utility_portal_login || '',
      utility_portal_password: plant.utility_portal_password || '',
      leasing_active: plant.leasing_active || false,
      leasing_client_email: plant.leasing_client_email || '',
      leasing_client_name: plant.leasing_client_name || '',
      leasing_monthly_value: plant.leasing_monthly_value?.toString() || '',
      leasing_asset_value: plant.leasing_asset_value?.toString() || '',
      leasing_contract_start: plant.leasing_contract_start || '',
      leasing_contract_end: plant.leasing_contract_end || '',
      leasing_notes: plant.leasing_notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingPlant) {
      updatePlant.mutate({ id: editingPlant.id, data: formData });
    } else {
      createPlant.mutate(formData);
    }
  };

  const filteredPlants = activeTab === 'all' 
    ? powerPlants 
    : activeTab === 'leasing'
    ? powerPlants.filter(p => p.leasing_active === true)
    : activeTab === 'construction_phase_1'
    ? powerPlants.filter(p => p.status === 'under_construction' && p.construction_phase === 'phase_1')
    : activeTab === 'construction_phase_2'
    ? powerPlants.filter(p => p.status === 'under_construction' && p.construction_phase === 'phase_2')
    : activeTab === 'accumulated_disponivel'
    ? powerPlants.filter(p => p.operation_mode === 'accumulated_balance' && p.status === 'disponivel')
    : activeTab === 'accumulated_compensando'
    ? powerPlants.filter(p => p.operation_mode === 'accumulated_balance' && p.status === 'compensando')
    : powerPlants.filter(p => p.operation_mode === activeTab && p.status !== 'under_construction');

  const monthlyGenPlants = powerPlants.filter(p => p.operation_mode === 'monthly_generation' && p.status === 'operational');
  const accumulatedPlants = powerPlants.filter(p => p.operation_mode === 'accumulated_balance' && (p.status === 'compensando' || p.status === 'disponivel'));
  const constructionPhase1 = powerPlants.filter(p => p.status === 'under_construction' && p.construction_phase === 'phase_1');
  const constructionPhase2 = powerPlants.filter(p => p.status === 'under_construction' && p.construction_phase === 'phase_2');
  const leasingPlants = powerPlants.filter(p => p.leasing_active === true);

  const monthlyGenCapacity = monthlyGenPlants.reduce((sum, p) => sum + (p.capacity_kw || 0), 0);
  const monthlyGenKwh = monthlyGenPlants.reduce((sum, p) => sum + (p.monthly_generation_kwh || 0), 0);
  const accumulatedCredits = accumulatedPlants.reduce((sum, p) => sum + (p.accumulated_credits_kwh || 0), 0);
  const totalAvailableBalance = accumulatedPlants.reduce((sum, p) => sum + (p.available_balance_kwh || 0), 0);
  const constructionPhase1Capacity = constructionPhase1.reduce((sum, p) => sum + (p.capacity_kw || 0), 0);
  const constructionPhase1Kwh = constructionPhase1.reduce((sum, p) => sum + (p.monthly_generation_kwh || 0), 0);
  const constructionPhase2Capacity = constructionPhase2.reduce((sum, p) => sum + (p.capacity_kw || 0), 0);
  const constructionPhase2Kwh = constructionPhase2.reduce((sum, p) => sum + (p.monthly_generation_kwh || 0), 0);
  const leasingRevenue = leasingPlants.reduce((sum, p) => sum + (p.leasing_monthly_value || 0), 0);



  const statusColors = {
    operational: 'bg-amber-100 text-amber-900',
    maintenance: 'bg-yellow-100 text-yellow-800',
    under_construction: 'bg-blue-100 text-blue-800',
    inactive: 'bg-slate-100 text-slate-800',
    compensando: 'bg-orange-100 text-orange-800',
    disponivel: 'bg-green-100 text-green-800'
  };

  const statusLabels = {
    operational: 'Operacional',
    maintenance: 'Manutenção',
    under_construction: 'Em construção',
    inactive: 'Inativa',
    compensando: 'Compensando',
    disponivel: 'Disponível'
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
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
                <div className="w-10 h-10 bg-gradient-to-br from-slate-900 to-amber-600 rounded-xl flex items-center justify-center">
                  <Sun className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Gerenciar Usinas</h1>
                  <p className="text-xs text-slate-400">Cadastre e gerencie suas usinas</p>
                </div>
              </div>
            </div>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-amber-500 hover:bg-amber-600">
              <Plus className="w-4 h-4 mr-2" />
              Nova usina
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Sun className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total de usinas</p>
                  <p className="text-2xl font-bold">{powerPlants.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Geração Mensal</p>
                  <p className="text-2xl font-bold">{(monthlyGenCapacity / 1000).toFixed(1)} MWp</p>
                  <p className="text-xs text-slate-400">{(monthlyGenKwh / 1000).toFixed(0)}k kWh/mês</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Crédito Acumulado</p>
                  <p className="text-2xl font-bold">{(accumulatedCredits / 1000).toFixed(0)}k kWh</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Construção Fase 1</p>
                  <p className="text-2xl font-bold">{(constructionPhase1Capacity / 1000).toFixed(1)} MWp</p>
                  <p className="text-xs text-slate-400">{(constructionPhase1Kwh / 1000).toFixed(0)}k kWh/mês</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Construção Fase 2</p>
                  <p className="text-2xl font-bold">{(constructionPhase2Capacity / 1000).toFixed(1)} MWp</p>
                  <p className="text-xs text-slate-400">{(constructionPhase2Kwh / 1000).toFixed(0)}k kWh/mês</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Leasing</p>
                  <p className="text-2xl font-bold">{leasingPlants.length}</p>
                  <p className="text-xs text-slate-400">R$ {leasingRevenue.toFixed(0)}/mês</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs por modo de geração */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-white border border-slate-200 p-1">
            <TabsTrigger value="all" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              Todas as Usinas ({powerPlants.length})
            </TabsTrigger>
            <TabsTrigger value="monthly_generation" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              ⚡ Geração Mensal ({monthlyGenPlants.length})
            </TabsTrigger>
            <TabsTrigger value="accumulated_disponivel" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              💰 Crédito Disponível ({powerPlants.filter(p => p.operation_mode === 'accumulated_balance' && p.status === 'disponivel').length})
            </TabsTrigger>
            <TabsTrigger value="accumulated_compensando" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              💰 Crédito Compensando ({powerPlants.filter(p => p.operation_mode === 'accumulated_balance' && p.status === 'compensando').length})
            </TabsTrigger>
            <TabsTrigger value="construction_phase_1" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              🏗️ Construção Fase 1 ({powerPlants.filter(p => p.status === 'under_construction' && p.construction_phase === 'phase_1').length})
            </TabsTrigger>
            <TabsTrigger value="construction_phase_2" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              🏗️ Construção Fase 2 ({powerPlants.filter(p => p.status === 'under_construction' && p.construction_phase === 'phase_2').length})
            </TabsTrigger>
            <TabsTrigger value="leasing" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              💰 Leasing ({powerPlants.filter(p => p.leasing_active === true).length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Plants Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlants.map((plant) => (
            <motion.div
              key={plant.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-0 shadow-sm overflow-hidden">
                {plant.image_url && (
                  <div className="h-40 bg-slate-200">
                    <img 
                      src={plant.image_url} 
                      alt={plant.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">☀️</span>
                      <div>
                        <h3 className="font-semibold text-slate-900">{plant.name}</h3>
                        <p className="text-sm text-slate-500">Usina Solar</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(plant)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(plant)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4" />
                      <span>{plant.city}/{plant.state}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Zap className="w-4 h-4" />
                      <span>{plant.capacity_kw?.toLocaleString()} kWp</span>
                    </div>
                    {plant.operation_mode === 'accumulated_balance' && plant.accumulated_credits_kwh ? (
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                        <Zap className="w-4 h-4" />
                        <span>{plant.accumulated_credits_kwh?.toLocaleString()} kWh acumulados</span>
                      </div>
                    ) : plant.monthly_generation_kwh ? (
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                        <Zap className="w-4 h-4" />
                        <span>{plant.monthly_generation_kwh?.toLocaleString()} kWh/mês</span>
                      </div>
                    ) : null}
                    {plant.start_date && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span>Desde {format(new Date(plant.start_date), 'MM/yyyy')}</span>
                      </div>
                    )}
                    {plant.leasing_active && (
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                        <DollarSign className="w-4 h-4" />
                        <span>R$ {plant.leasing_monthly_value?.toLocaleString()}/mês - {plant.leasing_client_name}</span>
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <Badge className={statusColors[plant.status]}>
                        {statusLabels[plant.status]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {plant.operation_mode === 'accumulated_balance' ? 'Crédito Acumulado' : 'Geração Mensal'}
                      </Badge>
                      {plant.tariff_group && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          Grupo {plant.tariff_group}
                        </Badge>
                      )}
                      {plant.gd_type && (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                          {plant.gd_type}
                        </Badge>
                      )}
                      {plant.leasing_active && (
                        <Badge className="text-xs bg-emerald-100 text-emerald-800">
                          Leasing
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredPlants.length === 0 && powerPlants.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Sun className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma usina neste modo</h3>
              <p className="text-slate-500">Não há usinas cadastradas com este modo de operação</p>
            </CardContent>
          </Card>
        )}

        {powerPlants.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Sun className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma usina cadastrada</h3>
              <p className="text-slate-500 mb-6">Cadastre sua primeira usina de energia</p>
              <Button onClick={() => setIsDialogOpen(true)} className="bg-amber-500 hover:bg-amber-600">
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar usina
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlant ? 'Editar usina' : 'Nova usina'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6" key={editingPlant?.id || 'new'}>
            <div className="space-y-2">
              <Label>Nome da usina *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Usina Solar São Paulo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Modo de Operação *</Label>
              <Select value={formData.operation_mode || 'monthly_generation'} onValueChange={(value) => setFormData(prev => ({ ...prev, operation_mode: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={5}>
                  <SelectItem value="monthly_generation">Geração Mensal</SelectItem>
                  <SelectItem value="accumulated_balance">Crédito Acumulado</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Geração Mensal: energia gerada é distribuída mensalmente. Crédito Acumulado: créditos acumulam ao longo do tempo.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Grupo Tarifário *</Label>
                <Select value={formData.tariff_group || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, tariff_group: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={5}>
                    <SelectItem value="A">Grupo A</SelectItem>
                    <SelectItem value="B">Grupo B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo GD *</Label>
                <Select value={formData.gd_type || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, gd_type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={5}>
                    <SelectItem value="GD1">GD1</SelectItem>
                    <SelectItem value="GD2">GD2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.operation_mode === 'monthly_generation' && (
                <div className="space-y-2">
                  <Label>Capacidade (kWp) *</Label>
                  <Input
                    type="number"
                    value={formData.capacity_kw}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity_kw: e.target.value }))}
                    placeholder="Ex: 5000"
                    required
                  />
                </div>
              )}
            </div>

            {formData.operation_mode === 'accumulated_balance' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Saldo Inicial (kWh) *</Label>
                  <Input
                    type="number"
                    value={formData.initial_balance_kwh}
                    onChange={(e) => setFormData(prev => ({ ...prev, initial_balance_kwh: e.target.value }))}
                    placeholder="Ex: 500000"
                    required={formData.operation_mode === 'accumulated_balance'}
                  />
                  <p className="text-xs text-slate-500">Saldo inicial em kWh da usina</p>
                </div>
                <div className="space-y-2">
                  <Label>Saldo Disponível (kWh) *</Label>
                  <Input
                    type="number"
                    value={formData.available_balance_kwh}
                    onChange={(e) => setFormData(prev => ({ ...prev, available_balance_kwh: e.target.value }))}
                    placeholder="Ex: 450000"
                    required={formData.operation_mode === 'accumulated_balance'}
                  />
                  <p className="text-xs text-slate-500">Saldo disponível em kWh para utilização</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Geração Mensal (kWh)</Label>
                  <Input
                    type="number"
                    value={formData.monthly_generation_kwh}
                    onChange={(e) => setFormData(prev => ({ ...prev, monthly_generation_kwh: e.target.value }))}
                    placeholder="Ex: 150000"
                  />
                  <p className="text-xs text-slate-500">Energia gerada por mês para rateio</p>
                </div>
                <div className="space-y-2">
                  <Label>Geração Anual (kWh)</Label>
                  <Input
                    type="number"
                    value={formData.annual_generation_kwh}
                    onChange={(e) => setFormData(prev => ({ ...prev, annual_generation_kwh: e.target.value }))}
                    placeholder="Ex: 1800000"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Endereço completo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Select value={formData.state || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={5}>
                    {STATES.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status || (formData.operation_mode === 'accumulated_balance' ? 'disponivel' : 'operational')} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={5}>
                    {formData.operation_mode === 'accumulated_balance' ? (
                      <>
                        <SelectItem value="compensando">Compensando</SelectItem>
                        <SelectItem value="disponivel">Disponível</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="operational">Operacional</SelectItem>
                        <SelectItem value="maintenance">Manutenção</SelectItem>
                        <SelectItem value="under_construction">Em construção</SelectItem>
                        <SelectItem value="inactive">Inativa</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {formData.status === 'under_construction' && (
                <div className="space-y-2">
                  <Label>Fase de Construção</Label>
                  <Select value={formData.construction_phase || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, construction_phase: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a fase" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={5}>
                      <SelectItem value="phase_1">Fase 1</SelectItem>
                      <SelectItem value="phase_2">Fase 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Data de início</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
            </div>

            {formData.status === 'operational' && (
              <div className="space-y-2">
                <Label>Dia da Leitura da Concessionária</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.reading_day}
                  onChange={(e) => setFormData(prev => ({ ...prev, reading_day: e.target.value }))}
                  placeholder="Ex: 15 (dia do mês)"
                />
                <p className="text-xs text-slate-500">Dia do mês em que a concessionária realiza a leitura (1 a 31)</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>URL da imagem</Label>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="border-t pt-6">
              <h4 className="font-semibold mb-4 text-slate-900">🔐 Acesso ao Portal da Concessionária</h4>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <Label>Login/Usuário</Label>
                  <Input
                    value={formData.utility_portal_login}
                    onChange={(e) => setFormData(prev => ({ ...prev, utility_portal_login: e.target.value }))}
                    placeholder="Usuário do portal"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input
                    type="text"
                    value={formData.utility_portal_password}
                    onChange={(e) => setFormData(prev => ({ ...prev, utility_portal_password: e.target.value }))}
                    placeholder="Senha do portal"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="leasing_active"
                  checked={formData.leasing_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, leasing_active: e.target.checked }))}
                  className="w-4 h-4"
                />
                <Label htmlFor="leasing_active" className="cursor-pointer">Esta usina está em Leasing</Label>
              </div>

              {formData.leasing_active && (
                <div className="space-y-4 bg-emerald-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome do Cliente *</Label>
                      <Input
                        value={formData.leasing_client_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, leasing_client_name: e.target.value }))}
                        placeholder="Nome do cliente"
                        required={formData.leasing_active}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email do Cliente</Label>
                      <Input
                        type="email"
                        value={formData.leasing_client_email}
                        onChange={(e) => setFormData(prev => ({ ...prev, leasing_client_email: e.target.value }))}
                        placeholder="cliente@email.com"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valor Mensal (R$) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.leasing_monthly_value}
                        onChange={(e) => setFormData(prev => ({ ...prev, leasing_monthly_value: e.target.value }))}
                        placeholder="Ex: 5000.00"
                        required={formData.leasing_active}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor Patrimonial (R$) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.leasing_asset_value}
                        onChange={(e) => setFormData(prev => ({ ...prev, leasing_asset_value: e.target.value }))}
                        placeholder="Ex: 500000.00"
                        required={formData.leasing_active}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Início do Contrato *</Label>
                      <Input
                        type="date"
                        value={formData.leasing_contract_start}
                        onChange={(e) => setFormData(prev => ({ ...prev, leasing_contract_start: e.target.value }))}
                        required={formData.leasing_active}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fim do Contrato *</Label>
                      <Input
                        type="date"
                        value={formData.leasing_contract_end}
                        onChange={(e) => setFormData(prev => ({ ...prev, leasing_contract_end: e.target.value }))}
                        required={formData.leasing_active}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Input
                      value={formData.leasing_notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, leasing_notes: e.target.value }))}
                      placeholder="Observações sobre o contrato"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600">
                {editingPlant ? 'Salvar alterações' : 'Cadastrar usina'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir esta usina?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A usina <strong>{plantToDelete?.name}</strong> será permanentemente removida do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPlantToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Sim, excluir usina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
      );
      }