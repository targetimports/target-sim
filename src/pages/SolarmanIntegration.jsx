import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, Plus, Sun, AlertTriangle, CheckCircle, 
  XCircle, RefreshCw, Trash2, Eye, Zap, Radio
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function SolarmanIntegration() {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [availableStations, setAvailableStations] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [viewData, setViewData] = useState(null);
  
  const [formData, setFormData] = useState({
    power_plant_id: '',
    station_id: ''
  });

  const { data: integrations = [] } = useQuery({
    queryKey: ['solarman-integrations'],
    queryFn: () => base44.entities.SolarmanIntegration.list()
  });

  const { data: powerPlants = [] } = useQuery({
    queryKey: ['power-plants'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      const response = await base44.functions.invoke('solarmanAPI', {
        action: 'test_connection'
      });

      if (response.data.success) {
        setAvailableStations(response.data.stations || []);
        toast.success('Conexão bem-sucedida! Selecione uma estação.');
      } else {
        toast.error(response.data.error || 'Erro na conexão');
      }
    } catch (error) {
      toast.error('Erro ao testar conexão: ' + error.message);
    } finally {
      setTestingConnection(false);
    }
  };

  const createIntegration = useMutation({
    mutationFn: async (data) => {
      const plant = powerPlants.find(p => p.id === data.power_plant_id);
      return base44.entities.SolarmanIntegration.create({
        ...data,
        power_plant_name: plant?.name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['solarman-integrations']);
      setShowAddDialog(false);
      setFormData({ power_plant_id: '', station_id: '', app_id: '', app_secret: '' });
      setAvailableStations([]);
      toast.success('Integração criada com sucesso!');
    }
  });

  const deleteIntegration = useMutation({
    mutationFn: (id) => base44.entities.SolarmanIntegration.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['solarman-integrations']);
      toast.success('Integração removida');
      setDeleteId(null);
    }
  });

  const syncData = async (integration) => {
    try {
      const response = await base44.functions.invoke('solarmanAPI', {
        action: 'get_realtime_data',
        stationId: integration.station_id,
        integrationId: integration.id
      });

      if (response.data.success) {
        queryClient.invalidateQueries(['solarman-integrations']);
        toast.success('Dados sincronizados!');
      }
    } catch (error) {
      toast.error('Erro ao sincronizar: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Sun className="w-8 h-8 text-yellow-500" />
                Integração Solarman Business
              </h1>
              <p className="text-slate-600 mt-2">
                Conecte suas usinas ao Solarman para monitoramento em tempo real
              </p>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-slate-900">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Integração
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Conectar Usina ao Solarman</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Usina *</Label>
                    <Select 
                      value={formData.power_plant_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, power_plant_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a usina" />
                      </SelectTrigger>
                      <SelectContent>
                        {powerPlants.map(plant => (
                          <SelectItem key={plant.id} value={plant.id}>
                            {plant.name} - {plant.city}/{plant.state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      💡 As credenciais Solarman (App ID e Secret) são configuradas globalmente nas variáveis de ambiente do sistema.
                    </p>
                  </div>

                  <Button 
                    onClick={testConnection} 
                    disabled={testingConnection}
                    variant="outline"
                    className="w-full"
                  >
                    {testingConnection ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Testando conexão...
                      </>
                    ) : (
                      <>
                        <Radio className="w-4 h-4 mr-2" />
                        Testar Conexão e Listar Estações
                      </>
                    )}
                  </Button>

                  {availableStations.length > 0 && (
                    <div className="space-y-2">
                      <Label>Estação Solarman *</Label>
                      <Select 
                        value={formData.station_id}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, station_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a estação" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStations.map(station => (
                            <SelectItem key={station.id} value={station.id.toString()}>
                              {station.name} ({station.id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowAddDialog(false);
                        setFormData({ power_plant_id: '', station_id: '' });
                        setAvailableStations([]);
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={() => createIntegration.mutate(formData)}
                      disabled={!formData.power_plant_id || !formData.station_id}
                      className="flex-1 bg-slate-900"
                    >
                      Criar Integração
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Lista de Integrações */}
        <div className="grid gap-4">
          {integrations.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Sun className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Nenhuma integração configurada
                </h3>
                <p className="text-slate-600 mb-4">
                  Conecte suas usinas ao Solarman para começar o monitoramento
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Integração
                </Button>
              </CardContent>
            </Card>
          ) : (
            integrations.map(integration => (
              <Card key={integration.id} className="border-l-4 border-l-yellow-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                        <Sun className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{integration.power_plant_name}</CardTitle>
                        <CardDescription>
                          Station ID: {integration.station_id}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        integration.sync_status === 'success' ? 'bg-green-100 text-green-800' :
                        integration.sync_status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-800'
                      }>
                        {integration.sync_status === 'success' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {integration.sync_status === 'error' && <XCircle className="w-3 h-3 mr-1" />}
                        {integration.sync_status === 'success' ? 'Sincronizado' :
                         integration.sync_status === 'error' ? 'Erro' : 'Pendente'}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => syncData(integration)}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sincronizar
                      </Button>
                      {integration.last_data && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setViewData(integration.last_data)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Dados
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setDeleteId(integration.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {integration.last_sync && (
                  <CardContent>
                    <p className="text-sm text-slate-600">
                      Última sincronização: {new Date(integration.last_sync).toLocaleString('pt-BR')}
                    </p>
                    {integration.error_message && (
                      <p className="text-sm text-red-600 mt-1">
                        Erro: {integration.error_message}
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>

        {/* Dialog para visualizar dados */}
        <Dialog open={!!viewData} onOpenChange={() => setViewData(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Dados em Tempo Real</DialogTitle>
            </DialogHeader>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
              {JSON.stringify(viewData, null, 2)}
            </pre>
          </DialogContent>
        </Dialog>

        {/* Confirmar exclusão */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover integração?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A integração será removida permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteIntegration.mutate(deleteId)}>
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}