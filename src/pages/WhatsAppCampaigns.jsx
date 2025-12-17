import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, Plus, Send, Users, CheckCircle, XCircle, 
  Clock, ArrowLeft, Pencil, Trash2, Play
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function WhatsAppCampaigns() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('campaigns');
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingCampaign, setEditingCampaign] = useState(null);

  const [templateForm, setTemplateForm] = useState({
    name: '',
    message: '',
    category: 'marketing'
  });

  const [campaignForm, setCampaignForm] = useState({
    name: '',
    template_id: '',
    message: '',
    target_segment: 'all',
    scheduled_date: ''
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['message-templates'],
    queryFn: () => base44.entities.MessageTemplate.list('-created_date', 100)
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['whatsapp-campaigns'],
    queryFn: () => base44.entities.WhatsAppCampaign.list('-created_date', 100)
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions-count'],
    queryFn: () => base44.entities.Subscription.list('-created_date', 1000)
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['sales-leads'],
    queryFn: () => base44.entities.SalesLead.list('-created_date', 1000)
  });

  const createTemplate = useMutation({
    mutationFn: (data) => base44.entities.MessageTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['message-templates']);
      setIsTemplateDialogOpen(false);
      resetTemplateForm();
      toast.success('Template criado com sucesso');
    }
  });

  const updateTemplate = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MessageTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['message-templates']);
      setIsTemplateDialogOpen(false);
      resetTemplateForm();
      toast.success('Template atualizado');
    }
  });

  const deleteTemplate = useMutation({
    mutationFn: (id) => base44.entities.MessageTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['message-templates']);
      toast.success('Template excluído');
    }
  });

  const createCampaign = useMutation({
    mutationFn: (data) => base44.entities.WhatsAppCampaign.create({
      ...data,
      status: 'draft',
      total_recipients: getSegmentCount(data.target_segment)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['whatsapp-campaigns']);
      setIsCampaignDialogOpen(false);
      resetCampaignForm();
      toast.success('Campanha criada');
    }
  });

  const sendCampaign = useMutation({
    mutationFn: async (campaignId) => {
      const result = await base44.functions.invoke('whatsappBulkSend', { campaign_id: campaignId });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['whatsapp-campaigns']);
      toast.success('Campanha enviada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao enviar campanha: ' + error.message);
    }
  });

  const resetTemplateForm = () => {
    setTemplateForm({ name: '', message: '', category: 'marketing' });
    setEditingTemplate(null);
  };

  const resetCampaignForm = () => {
    setCampaignForm({ name: '', template_id: '', message: '', target_segment: 'all', scheduled_date: '' });
    setEditingCampaign(null);
  };

  const openEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      message: template.message,
      category: template.category
    });
    setIsTemplateDialogOpen(true);
  };

  const handleTemplateSubmit = (e) => {
    e.preventDefault();
    if (editingTemplate) {
      updateTemplate.mutate({ id: editingTemplate.id, data: templateForm });
    } else {
      createTemplate.mutate(templateForm);
    }
  };

  const handleCampaignSubmit = (e) => {
    e.preventDefault();
    createCampaign.mutate(campaignForm);
  };

  const useTemplate = (template) => {
    setCampaignForm(prev => ({ 
      ...prev, 
      template_id: template.id,
      message: template.message 
    }));
    setIsCampaignDialogOpen(true);
    setActiveTab('campaigns');
  };

  const getSegmentCount = (segment) => {
    const now = new Date();
    const daysAgo = (days) => new Date(now - days * 24 * 60 * 60 * 1000);
    
    switch (segment) {
      case 'all': return subscriptions.length;
      case 'active': return subscriptions.filter(s => s.status === 'active').length;
      case 'pending': return subscriptions.filter(s => s.status === 'pending' || s.status === 'analyzing').length;
      case 'residential': return subscriptions.filter(s => s.customer_type === 'residential').length;
      case 'commercial': return subscriptions.filter(s => s.customer_type === 'commercial').length;
      case 'suspended': return subscriptions.filter(s => s.status === 'suspended').length;
      case 'high_score_leads': return leads.filter(l => (l.ai_score || 0) >= 70 && new Date(l.last_interaction) < daysAgo(7)).length;
      case 'no_interaction_30d': return leads.filter(l => l.last_interaction && new Date(l.last_interaction) < daysAgo(30)).length;
      case 'qualified_leads': return leads.filter(l => l.status === 'qualified').length;
      case 'new_leads': return leads.filter(l => l.status === 'new').length;
      default: return 0;
    }
  };

  const statusColors = {
    draft: 'bg-slate-100 text-slate-800',
    scheduled: 'bg-blue-100 text-blue-800',
    sending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800'
  };

  const statusLabels = {
    draft: 'Rascunho',
    scheduled: 'Agendada',
    sending: 'Enviando',
    completed: 'Concluída',
    failed: 'Falhou'
  };

  const categoryColors = {
    marketing: 'bg-purple-100 text-purple-800',
    notification: 'bg-blue-100 text-blue-800',
    support: 'bg-green-100 text-green-800',
    billing: 'bg-amber-100 text-amber-800'
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
                <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Campanhas WhatsApp</h1>
                  <p className="text-xs text-slate-400">Envio em massa e templates</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-white border border-slate-200">
            <TabsTrigger value="campaigns">
              <Send className="w-4 h-4 mr-2" />
              Campanhas
            </TabsTrigger>
            <TabsTrigger value="templates">
              <MessageSquare className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Minhas campanhas</h2>
              <Button onClick={() => setIsCampaignDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Nova campanha
              </Button>
            </div>

            <div className="grid gap-6">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{campaign.name}</h3>
                        <p className="text-sm text-slate-500">
                          Criada em {format(new Date(campaign.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Badge className={statusColors[campaign.status]}>
                        {statusLabels[campaign.status]}
                      </Badge>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-4 mb-4">
                      <p className="text-sm text-slate-700">{campaign.message}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-slate-500">Segmento</p>
                        <p className="font-medium text-xs">{campaign.target_segment}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Destinatários</p>
                        <p className="font-medium">{campaign.total_recipients}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Enviadas</p>
                        <p className="font-medium text-green-600">{campaign.sent_count || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Lidas</p>
                        <p className="font-medium text-blue-600">{campaign.read_count || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Falhas</p>
                        <p className="font-medium text-red-600">{campaign.failed_count || 0}</p>
                      </div>
                    </div>

                    {campaign.sent_count > 0 && (
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1 bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all"
                            style={{ width: `${(campaign.sent_count / campaign.total_recipients) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-600">
                          {((campaign.sent_count / campaign.total_recipients) * 100).toFixed(1)}% enviadas
                        </span>
                      </div>
                    )}

                    {campaign.status === 'draft' && (
                      <Button 
                        onClick={() => sendCampaign.mutate(campaign.id)}
                        disabled={sendCampaign.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Enviar agora
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}

              {campaigns.length === 0 && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Send className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma campanha criada</h3>
                    <p className="text-slate-500 mb-6">Crie sua primeira campanha de WhatsApp</p>
                    <Button onClick={() => setIsCampaignDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova campanha
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Templates de mensagens</h2>
              <Button onClick={() => { resetTemplateForm(); setIsTemplateDialogOpen(true); }} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Novo template
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {templates.map((template) => (
                <Card key={template.id} className="border-0 shadow-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge className={categoryColors[template.category]}>
                          {template.category}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditTemplate(template)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteTemplate.mutate(template.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-slate-50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{template.message}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => useTemplate(template)}
                    >
                      Usar template
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {templates.length === 0 && (
                <Card className="border-0 shadow-sm md:col-span-2">
                  <CardContent className="p-12 text-center">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum template criado</h3>
                    <p className="text-slate-500 mb-6">Crie templates reutilizáveis para suas mensagens</p>
                    <Button onClick={() => setIsTemplateDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo template
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Template Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Editar template' : 'Novo template'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTemplateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do template *</Label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Boas-vindas"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={templateForm.category} onValueChange={(v) => setTemplateForm(prev => ({ ...prev, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="notification">Notificação</SelectItem>
                  <SelectItem value="support">Suporte</SelectItem>
                  <SelectItem value="billing">Cobrança</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mensagem *</Label>
              <Textarea
                value={templateForm.message}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Digite a mensagem..."
                className="min-h-32"
                required
              />
              <p className="text-xs text-slate-500">
                Variáveis disponíveis: {'{'}{'{'} nome {'}'}{'}'}, {'{'}{'{'} email {'}'}{'}'}, {'{'}{'{'} valor_conta {'}'}{'}'}, {'{'}{'{'} cidade {'}'}{'}'}, {'{'}{'{'} estado {'}'}{'}'}
              </p>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsTemplateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                {editingTemplate ? 'Salvar' : 'Criar template'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Campaign Dialog */}
      <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova campanha</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCampaignSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da campanha *</Label>
              <Input
                value={campaignForm.name}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Promoção Natal 2025"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Segmento de envio *</Label>
              <Select value={campaignForm.target_segment} onValueChange={(v) => setCampaignForm(prev => ({ ...prev, target_segment: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos clientes ({getSegmentCount('all')})</SelectItem>
                  <SelectItem value="active">Assinaturas ativas ({getSegmentCount('active')})</SelectItem>
                  <SelectItem value="pending">Pendentes ({getSegmentCount('pending')})</SelectItem>
                  <SelectItem value="residential">Pessoa Física ({getSegmentCount('residential')})</SelectItem>
                  <SelectItem value="commercial">Pessoa Jurídica ({getSegmentCount('commercial')})</SelectItem>
                  <SelectItem value="suspended">Suspensos ({getSegmentCount('suspended')})</SelectItem>
                  <SelectItem value="high_score_leads">🎯 Leads alto score sem interação 7d ({getSegmentCount('high_score_leads')})</SelectItem>
                  <SelectItem value="no_interaction_30d">⏰ Leads sem interação 30d ({getSegmentCount('no_interaction_30d')})</SelectItem>
                  <SelectItem value="qualified_leads">✅ Leads qualificados ({getSegmentCount('qualified_leads')})</SelectItem>
                  <SelectItem value="new_leads">🆕 Novos leads ({getSegmentCount('new_leads')})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mensagem *</Label>
              <Textarea
                value={campaignForm.message}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Digite a mensagem..."
                className="min-h-32"
                required
              />
              <p className="text-xs text-slate-500">
                Variáveis disponíveis: {'{'}{'{'} nome {'}'}{'}'}, {'{'}{'{'} email {'}'}{'}'}, {'{'}{'{'} valor_conta {'}'}{'}'}, {'{'}{'{'} cidade {'}'}{'}'}, {'{'}{'{'} estado {'}'}{'}'}
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <Users className="w-4 h-4 inline mr-2" />
                Esta campanha será enviada para <strong>{getSegmentCount(campaignForm.target_segment)}</strong> destinatários
              </p>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsCampaignDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                Criar campanha
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}