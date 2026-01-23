import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Zap, Plus, Pencil, Trash2, ArrowLeft, Calendar, TrendingUp, 
  TrendingDown, Search, Download, Upload, CheckCircle, XCircle
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

export default function MonthlyGenerationManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [selectedPlant, setSelectedPlant] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [formData, setFormData] = useState({
    power_plant_id: '',
    power_plant_name: '',
    reference_month: '',
    reading_date: '',
    generated_kwh: '',
    expected_generation_kwh: '',
    injected_kwh: '',
    consumed_kwh: '',
    available_for_allocation_kwh: '',
    status: 'pending',
    source: 'manual',
    notes: ''
  });

  const { data: powerPlants = [] } = useQuery({
    queryKey: ['powerplants'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const { data: generations = [] } = useQuery({
    queryKey: ['monthly-generations'],
    queryFn: () => base44.entities.MonthlyGeneration.list('-reference_month', 200)
  });

  const createGeneration = useMutation({
    mutationFn: (data) => {
      const plant = powerPlants.find(p => p.id === data.power_plant_id);
      return base44.entities.MonthlyGeneration.create({
        ...data,
        power_plant_name: plant?.name || '',
        generated_kwh: parseFloat(data.generated_kwh),
        expected_generation_kwh: data.expected_generation_kwh ? parseFloat(data.expected_generation_kwh) : undefined,
        injected_kwh: data.injected_kwh ? parseFloat(data.injected_kwh) : undefined,
        consumed_kwh: data.consumed_kwh ? parseFloat(data.consumed_kwh) : undefined,
        available_for_allocation_kwh: data.available_for_allocation_kwh ? parseFloat(data.available_for_allocation_kwh) : undefined,
        performance_ratio: data.expected_generation_kwh ? 
          (parseFloat(data.generated_kwh) / parseFloat(data.expected_generation_kwh)) * 100 : undefined,
        remaining_kwh: data.available_for_allocation_kwh ? parseFloat(data.available_for_allocation_kwh) : undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['monthly-generations']);
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const updateGeneration = useMutation({
    mutationFn: ({ id, data }) => {
      const plant = powerPlants.find(p => p.id === data.power_plant_id);
      return base44.entities.MonthlyGeneration.update(id, {
        ...data,
        power_plant_name: plant?.name || '',
        generated_kwh: parseFloat(data.generated_kwh),
        expected_generation_kwh: data.expected_generation_kwh ? parseFloat(data.expected_generation_kwh) : undefined,
        injected_kwh: data.injected_kwh ? parseFloat(data.injected_kwh) : undefined,
        consumed_kwh: data.consumed_kwh ? parseFloat(data.consumed_kwh) : undefined,
        available_for_allocation_kwh: data.available_for_allocation_kwh ? parseFloat(data.available_for_allocation_kwh) : undefined,
        performance_ratio: data.expected_generation_kwh ? 
          (parseFloat(data.generated_kwh) / parseFloat(data.expected_generation_kwh)) * 100 : undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['monthly-generations']);
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const deleteGeneration = useMutation({
    mutationFn: (id) => base44.entities.MonthlyGeneration.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['monthly-generations']);
      setDeleteConfirmOpen(false);
      setRecordToDelete(null);
    }
  });

  const resetForm = () => {
    setFormData({
      power_plant_id: '',
      power_plant_name: '',
      reference_month: '',
      reading_date: '',
      generated_kwh: '',
      expected_generation_kwh: '',
      injected_kwh: '',
      consumed_kwh: '',
      available_for_allocation_kwh: '',
      status: 'pending',
      source: 'manual',
      notes: ''
    });
    setEditingRecord(null);
  };

  const openEditDialog = (record) => {
    setEditingRecord(record);
    setFormData({
      power_plant_id: record.power_plant_id,
      power_plant_name: record.power_plant_name,
      reference_month: record.reference_month,
      reading_date: record.reading_date || '',
      generated_kwh: record.generated_kwh?.toString() || '',
      expected_generation_kwh: record.expected_generation_kwh?.toString() || '',
      injected_kwh: record.injected_kwh?.toString() || '',
      consumed_kwh: record.consumed_kwh?.toString() || '',
      available_for_allocation_kwh: record.available_for_allocation_kwh?.toString() || '',
      status: record.status || 'pending',
      source: record.source || 'manual',
      notes: record.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (record) => {
    setRecordToDelete(record);
    setDeleteConfirmOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingRecord) {
      updateGeneration.mutate({ id: editingRecord.id, data: formData });
    } else {
      createGeneration.mutate(formData);
    }
  };

  const filteredGenerations = generations.filter(gen => {
    const matchesPlant = selectedPlant === 'all' || gen.power_plant_id === selectedPlant;
    const matchesSearch = gen.power_plant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         gen.reference_month?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || gen.status === statusFilter;
    return matchesPlant && matchesSearch && matchesStatus;
  });

  // Agrupar por usina
  const generationsByPlant = powerPlants.map(plant => {
    const plantGens = filteredGenerations.filter(g => g.power_plant_id === plant.id);
    const totalGenerated = plantGens.reduce((sum, g) => sum + (g.generated_kwh || 0), 0);
    const totalExpected = plantGens.reduce((sum, g) => sum + (g.expected_generation_kwh || 0), 0);
    const avgPerformance = totalExpected > 0 ? (totalGenerated / totalExpected) * 100 : 0;
    
    return {
      plant,
      generations: plantGens,
      totalGenerated,
      totalExpected,
      avgPerformance,
      recordCount: plantGens.length
    };
  }).filter(p => p.recordCount > 0);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    allocated: 'bg-green-100 text-green-800',
    closed: 'bg-slate-100 text-slate-800'
  };

  const statusLabels = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    allocated: 'Alocado',
    closed: 'Fechado'
  };

  const sourceLabels = {
    manual: 'Manual',
    solarman: 'Solarman',
    distributor: 'Distribuidora',
    other: 'Outro'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-blue-900 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Geração Mensal das Usinas</h1>
                  <p className="text-blue-300 text-sm">Registre e acompanhe a produção mensal para rateio</p>
                </div>
              </div>
            </div>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-blue-500 hover:bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Novo Registro
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filtros */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-64">
                <Label className="mb-2 block">Usina</Label>
                <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Usinas</SelectItem>
                    {powerPlants.map(plant => (
                      <SelectItem key={plant.id} value={plant.id}>{plant.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-48">
                <Label className="mb-2 block">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="allocated">Alocado</SelectItem>
                    <SelectItem value="closed">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-64">
                <Label className="mb-2 block">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Usina ou mês..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo por Usina */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {generationsByPlant.map(({ plant, totalGenerated, totalExpected, avgPerformance, recordCount }) => (
            <Card key={plant.id} className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{plant.name}</span>
                  <Badge variant="outline">{recordCount} meses</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700 mb-1">Total Gerado</p>
                  <p className="text-xl font-bold text-blue-900">
                    {(totalGenerated / 1000).toFixed(1)}k kWh
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-700 mb-1">Performance Média</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-bold text-slate-900">
                      {avgPerformance.toFixed(1)}%
                    </p>
                    {avgPerformance >= 85 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabela de Registros */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Registros de Geração Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Usina</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Mês Ref.</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Gerado (kWh)</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Esperado (kWh)</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Performance</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Disponível</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Origem</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGenerations.map((gen) => (
                    <tr key={gen.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-4">
                        <p className="font-medium text-slate-900">{gen.power_plant_name}</p>
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-900">
                        {gen.reference_month}
                      </td>
                      <td className="py-4 px-4 text-slate-900">
                        {gen.generated_kwh?.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        {gen.expected_generation_kwh?.toLocaleString() || '-'}
                      </td>
                      <td className="py-4 px-4">
                        {gen.performance_ratio ? (
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${
                              gen.performance_ratio >= 85 ? 'text-green-700' : 
                              gen.performance_ratio >= 70 ? 'text-yellow-700' : 'text-red-700'
                            }`}>
                              {gen.performance_ratio.toFixed(1)}%
                            </span>
                            {gen.performance_ratio >= 85 ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="py-4 px-4 text-slate-900">
                        {gen.available_for_allocation_kwh?.toLocaleString() || '-'}
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={statusColors[gen.status]}>
                          {statusLabels[gen.status]}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="outline">{sourceLabels[gen.source]}</Badge>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(gen)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(gen)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredGenerations.length === 0 && (
                <div className="text-center py-12">
                  <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nenhum registro encontrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Editar Registro' : 'Novo Registro de Geração'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Usina *</Label>
                <Select 
                  value={formData.power_plant_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, power_plant_id: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a usina" />
                  </SelectTrigger>
                  <SelectContent>
                    {powerPlants
                      .filter(p => p.operation_mode === 'monthly_generation')
                      .map(plant => (
                        <SelectItem key={plant.id} value={plant.id}>{plant.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mês de Referência (YYYY-MM) *</Label>
                <Input
                  type="text"
                  value={formData.reference_month}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference_month: e.target.value }))}
                  placeholder="2024-01"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Data da Leitura</Label>
                <Input
                  type="date"
                  value={formData.reading_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, reading_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Energia Gerada (kWh) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.generated_kwh}
                  onChange={(e) => setFormData(prev => ({ ...prev, generated_kwh: e.target.value }))}
                  placeholder="150000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Geração Esperada (kWh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.expected_generation_kwh}
                  onChange={(e) => setFormData(prev => ({ ...prev, expected_generation_kwh: e.target.value }))}
                  placeholder="160000"
                />
              </div>

              <div className="space-y-2">
                <Label>Energia Injetada (kWh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.injected_kwh}
                  onChange={(e) => setFormData(prev => ({ ...prev, injected_kwh: e.target.value }))}
                  placeholder="145000"
                />
              </div>

              <div className="space-y-2">
                <Label>Energia Consumida (kWh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.consumed_kwh}
                  onChange={(e) => setFormData(prev => ({ ...prev, consumed_kwh: e.target.value }))}
                  placeholder="5000"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Disponível para Rateio (kWh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.available_for_allocation_kwh}
                  onChange={(e) => setFormData(prev => ({ ...prev, available_for_allocation_kwh: e.target.value }))}
                  placeholder="145000"
                />
                <p className="text-xs text-slate-500">Energia disponível para distribuir aos clientes</p>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="allocated">Alocado</SelectItem>
                    <SelectItem value="closed">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Origem dos Dados</Label>
                <Select value={formData.source} onValueChange={(value) => setFormData(prev => ({ ...prev, source: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="solarman">Solarman</SelectItem>
                    <SelectItem value="distributor">Distribuidora</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Observações</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observações sobre esta medição"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-blue-500 hover:bg-blue-600">
                {editingRecord ? 'Salvar Alterações' : 'Cadastrar Registro'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro de {recordToDelete?.reference_month} da usina {recordToDelete?.power_plant_name} será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => recordToDelete && deleteGeneration.mutate(recordToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}