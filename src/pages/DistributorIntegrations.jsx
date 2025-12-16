import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2, Plus, RefreshCw, CheckCircle, XCircle, ArrowLeft, Settings } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function DistributorIntegrations() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    distributor_name: '',
    power_plant_id: '',
    integration_type: 'manual',
    api_endpoint: '',
    api_key: '',
    sync_frequency: 'daily',
    status: 'active'
  });

  const { data: integrations = [] } = useQuery({
    queryKey: ['distributor-integrations'],
    queryFn: () => base44.entities.DistributorIntegration.list()
  });

  const { data: plants = [] } = useQuery({
    queryKey: ['plants-integrations'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const createIntegrationMutation = useMutation({
    mutationFn: (data) => base44.entities.DistributorIntegration.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['distributor-integrations']);
      setShowDialog(false);
      setFormData({
        distributor_name: '',
        power_plant_id: '',
        integration_type: 'manual',
        api_endpoint: '',
        api_key: '',
        sync_frequency: 'daily',
        status: 'active'
      });
      toast.success('Integração criada!');
    }
  });

  const syncMutation = useMutation({
    mutationFn: async (integration) => {
      await base44.entities.DistributorIntegration.update(integration.id, {
        last_sync: new Date().toISOString(),
        status: 'active'
      });
      return integration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['distributor-integrations']);
      toast.success('Sincronização manual registrada!');
    }
  });

  const activeIntegrations = integrations.filter(i => i.status === 'active').length;
  const errorIntegrations = integrations.filter(i => i.status === 'error').length;

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-slate-100 text-slate-800',
    error: 'bg-red-100 text-red-800'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-teal-900 to-cyan-900 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">🔌 Integração com Distribuidoras</h1>
                <p className="text-cyan-100 text-sm">APIs e sincronização de dados</p>
              </div>
            </div>
            <Button onClick={() => setShowDialog(true)} className="bg-white text-teal-900 hover:bg-teal-50">
              <Plus className="w-4 h-4 mr-2" />
              Nova Integração
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                  <Link2 className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Integrações</p>
                  <p className="text-2xl font-bold">{integrations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Ativas</p>
                  <p className="text-2xl font-bold text-green-600">{activeIntegrations}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Com Erro</p>
                  <p className="text-2xl font-bold text-red-600">{errorIntegrations}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Integrações Configuradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {integrations.map((integration) => {
                const plant = plants.find(p => p.id === integration.power_plant_id);
                return (
                  <div key={integration.id} className="p-4 bg-slate-50 rounded-xl border">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{integration.distributor_name}</h3>
                          <Badge className={statusColors[integration.status]}>
                            {integration.status === 'active' ? 'Ativa' :
                             integration.status === 'error' ? 'Erro' : 'Inativa'}
                          </Badge>
                          <Badge variant="outline">
                            {integration.integration_type === 'api' ? '🔗 API' :
                             integration.integration_type === 'file_upload' ? '📁 Arquivo' : '✏️ Manual'}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-1">
                          <strong>Usina:</strong> {plant?.name || integration.power_plant_id}
                        </p>
                        {integration.api_endpoint && (
                          <p className="text-sm text-slate-600 mb-1">
                            <strong>Endpoint:</strong> {integration.api_endpoint}
                          </p>
                        )}
                        <p className="text-sm text-slate-600 mb-1">
                          <strong>Frequência:</strong>{' '}
                          {integration.sync_frequency === 'hourly' ? 'A cada hora' :
                           integration.sync_frequency === 'daily' ? 'Diária' :
                           integration.sync_frequency === 'weekly' ? 'Semanal' : 'Manual'}
                        </p>
                        {integration.last_sync && (
                          <p className="text-xs text-slate-500 mt-2">
                            Última sincronização: {format(new Date(integration.last_sync), 'dd/MM/yyyy HH:mm')}
                          </p>
                        )}
                        {integration.last_error && (
                          <p className="text-xs text-red-600 mt-2">
                            Erro: {integration.last_error}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncMutation.mutate(integration)}
                        disabled={syncMutation.isPending}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sincronizar
                      </Button>
                    </div>
                  </div>
                );
              })}
              {integrations.length === 0 && (
                <div className="text-center py-12">
                  <Link2 className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhuma integração configurada</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Integração</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createIntegrationMutation.mutate(formData); }} className="space-y-4">
            <div>
              <Label>Nome da Distribuidora</Label>
              <Input
                value={formData.distributor_name}
                onChange={(e) => setFormData(prev => ({ ...prev, distributor_name: e.target.value }))}
                placeholder="Ex: CPFL, Enel, Cemig"
                required
              />
            </div>

            <div>
              <Label>Usina</Label>
              <Select value={formData.power_plant_id} onValueChange={(v) => setFormData(prev => ({ ...prev, power_plant_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a usina" />
                </SelectTrigger>
                <SelectContent>
                  {plants.map(plant => (
                    <SelectItem key={plant.id} value={plant.id}>
                      {plant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Integração</Label>
              <Select value={formData.integration_type} onValueChange={(v) => setFormData(prev => ({ ...prev, integration_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="api">🔗 API Automática</SelectItem>
                  <SelectItem value="file_upload">📁 Upload de Arquivo</SelectItem>
                  <SelectItem value="manual">✏️ Entrada Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.integration_type === 'api' && (
              <>
                <div>
                  <Label>Endpoint da API</Label>
                  <Input
                    value={formData.api_endpoint}
                    onChange={(e) => setFormData(prev => ({ ...prev, api_endpoint: e.target.value }))}
                    placeholder="https://api.distribuidora.com/v1/generation"
                  />
                </div>
                <div>
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                    placeholder="Chave de autenticação"
                  />
                </div>
              </>
            )}

            <div>
              <Label>Frequência de Sincronização</Label>
              <Select value={formData.sync_frequency} onValueChange={(v) => setFormData(prev => ({ ...prev, sync_frequency: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">A cada hora</SelectItem>
                  <SelectItem value="daily">Diária</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700">
                Criar Integração
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}