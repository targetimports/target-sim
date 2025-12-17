import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Plus, ArrowLeft, Settings, Trash2, Edit, PlayCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function TaskAutomationRules() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    trigger_type: 'lead_created',
    trigger_conditions: {},
    task_template: {
      title: '',
      description: '',
      task_type: 'follow_up',
      priority: 'medium'
    },
    assignment_rule: 'specific_user',
    assigned_to: '',
    assignment_pool: [],
    due_date_rule: 'days_from_now',
    due_date_value: 3,
    send_notification: true,
    notification_template: {
      title: 'Nova tarefa atribuída',
      message: 'Você tem uma nova tarefa: {{title}}'
    }
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['task-automation-rules'],
    queryFn: () => base44.entities.TaskAutomationRule.list('-created_date')
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const createRule = useMutation({
    mutationFn: (data) => base44.entities.TaskAutomationRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['task-automation-rules']);
      setIsDialogOpen(false);
      setEditingRule(null);
      resetForm();
      toast.success('Regra criada com sucesso!');
    }
  });

  const updateRule = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TaskAutomationRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['task-automation-rules']);
      setIsDialogOpen(false);
      setEditingRule(null);
      resetForm();
      toast.success('Regra atualizada!');
    }
  });

  const deleteRule = useMutation({
    mutationFn: (id) => base44.entities.TaskAutomationRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['task-automation-rules']);
      toast.success('Regra excluída!');
    }
  });

  const toggleRule = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.TaskAutomationRule.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries(['task-automation-rules'])
  });

  const testRule = useMutation({
    mutationFn: async (rule) => {
      return await base44.functions.invoke('taskAutomation', {
        trigger_type: rule.trigger_type,
        entity_id: 'test-123',
        entity_data: {
          name: 'Teste',
          status: 'new',
          email: 'teste@exemplo.com'
        }
      });
    },
    onSuccess: (data) => {
      toast.success(`Teste concluído! ${data.data.tasks_created} tarefa(s) criada(s)`);
      queryClient.invalidateQueries(['task-automation-rules']);
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      is_active: true,
      trigger_type: 'lead_created',
      trigger_conditions: {},
      task_template: {
        title: '',
        description: '',
        task_type: 'follow_up',
        priority: 'medium'
      },
      assignment_rule: 'specific_user',
      assigned_to: '',
      assignment_pool: [],
      due_date_rule: 'days_from_now',
      due_date_value: 3,
      send_notification: true,
      notification_template: {
        title: 'Nova tarefa atribuída',
        message: 'Você tem uma nova tarefa: {{title}}'
      }
    });
  };

  const openEdit = (rule) => {
    setEditingRule(rule);
    setFormData(rule);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingRule) {
      updateRule.mutate({ id: editingRule.id, data: formData });
    } else {
      createRule.mutate(formData);
    }
  };

  const triggerLabels = {
    lead_created: 'Lead criado',
    lead_status_changed: 'Status do lead alterado',
    subscription_created: 'Assinatura criada',
    subscription_status_changed: 'Status da assinatura alterado',
    ticket_created: 'Ticket criado',
    invoice_overdue: 'Fatura vencida',
    automation_executed: 'Automação executada'
  };

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
                  <h1 className="text-2xl font-bold">Automação de Tarefas</h1>
                  <p className="text-sm text-white/80">Regras e gatilhos automáticos</p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => { resetForm(); setIsDialogOpen(true); }}
              className="bg-white text-purple-600 hover:bg-white/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Regra
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold">{rule.name}</h3>
                      <Badge variant={rule.is_active ? "default" : "secondary"}>
                        {rule.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                      <Badge variant="outline">{triggerLabels[rule.trigger_type]}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{rule.description}</p>
                    
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Tarefa:</span> {rule.task_template?.title}
                      </div>
                      <div>
                        <span className="font-medium">Atribuição:</span> {
                          rule.assignment_rule === 'specific_user' ? rule.assigned_to :
                          rule.assignment_rule === 'round_robin' ? 'Rodízio' :
                          rule.assignment_rule === 'least_tasks' ? 'Menos tarefas' : 'Por campo'
                        }
                      </div>
                      <div>
                        <span className="font-medium">Prazo:</span> {
                          rule.due_date_rule === 'days_from_now' ? `${rule.due_date_value} dias` :
                          rule.due_date_rule === 'hours_from_now' ? `${rule.due_date_value} horas` :
                          'Imediato'
                        }
                      </div>
                    </div>

                    {rule.execution_count > 0 && (
                      <div className="mt-3 text-xs text-slate-500">
                        Executada {rule.execution_count}x • Última: {new Date(rule.last_execution).toLocaleString('pt-BR')}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => toggleRule.mutate({ id: rule.id, is_active: checked })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => testRule.mutate(rule)}
                      title="Testar regra"
                    >
                      <PlayCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(rule)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRule.mutate(rule.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {rules.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Settings className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Nenhuma regra configurada</h3>
                <p className="text-slate-600 mb-6">Crie regras para automatizar a criação de tarefas</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar primeira regra
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Editar Regra' : 'Nova Regra de Automação'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Nome da Regra *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-bold mb-3">🎯 Gatilho</h3>
              <div>
                <Label>Tipo de Gatilho *</Label>
                <Select 
                  value={formData.trigger_type} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, trigger_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(triggerLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-bold mb-3">📋 Template da Tarefa</h3>
              <div className="space-y-3">
                <div>
                  <Label>Título da Tarefa *</Label>
                  <Input
                    value={formData.task_template.title}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      task_template: { ...prev.task_template, title: e.target.value }
                    }))}
                    placeholder="Ex: Follow-up com {{name}}"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Use {`{{campo}}`} para variáveis dinâmicas</p>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.task_template.description}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      task_template: { ...prev.task_template, description: e.target.value }
                    }))}
                    rows={2}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo</Label>
                    <Select 
                      value={formData.task_template.task_type}
                      onValueChange={(v) => setFormData(prev => ({
                        ...prev,
                        task_template: { ...prev.task_template, task_type: v }
                      }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="follow_up">Follow-up</SelectItem>
                        <SelectItem value="call">Ligação</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="meeting">Reunião</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Prioridade</Label>
                    <Select 
                      value={formData.task_template.priority}
                      onValueChange={(v) => setFormData(prev => ({
                        ...prev,
                        task_template: { ...prev.task_template, priority: v }
                      }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-bold mb-3">👤 Atribuição</h3>
              <div className="space-y-3">
                <div>
                  <Label>Regra de Atribuição</Label>
                  <Select 
                    value={formData.assignment_rule}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, assignment_rule: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="specific_user">Usuário específico</SelectItem>
                      <SelectItem value="round_robin">Rodízio (Round Robin)</SelectItem>
                      <SelectItem value="least_tasks">Usuário com menos tarefas</SelectItem>
                      <SelectItem value="based_on_field">Baseado em campo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.assignment_rule === 'specific_user' && (
                  <div>
                    <Label>Usuário</Label>
                    <Select 
                      value={formData.assigned_to}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, assigned_to: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {users.map(u => (
                          <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-bold mb-3">⏰ Prazo</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Regra de Prazo</Label>
                  <Select 
                    value={formData.due_date_rule}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, due_date_rule: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Imediato</SelectItem>
                      <SelectItem value="hours_from_now">Horas a partir de agora</SelectItem>
                      <SelectItem value="days_from_now">Dias a partir de agora</SelectItem>
                      <SelectItem value="based_on_field">Baseado em campo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(formData.due_date_rule === 'hours_from_now' || formData.due_date_rule === 'days_from_now') && (
                  <div>
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      value={formData.due_date_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, due_date_value: parseInt(e.target.value) }))}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">🔔 Notificação</h3>
                <Switch
                  checked={formData.send_notification}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, send_notification: checked }))}
                />
              </div>
              {formData.send_notification && (
                <div className="space-y-3">
                  <div>
                    <Label>Título</Label>
                    <Input
                      value={formData.notification_template?.title}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        notification_template: { ...prev.notification_template, title: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Mensagem</Label>
                    <Textarea
                      value={formData.notification_template?.message}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        notification_template: { ...prev.notification_template, message: e.target.value }
                      }))}
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                {editingRule ? 'Atualizar' : 'Criar'} Regra
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}