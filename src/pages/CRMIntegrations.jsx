import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2, Plus, ArrowLeft, Trash2, Pencil, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from 'date-fns';

export default function CRMIntegrations() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    crm_type: 'salesforce',
    sync_leads: true,
    sync_customers: true,
    log_automations: true,
    log_tasks: true,
    sync_frequency: 'realtime',
    webhook_secret: ''
  });

  const { data: integrations = [] } = useQuery({
    queryKey: ['crm-integrations'],
    queryFn: () => base44.entities.CRMIntegration.list('-created_date', 100)
  });

  const { data: syncLogs = [] } = useQuery({
    queryKey: ['crm-sync-logs'],
    queryFn: () => base44.entities.CRMSyncLog.list('-created_date', 50)
  });

  const createIntegration = useMutation({
    mutationFn: (data) => base44.entities.CRMIntegration.create({
      ...data,
      webhook_secret: Math.random().toString(36).substring(2, 15)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['crm-integrations']);
      setIsDialogOpen(false);
      resetForm();
      toast.success('Integração CRM criada!');
    }
  });

  const updateIntegration = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CRMIntegration.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['crm-integrations']);
      setIsDialogOpen(false);
      resetForm();
      toast.success('Integração atualizada!');
    }
  });

  const deleteIntegration = useMutation({
    mutationFn: (id) => base44.entities.CRMIntegration.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['crm-integrations']);
      toast.success('Integração excluída!');
    }
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.CRMIntegration.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries(['crm-integrations']);
    }
  });

  const syncNow = useMutation({
    mutationFn: (integrationId) => base44.functions.invoke('syncCRM', { integration_id: integrationId }),
    onSuccess: () => {
      toast.success('Sincronização iniciada!');
      queryClient.invalidateQueries(['crm-sync-logs']);
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      crm_type: 'salesforce',
      sync_leads: true,
      sync_customers: true,
      log_automations: true,
      log_tasks: true,
      sync_frequency: 'realtime',
      webhook_secret: ''
    });
    setEditingIntegration(null);
  };

  const handleEdit = (integration) => {
    setEditingIntegration(integration);
    setFormData({
      name: integration.name,
      crm_type: integration.crm_type,
      sync_leads: integration.sync_leads,
      sync_customers: integration.sync_customers,
      log_automations: integration.log_automations,
      log_tasks: integration.log_tasks,
      sync_frequency: integration.sync_frequency,
      webhook_secret: integration.webhook_secret
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingIntegration) {
      updateIntegration.mutate({ id: editingIntegration.id, data: formData });
    } else {
      createIntegration.mutate(formData);
    }
  };

  const crmLogos = {
    salesforce: '☁️',
    hubspot: '🟠',
    pipedrive: '🟢',
    zoho: '🟣',
    other: '🔗'
  };

  const webhookUrl = window.location.origin + '/api/functions/crmWebhook';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Link2 className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">Integrações CRM</h1>
                  <p className="text-sm text-white/80">Conecte com Salesforce, HubSpot e mais</p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-white/30 text-white hover:bg-white/20"
              onClick={() => { resetForm(); setIsDialogOpen(true); }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Integração
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Link2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Integrações Ativas</p>
                  <p className="text-2xl font-bold">{integrations.filter(i => i.is_active).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Sincronizações Hoje</p>
                  <p className="text-2xl font-bold">
                    {syncLogs.filter(log => 
                      new Date(log.created_date).toDateString() === new Date().toDateString()
                    ).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Link2 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Taxa de Sucesso</p>
                  <p className="text-2xl font-bold">
                    {syncLogs.length > 0 
                      ? Math.round((syncLogs.filter(l => l.status === 'success').length / syncLogs.length) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Integrations */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Integrações Configuradas</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {integrations.map((integration) => (
              <Card key={integration.id} className={integration.is_active ? 'border-2 border-blue-200' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{crmLogos[integration.crm_type]}</div>
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <p className="text-sm text-slate-500 capitalize">{integration.crm_type}</p>
                      </div>
                    </div>
                    <Switch
                      checked={integration.is_active}
                      onCheckedChange={(checked) => toggleActive.mutate({ id: integration.id, is_active: checked })}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {integration.sync_leads && (
                        <Badge variant="outline" className="bg-blue-50">
                          📊 Leads
                        </Badge>
                      )}
                      {integration.sync_customers && (
                        <Badge variant="outline" className="bg-green-50">
                          👤 Clientes
                        </Badge>
                      )}
                      {integration.log_automations && (
                        <Badge variant="outline" className="bg-purple-50">
                          ⚡ Automações
                        </Badge>
                      )}
                      {integration.log_tasks && (
                        <Badge variant="outline" className="bg-orange-50">
                          ✅ Tarefas
                        </Badge>
                      )}
                    </div>

                    {integration.last_sync && (
                      <p className="text-xs text-slate-500">
                        Última sincronização: {format(new Date(integration.last_sync), 'dd/MM/yyyy HH:mm')}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => syncNow.mutate(integration.id)}
                        disabled={!integration.is_active}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Sincronizar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(integration)}>
                        <Pencil className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteIntegration.mutate(integration.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>

                    {integration.webhook_secret && (
                      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs font-medium text-slate-700 mb-1">Webhook URL:</p>
                        <code className="text-xs text-slate-600 break-all">{webhookUrl}</code>
                        <p className="text-xs font-medium text-slate-700 mt-2 mb-1">Secret:</p>
                        <code className="text-xs text-slate-600 break-all">{integration.webhook_secret}</code>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {integrations.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Link2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma integração configurada</h3>
                <p className="text-slate-500 mb-6">Conecte seu CRM para sincronizar dados automaticamente</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar integração
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sync Logs */}
        {syncLogs.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Registro de Sincronizações</h2>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-medium">Data</th>
                        <th className="text-left py-3 px-4 text-sm font-medium">Tipo</th>
                        <th className="text-left py-3 px-4 text-sm font-medium">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium">Integração</th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncLogs.slice(0, 20).map((log) => {
                        const integration = integrations.find(i => i.id === log.integration_id);
                        return (
                          <tr key={log.id} className="border-b hover:bg-slate-50">
                            <td className="py-3 px-4 text-sm">
                              {format(new Date(log.created_date), 'dd/MM/yyyy HH:mm')}
                            </td>
                            <td className="py-3 px-4 text-sm capitalize">
                              {log.sync_type.replace(/_/g, ' ')}
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={
                                log.status === 'success' ? 'bg-green-100 text-green-800' :
                                log.status === 'failed' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }>
                                {log.status === 'success' ? 'Sucesso' :
                                 log.status === 'failed' ? 'Falhou' : 'Pendente'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {integration?.name || 'N/A'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingIntegration ? 'Editar Integração' : 'Nova Integração CRM'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Salesforce Principal"
                required
              />
            </div>

            <div>
              <Label>Tipo de CRM *</Label>
              <Select value={formData.crm_type} onValueChange={(v) => setFormData(prev => ({ ...prev, crm_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salesforce">☁️ Salesforce</SelectItem>
                  <SelectItem value="hubspot">🟠 HubSpot</SelectItem>
                  <SelectItem value="pipedrive">🟢 Pipedrive</SelectItem>
                  <SelectItem value="zoho">🟣 Zoho CRM</SelectItem>
                  <SelectItem value="other">🔗 Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">O que sincronizar?</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Sincronizar Leads</Label>
                  <Switch
                    checked={formData.sync_leads}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sync_leads: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Sincronizar Clientes</Label>
                  <Switch
                    checked={formData.sync_customers}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sync_customers: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Registrar Automações</Label>
                  <Switch
                    checked={formData.log_automations}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, log_automations: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Registrar Tarefas</Label>
                  <Switch
                    checked={formData.log_tasks}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, log_tasks: checked }))}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Frequência de Sincronização</Label>
              <Select value={formData.sync_frequency} onValueChange={(v) => setFormData(prev => ({ ...prev, sync_frequency: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">⚡ Tempo Real</SelectItem>
                  <SelectItem value="hourly">🕐 Hora em Hora</SelectItem>
                  <SelectItem value="daily">📅 Diariamente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={createIntegration.isPending || updateIntegration.isPending}>
                {editingIntegration ? 'Salvar' : 'Criar Integração'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}