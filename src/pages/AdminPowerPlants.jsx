import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Sun, Plus, Pencil, Trash2, ArrowLeft, MapPin, Zap, Calendar
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

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 
  'SP', 'SE', 'TO'
];

export default function AdminPowerPlants() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'solar',
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
    image_url: ''
  });

  const { data: powerPlants = [] } = useQuery({
    queryKey: ['powerplants'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const createPlant = useMutation({
    mutationFn: (data) => base44.entities.PowerPlant.create({
      ...data,
      capacity_kw: parseFloat(data.capacity_kw),
      monthly_generation_kwh: data.monthly_generation_kwh ? parseFloat(data.monthly_generation_kwh) : undefined,
      annual_generation_kwh: data.annual_generation_kwh ? parseFloat(data.annual_generation_kwh) : undefined,
      accumulated_credits_kwh: data.accumulated_credits_kwh ? parseFloat(data.accumulated_credits_kwh) : undefined
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
      capacity_kw: parseFloat(data.capacity_kw),
      monthly_generation_kwh: data.monthly_generation_kwh ? parseFloat(data.monthly_generation_kwh) : undefined,
      annual_generation_kwh: data.annual_generation_kwh ? parseFloat(data.annual_generation_kwh) : undefined,
      accumulated_credits_kwh: data.accumulated_credits_kwh ? parseFloat(data.accumulated_credits_kwh) : undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['powerplants']);
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const deletePlant = useMutation({
    mutationFn: (id) => base44.entities.PowerPlant.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['powerplants'])
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'solar',
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
      image_url: ''
    });
    setEditingPlant(null);
  };

  const openEditDialog = (plant) => {
    setEditingPlant(plant);
    setFormData({
      name: plant.name,
      type: plant.type,
      capacity_kw: plant.capacity_kw?.toString() || '',
      monthly_generation_kwh: plant.monthly_generation_kwh?.toString() || '',
      annual_generation_kwh: plant.annual_generation_kwh?.toString() || '',
      accumulated_credits_kwh: plant.accumulated_credits_kwh?.toString() || '',
      location: plant.location || '',
      city: plant.city || '',
      state: plant.state || '',
      status: plant.status || 'operational',
      operation_mode: plant.operation_mode || 'monthly_generation',
      start_date: plant.start_date || '',
      image_url: plant.image_url || ''
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

  const totalCapacity = powerPlants.reduce((sum, p) => sum + (p.capacity_kw || 0), 0);
  const operationalPlants = powerPlants.filter(p => p.status === 'operational').length;

  const typeIcons = {
    solar: '☀️',
    wind: '💨',
    hydro: '💧',
    biomass: '🌱'
  };

  const typeLabels = {
    solar: 'Solar',
    wind: 'Eólica',
    hydro: 'Hidrelétrica',
    biomass: 'Biomassa'
  };

  const statusColors = {
    operational: 'bg-amber-100 text-amber-900',
    maintenance: 'bg-yellow-100 text-yellow-800',
    under_construction: 'bg-blue-100 text-blue-800',
    inactive: 'bg-slate-100 text-slate-800'
  };

  const statusLabels = {
    operational: 'Operacional',
    maintenance: 'Manutenção',
    under_construction: 'Em construção',
    inactive: 'Inativa'
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
        <div className="grid sm:grid-cols-3 gap-6 mb-8">
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
                  <p className="text-sm text-slate-500">Capacidade total</p>
                  <p className="text-2xl font-bold">{(totalCapacity / 1000).toFixed(1)} MWp</p>
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
                  <p className="text-sm text-slate-500">Em operação</p>
                  <p className="text-2xl font-bold">{operationalPlants}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plants Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {powerPlants.map((plant) => (
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
                      <span className="text-2xl">{typeIcons[plant.type]}</span>
                      <div>
                        <h3 className="font-semibold text-slate-900">{plant.name}</h3>
                        <p className="text-sm text-slate-500">{typeLabels[plant.type]}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(plant)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deletePlant.mutate(plant.id)}>
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
                    <div className="flex gap-2">
                      <Badge className={statusColors[plant.status]}>
                        {statusLabels[plant.status]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {plant.operation_mode === 'accumulated_balance' ? 'Crédito Acumulado' : 'Geração Mensal'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlant ? 'Editar usina' : 'Nova usina'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Nome da usina *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Usina Solar São Paulo"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={formData.type || 'solar'} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solar">☀️ Solar</SelectItem>
                    <SelectItem value="wind">💨 Eólica</SelectItem>
                    <SelectItem value="hydro">💧 Hidrelétrica</SelectItem>
                    <SelectItem value="biomass">🌱 Biomassa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Capacidade Instalada (kWp) *</Label>
                <Input
                  type="number"
                  value={formData.capacity_kw}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacity_kw: e.target.value }))}
                  placeholder="Ex: 5000"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Modo de Operação *</Label>
              <Select value={formData.operation_mode || 'monthly_generation'} onValueChange={(value) => setFormData({ ...formData, operation_mode: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly_generation">Geração Mensal</SelectItem>
                  <SelectItem value="accumulated_balance">Crédito Acumulado</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Geração Mensal: energia gerada é distribuída mensalmente. Crédito Acumulado: créditos acumulam ao longo do tempo.
              </p>
            </div>

            {formData.operation_mode === 'accumulated_balance' ? (
              <div className="space-y-2">
                <Label>Créditos Acumulados (kWh) *</Label>
                <Input
                  type="number"
                  value={formData.accumulated_credits_kwh}
                  onChange={(e) => setFormData(prev => ({ ...prev, accumulated_credits_kwh: e.target.value }))}
                  placeholder="Ex: 500000"
                  required={formData.operation_mode === 'accumulated_balance'}
                />
                <p className="text-xs text-slate-500">Total de kWh de crédito disponível nesta usina</p>
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
                <Select value={formData.state || ''} onValueChange={(value) => setFormData({ ...formData, state: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
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
                <Select value={formData.status || 'operational'} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational">Operacional</SelectItem>
                    <SelectItem value="maintenance">Manutenção</SelectItem>
                    <SelectItem value="under_construction">Em construção</SelectItem>
                    <SelectItem value="inactive">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data de início</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>URL da imagem</Label>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://..."
              />
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
    </div>
  );
}