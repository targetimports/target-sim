import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Plus, ArrowLeft, Trash2, Pencil, Play, Users, UserCog } from 'lucide-react';
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

export default function AutomationManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'invoice_due_soon',
    trigger_config: {},
    action_type: 'send_whatsapp',
    action_config: {},
    target_audience: 'customers',
    schedule_type: 'immediate',
    schedule_config: {}
  });

  const { data: automations = [] } = useQuery({
    queryKey: ['automations'],
    queryFn: () => base44.entities.Automation.list('-created_date', 100)
  });

  const createAutomation = useMutation({
    mutationFn: (data) => base44.entities.Automation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['automations']);
      setIsDialogOpen(false);
      resetForm();
      toast.success('Automação criada!');
    }
  });

  const updateAutomation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Automation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['automations']);
      setIsDialogOpen(false);
      resetForm();
      toast.success('Automação atualizada!');
    }
  });

  const deleteAutomation = useMutation({
    mutationFn: (id) => base44.entities.Automation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['automations']);
      toast.success('Automação excluída!');
    }
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.Automation.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries(['automations']);
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      trigger_type: 'invoice_due_soon',
      trigger_config: {},
      action_type: 'send_whatsapp',
      action_config: {},
      target_audience: 'customers',
      schedule_type: 'immediate',
      schedule_config: {}
    });
    setEditingAutomation(null);
  };

  const handleEdit = (automation) => {
    setEditingAutomation(automation);
    setFormData({
      name: automation.name,
      description: automation.description || '',
      trigger_type: automation.trigger_type,
      trigger_config: automation.trigger_config || {},
      action_type: automation.action_type,
      action_config: automation.action_config || {},
      target_audience: automation.target_audience,
      schedule_type: automation.schedule_type || 'immediate',
      schedule_config: automation.schedule_config || {}
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingAutomation) {
      updateAutomation.mutate({ id: editingAutomation.id, data: formData });
    } else {
      createAutomation.mutate(formData);
    }
  };

  const triggerLabels = {
    invoice_due_soon: '💰 Fatura próxima do vencimento',
    lead_no_contact: '📞 Lead sem contato há X dias',
    ticket_high_priority: '🚨 Ticket de alta prioridade',
    lead_inactive: '⏰ Lead inativo por X dias',
    credit_expiring: '⚡ Crédito expirando',
    payment_overdue: '❌ Pagamento vencido',
    lead_status_won: '🎉 Lead ganho',
    lead_status_lost: '😔 Lead perdido',
    invoice_payment_late: '⚠️ Fatura com atraso',
    new_subscription: '✨ Nova assinatura',
    subscription_cancelled: '❌ Assinatura cancelada'
  };

  const actionLabels = {
    send_sms: '📱 Enviar SMS',
    send_email: '📧 Enviar Email',
    send_whatsapp: '💬 Enviar WhatsApp',
    add_to_campaign: '📢 Adicionar a campanha',
    notify_team: '👥 Notificar equipe',
    update_status: '🔄 Atualizar status',
    create_notification: '🔔 Criar notificação',
    create_follow_up_task: '📋 Criar tarefa de follow-up',
    send_internal_notification: '📣 Notificação interna',
    assign_to_user: '👤 Atribuir a usuário'
  };

  const scheduleLabels = {
    immediate: '⚡ Imediato',
    daily: '📅 Diário',
    weekly: '📆 Semanal',
    monthly: '🗓️ Mensal'
  };

  const customerAutomations = automations.filter(a => a.target_audience === 'customers');
  const leadAutomations = automations.filter(a => a.target_audience === 'leads');
  const adminAutomations = automations.filter(a => a.target_audience === 'admins');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Zap className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">Automações de Fluxo</h1>
                  <p className="text-sm text-white/80">Gatilhos e ações automáticas</p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-white/30 text-white hover:bg-white/20"
              onClick={() => { resetForm(); setIsDialogOpen(true); }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Automação
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
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Para Clientes</p>
                  <p className="text-2xl font-bold">{customerAutomations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <UserCog className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Para Admins</p>
                  <p className="text-2xl font-bold">{adminAutomations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Ativas</p>
                  <p className="text-2xl font-bold">{automations.filter(a => a.is_active).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Automações para Clientes */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Automações para Clientes
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {customerAutomations.map((automation) => (
              <Card key={automation.id} className={automation.is_active ? 'border-2 border-blue-200' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{automation.name}</CardTitle>
                      <p className="text-sm text-slate-500 mt-1">{automation.description}</p>
                    </div>
                    <Switch
                      checked={automation.is_active}
                      onCheckedChange={(checked) => toggleActive.mutate({ id: automation.id, is_active: checked })}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="bg-blue-50">
                        {triggerLabels[automation.trigger_type]}
                      </Badge>
                      <span className="text-slate-400">→</span>
                      <Badge variant="outline" className="bg-green-50">
                        {actionLabels[automation.action_type]}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      {automation.schedule_type && automation.schedule_type !== 'immediate' && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {scheduleLabels[automation.schedule_type]}
                          </Badge>
                        </p>
                      )}
                      {automation.last_execution && (
                        <p className="text-xs text-slate-500">
                          Última execução: {format(new Date(automation.last_execution), 'dd/MM/yyyy HH:mm')}
                        </p>
                      )}
                      {automation.execution_count > 0 && (
                        <p className="text-xs text-slate-400">
                          {automation.execution_count} execuções • {automation.success_count || 0} sucesso
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(automation)}>
                        <Pencil className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteAutomation.mutate(automation.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Automações para Admins */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            Automações para Administradores
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {adminAutomations.map((automation) => (
              <Card key={automation.id} className={automation.is_active ? 'border-2 border-green-200' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{automation.name}</CardTitle>
                      <p className="text-sm text-slate-500 mt-1">{automation.description}</p>
                    </div>
                    <Switch
                      checked={automation.is_active}
                      onCheckedChange={(checked) => toggleActive.mutate({ id: automation.id, is_active: checked })}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="bg-orange-50">
                        {triggerLabels[automation.trigger_type]}
                      </Badge>
                      <span className="text-slate-400">→</span>
                      <Badge variant="outline" className="bg-purple-50">
                        {actionLabels[automation.action_type]}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      {automation.schedule_type && automation.schedule_type !== 'immediate' && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {scheduleLabels[automation.schedule_type]}
                          </Badge>
                        </p>
                      )}
                      {automation.last_execution && (
                        <p className="text-xs text-slate-500">
                          Última execução: {format(new Date(automation.last_execution), 'dd/MM/yyyy HH:mm')}
                        </p>
                      )}
                      {automation.execution_count > 0 && (
                        <p className="text-xs text-slate-400">
                          {automation.execution_count} execuções • {automation.success_count || 0} sucesso
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(automation)}>
                        <Pencil className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteAutomation.mutate(automation.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Automações para Leads */}
        {leadAutomations.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Automações para Leads</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {leadAutomations.map((automation) => (
                <Card key={automation.id} className={automation.is_active ? 'border-2 border-purple-200' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{automation.name}</CardTitle>
                        <p className="text-sm text-slate-500 mt-1">{automation.description}</p>
                      </div>
                      <Switch
                        checked={automation.is_active}
                        onCheckedChange={(checked) => toggleActive.mutate({ id: automation.id, is_active: checked })}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="bg-yellow-50">
                          {triggerLabels[automation.trigger_type]}
                        </Badge>
                        <span className="text-slate-400">→</span>
                        <Badge variant="outline" className="bg-pink-50">
                          {actionLabels[automation.action_type]}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(automation)}>
                          <Pencil className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteAutomation.mutate(automation.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {automations.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma automação criada</h3>
              <p className="text-slate-500 mb-6">Configure gatilhos e ações automáticas para otimizar seu fluxo de trabalho</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar primeira automação
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAutomation ? 'Editar Automação' : 'Nova Automação'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome da automação *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Lembrete de vencimento"
                required
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o que esta automação faz..."
                rows={2}
              />
            </div>

            <div>
              <Label>Público alvo *</Label>
              <Select value={formData.target_audience} onValueChange={(v) => setFormData(prev => ({ ...prev, target_audience: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customers">👤 Clientes</SelectItem>
                  <SelectItem value="leads">🎯 Leads</SelectItem>
                  <SelectItem value="admins">👥 Administradores</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">⚡ Gatilho (Quando executar)</h3>
              <Select value={formData.trigger_type} onValueChange={(v) => setFormData(prev => ({ ...prev, trigger_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice_due_soon">💰 Fatura próxima do vencimento</SelectItem>
                  <SelectItem value="invoice_payment_late">⚠️ Fatura com atraso</SelectItem>
                  <SelectItem value="payment_overdue">❌ Pagamento vencido</SelectItem>
                  <SelectItem value="credit_expiring">⚡ Crédito expirando</SelectItem>
                  <SelectItem value="lead_no_contact">📞 Lead sem contato há X dias</SelectItem>
                  <SelectItem value="lead_inactive">⏰ Lead inativo por X dias</SelectItem>
                  <SelectItem value="lead_status_won">🎉 Lead ganho</SelectItem>
                  <SelectItem value="lead_status_lost">😔 Lead perdido</SelectItem>
                  <SelectItem value="ticket_high_priority">🚨 Ticket de alta prioridade</SelectItem>
                  <SelectItem value="new_subscription">✨ Nova assinatura</SelectItem>
                  <SelectItem value="subscription_cancelled">❌ Assinatura cancelada</SelectItem>
                </SelectContent>
              </Select>

              {(formData.trigger_type === 'invoice_due_soon' || formData.trigger_type === 'lead_no_contact' || formData.trigger_type === 'lead_inactive' || formData.trigger_type === 'invoice_payment_late') && (
                <div className="mt-3">
                  <Label>Dias {formData.trigger_type === 'invoice_due_soon' ? 'antes' : 'após'}</Label>
                  <Input
                    type="number"
                    value={formData.trigger_config.days || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      trigger_config: { ...prev.trigger_config, days: parseInt(e.target.value) }
                    }))}
                    placeholder="Ex: 1, 7, 30"
                  />
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">🎯 Ação (O que fazer)</h3>
              <Select value={formData.action_type} onValueChange={(v) => setFormData(prev => ({ ...prev, action_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="send_sms">📱 Enviar SMS</SelectItem>
                  <SelectItem value="send_email">📧 Enviar Email</SelectItem>
                  <SelectItem value="send_whatsapp">💬 Enviar WhatsApp</SelectItem>
                  <SelectItem value="add_to_campaign">📢 Adicionar a campanha</SelectItem>
                  <SelectItem value="notify_team">👥 Notificar equipe</SelectItem>
                  <SelectItem value="send_internal_notification">📣 Notificação interna</SelectItem>
                  <SelectItem value="create_notification">🔔 Criar notificação</SelectItem>
                  <SelectItem value="create_follow_up_task">📋 Criar tarefa de follow-up</SelectItem>
                  <SelectItem value="update_status">🔄 Atualizar status</SelectItem>
                  <SelectItem value="assign_to_user">👤 Atribuir a usuário</SelectItem>
                </SelectContent>
              </Select>

              {(formData.action_type === 'send_sms' || formData.action_type === 'send_email' || formData.action_type === 'send_whatsapp') && (
                <div className="mt-3">
                  <Label>Mensagem</Label>
                  <Textarea
                    value={formData.action_config.message || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      action_config: { ...prev.action_config, message: e.target.value }
                    }))}
                    placeholder="Digite a mensagem a ser enviada..."
                    rows={3}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Variáveis: {'{{nome}}'}, {'{{email}}'}, {'{{valor}}'}, {'{{data}}'}
                  </p>
                </div>
              )}

              {formData.action_type === 'update_status' && (
                <div className="mt-3">
                  <Label>Novo status</Label>
                  <Input
                    value={formData.action_config.new_status || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      action_config: { ...prev.action_config, new_status: e.target.value }
                    }))}
                    placeholder="Ex: lost, inactive"
                  />
                </div>
              )}

              {formData.action_type === 'create_follow_up_task' && (
                <div className="mt-3 space-y-3">
                  <div>
                    <Label>Título da tarefa</Label>
                    <Input
                      value={formData.action_config.task_title || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        action_config: { ...prev.action_config, task_title: e.target.value }
                      }))}
                      placeholder="Ex: Ligar para lead"
                    />
                  </div>
                  <div>
                    <Label>Descrição da tarefa</Label>
                    <Textarea
                      value={formData.action_config.task_description || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        action_config: { ...prev.action_config, task_description: e.target.value }
                      }))}
                      placeholder="Detalhes da tarefa..."
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {(formData.action_type === 'send_internal_notification' || formData.action_type === 'notify_team') && (
                <div className="mt-3">
                  <Label>Email da equipe</Label>
                  <Input
                    value={formData.action_config.team_email || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      action_config: { ...prev.action_config, team_email: e.target.value }
                    }))}
                    placeholder="suporte@empresa.com"
                  />
                </div>
              )}

              {formData.action_type === 'assign_to_user' && (
                <div className="mt-3">
                  <Label>Email do usuário</Label>
                  <Input
                    value={formData.action_config.assign_to_email || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      action_config: { ...prev.action_config, assign_to_email: e.target.value }
                    }))}
                    placeholder="usuario@empresa.com"
                  />
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">⏰ Agendamento</h3>
              <Select value={formData.schedule_type} onValueChange={(v) => setFormData(prev => ({ ...prev, schedule_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">⚡ Imediato (executar assim que o gatilho ocorrer)</SelectItem>
                  <SelectItem value="daily">📅 Diário (verificar todos os dias)</SelectItem>
                  <SelectItem value="weekly">📆 Semanal (verificar semanalmente)</SelectItem>
                  <SelectItem value="monthly">🗓️ Mensal (verificar mensalmente)</SelectItem>
                </SelectContent>
              </Select>

              {formData.schedule_type === 'daily' && (
                <div className="mt-3">
                  <Label>Horário de execução</Label>
                  <Input
                    type="time"
                    value={formData.schedule_config.time || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      schedule_config: { ...prev.schedule_config, time: e.target.value }
                    }))}
                  />
                </div>
              )}

              {formData.schedule_type === 'weekly' && (
                <div className="mt-3 space-y-3">
                  <div>
                    <Label>Dia da semana</Label>
                    <Select 
                      value={formData.schedule_config.day_of_week || ''} 
                      onValueChange={(v) => setFormData(prev => ({
                        ...prev,
                        schedule_config: { ...prev.schedule_config, day_of_week: v }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o dia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monday">Segunda-feira</SelectItem>
                        <SelectItem value="tuesday">Terça-feira</SelectItem>
                        <SelectItem value="wednesday">Quarta-feira</SelectItem>
                        <SelectItem value="thursday">Quinta-feira</SelectItem>
                        <SelectItem value="friday">Sexta-feira</SelectItem>
                        <SelectItem value="saturday">Sábado</SelectItem>
                        <SelectItem value="sunday">Domingo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Horário</Label>
                    <Input
                      type="time"
                      value={formData.schedule_config.time || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        schedule_config: { ...prev.schedule_config, time: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              )}

              {formData.schedule_type === 'monthly' && (
                <div className="mt-3 space-y-3">
                  <div>
                    <Label>Dia do mês</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.schedule_config.day_of_month || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        schedule_config: { ...prev.schedule_config, day_of_month: parseInt(e.target.value) }
                      }))}
                      placeholder="1-31"
                    />
                  </div>
                  <div>
                    <Label>Horário</Label>
                    <Input
                      type="time"
                      value={formData.schedule_config.time || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        schedule_config: { ...prev.schedule_config, time: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={createAutomation.isPending || updateAutomation.isPending}>
                {editingAutomation ? 'Salvar' : 'Criar Automação'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}