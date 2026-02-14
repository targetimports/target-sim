import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Cloud, Plus, Pencil, Trash2, ArrowLeft, RefreshCw, 
  CheckCircle, XCircle, Clock, Zap, Activity
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
  DialogDescription,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DeyeIntegration() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [integrationToDelete, setIntegrationToDelete] = useState(null);
  const [syncingId, setSyncingId] = useState(null);
  const [logs, setLogs] = useState([]);
  
  const [formData, setFormData] = useState({
    power_plant_id: '',
    station_id: '',
    is_active: true,
    auto_import_generation: false
  });

  const { data: powerPlants = [] } = useQuery({
    queryKey: ['powerplants'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['deye-settings'],
    queryFn: () => base44.entities.DeyeSettings.list()
  });

  const { data: integrations = [] } = useQuery({
    queryKey: ['deye-integrations'],
    queryFn: () => base44.entities.DeyeIntegration.list('-created_date')
  });

  const createIntegration = useMutation({
    mutationFn: (data) => {
      const plant = powerPlants.find(p => p.id === data.power_plant_id);
      return base44.entities.DeyeIntegration.create({
        ...data,
        power_plant_name: plant?.name || ''
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['deye-integrations']);
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const updateIntegration = useMutation({
    mutationFn: ({ id, data }) => {
      const plant = powerPlants.find(p => p.id === data.power_plant_id);
      return base44.entities.DeyeIntegration.update(id, {
        ...data,
        power_plant_name: plant?.name || ''
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['deye-integrations']);
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const deleteIntegration = useMutation({
    mutationFn: (id) => base44.entities.DeyeIntegration.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['deye-integrations']);
      setDeleteConfirmOpen(false);
      setIntegrationToDelete(null);
    }
  });

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`].slice(-20));
  };

  const handleSync = async (integrationId, action = 'sync_all') => {
    setSyncingId(integrationId);
    setLogs([]);
    addLog('Iniciando sincronização...');
    try {
      const config = settings[0];
      if (!config?.manualToken) {
        addLog('❌ Token manual não configurado');
        setSyncingId(null);
        return;
      }

      addLog('Token encontrado, chamando API...');
      const response = await base44.functions.invoke('deyeAPI', {
        action,
        integration_id: integrationId,
        manual_token: config.manualToken
      });
      
      addLog(`Resposta recebida: ${JSON.stringify(response)}`);
      
      if (response?.data?.status === 'success') {
        addLog('✅ Sincronização concluída com sucesso!');
        alert('✅ Sincronização concluída com sucesso!');
      } else {
        const errorMsg = response?.data?.message || response?.message || 'Falha na sincronização';
        addLog(`❌ Erro: ${errorMsg}`);
        alert(`❌ Erro: ${errorMsg}`);
      }
      queryClient.invalidateQueries(['deye-integrations']);
    } catch (error) {
      const errorMsg = error?.response?.data?.message || error.message || 'Erro desconhecido';
      addLog(`❌ Erro: ${errorMsg}`);
      console.error('Erro ao sincronizar:', error);
      alert(`❌ Erro: ${errorMsg}`);
    } finally {
      setSyncingId(null);
    }
  };

  const handleTestConnection = async (integrationId) => {
    setSyncingId(integrationId);
    try {
      const config = settings[0];
      if (!config?.manualToken) {
        alert('❌ Token manual não configurado. Configure um token em Deye Configuration.');
        setSyncingId(null);
        return;
      }

      const response = await base44.functions.invoke('deyeAPI', {
        action: 'test_connection',
        integration_id: integrationId,
        manual_token: config.manualToken
      });
      
      if (response?.data?.status === 'success') {
        alert('✅ Conexão testada com sucesso!');
      } else {
        const errorMsg = response?.data?.message || response?.message || 'Falha ao testar conexão';
        alert(`❌ Erro: ${errorMsg}`);
      }
      queryClient.invalidateQueries(['deye-integrations']);
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      alert(`❌ Erro: ${error?.response?.data?.message || error.message || 'Erro desconhecido'}`);
    } finally {
      setSyncingId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      power_plant_id: '',
      station_id: '',
      is_active: true,
      auto_import_generation: false
    });
    setEditingIntegration(null);
  };

  const openEditDialog = (integration) => {
    setEditingIntegration(integration);
    setFormData({
      power_plant_id: integration.power_plant_id,
      station_id: integration.station_id,
      is_active: integration.is_active,
      auto_import_generation: integration.auto_import_generation || false
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (integration) => {
    setIntegrationToDelete(integration);
    setDeleteConfirmOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingIntegration) {
      updateIntegration.mutate({ id: editingIntegration.id, data: formData });
    } else {
      createIntegration.mutate(formData);
    }
  };

  const statusColors = {
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800'
  };

  const statusLabels = {
    success: 'Sincronizado',
    error: 'Erro',
    pending: 'Pendente'
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
                  <Cloud className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Integração Deye Cloud</h1>
                  <p className="text-blue-300 text-sm">Monitore suas usinas via API Deye Cloud</p>
                </div>
              </div>
            </div>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-blue-500 hover:bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Nova Integração
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Logs */}
        {logs.length > 0 && (
          <Card className="mb-8 bg-slate-900 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm">Logs de Execução</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-950 rounded p-3 h-48 overflow-y-auto font-mono text-xs text-green-400 space-y-1">
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estatísticas */}
        <div className="grid sm:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Integrações</p>
                  <p className="text-2xl font-bold text-slate-900">{integrations.length}</p>
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
                  <p className="text-sm text-slate-500">Ativas</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {integrations.filter(i => i.is_active).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Auto-Importação</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {integrations.filter(i => i.auto_import_generation).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Integrações */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Integrações Configuradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {integrations.map((integration) => (
                <div key={integration.id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">{integration.power_plant_name}</h3>
                        <Badge className={integration.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}>
                          {integration.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                        {integration.auto_import_generation && (
                          <Badge variant="outline">Auto-Importação</Badge>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2 text-sm text-slate-600">
                        <p><strong>Station ID:</strong> {integration.station_id}</p>
                        {integration.last_sync && (
                          <p><strong>Última Sinc:</strong> {format(new Date(integration.last_sync), 'dd/MM/yyyy HH:mm')}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <strong>Status:</strong>
                          <Badge className={statusColors[integration.sync_status]}>
                            {statusLabels[integration.sync_status]}
                          </Badge>
                        </div>
                      </div>
                      {integration.error_message && (
                        <p className="text-sm text-red-600 mt-2">❌ {integration.error_message}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleTestConnection(integration.id)}
                        disabled={syncingId === integration.id}
                      >
                        <RefreshCw className={`w-4 h-4 ${syncingId === integration.id ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleSync(integration.id)}
                        disabled={syncingId === integration.id}
                      >
                        <Cloud className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(integration)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(integration)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {integrations.length === 0 && (
                <div className="text-center py-12">
                  <Cloud className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nenhuma integração configurada</p>
                  <Button onClick={() => setIsDialogOpen(true)} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Primeira Integração
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Dialog Criar/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingIntegration ? 'Editar Integração' : 'Nova Integração Deye'}</DialogTitle>
            <DialogDescription>
              {editingIntegration ? 'Altere as configurações da integração Deye' : 'Configure uma nova integração com Deye Cloud API'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
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
                  {powerPlants.map(plant => (
                    <SelectItem key={plant.id} value={plant.id}>{plant.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Station ID *</Label>
              <Input
                value={formData.station_id}
                onChange={(e) => setFormData(prev => ({ ...prev, station_id: e.target.value }))}
                placeholder="ID da estação no Deye Cloud"
                required
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <Label htmlFor="is_active">Integração Ativa</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <Label htmlFor="auto_import">Auto-Importar Geração Mensal</Label>
                <p className="text-xs text-slate-600 mt-1">
                  Importa automaticamente para MonthlyGeneration
                </p>
              </div>
              <Switch
                id="auto_import"
                checked={formData.auto_import_generation}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_import_generation: checked }))}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-blue-500 hover:bg-blue-600">
                {editingIntegration ? 'Salvar' : 'Criar Integração'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Integração?</AlertDialogTitle>
            <AlertDialogDescription>
              A integração com {integrationToDelete?.power_plant_name} será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => integrationToDelete && deleteIntegration.mutate(integrationToDelete.id)}
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