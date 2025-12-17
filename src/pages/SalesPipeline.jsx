import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Plus, ArrowLeft, TrendingUp, DollarSign, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SalesPipeline() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    source: 'website',
    average_bill: '',
    city: '',
    state: '',
    notes: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [sortBy, setSortBy] = useState('created_date');

  const { data: allLeads = [] } = useQuery({
    queryKey: ['sales-leads'],
    queryFn: () => base44.entities.SalesLead.list('-created_date', 500)
  });

  // Filtros e busca
  const leads = allLeads
    .filter(lead => {
      const matchesSearch = !searchTerm || 
        lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone?.includes(searchTerm);
      const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
      const matchesSource = filterSource === 'all' || lead.source === filterSource;
      return matchesSearch && matchesStatus && matchesSource;
    })
    .sort((a, b) => {
      if (sortBy === 'ai_score') return (b.ai_score || 0) - (a.ai_score || 0);
      if (sortBy === 'next_follow_up') {
        if (!a.next_follow_up) return 1;
        if (!b.next_follow_up) return -1;
        return new Date(a.next_follow_up) - new Date(b.next_follow_up);
      }
      return new Date(b.created_date) - new Date(a.created_date);
    });

  const createLead = useMutation({
    mutationFn: (data) => base44.entities.SalesLead.create({
      ...data,
      status: 'new',
      stage: 'awareness',
      score: 50,
      estimated_value: data.average_bill ? data.average_bill * 0.15 : 0
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['sales-leads']);
      setIsDialogOpen(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        source: 'website',
        average_bill: '',
        city: '',
        state: '',
        notes: ''
      });
    }
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.SalesLead.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries(['sales-leads'])
  });

  const stages = [
    { status: 'new', label: 'Novos', color: 'bg-blue-100' },
    { status: 'contacted', label: 'Contatados', color: 'bg-purple-100' },
    { status: 'qualified', label: 'Qualificados', color: 'bg-yellow-100' },
    { status: 'proposal_sent', label: 'Proposta Enviada', color: 'bg-orange-100' },
    { status: 'negotiating', label: 'Negociando', color: 'bg-pink-100' },
    { status: 'won', label: 'Ganhos', color: 'bg-green-100' },
    { status: 'lost', label: 'Perdidos', color: 'bg-slate-100' }
  ];

  const stats = {
    total: leads.length,
    won: leads.filter(l => l.status === 'won').length,
    lost: leads.filter(l => l.status === 'lost').length,
    conversionRate: leads.length > 0 ? ((leads.filter(l => l.status === 'won').length / leads.length) * 100).toFixed(1) : 0,
    totalValue: leads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.estimated_value || 0), 0)
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">Pipeline de Vendas</h1>
                  <p className="text-sm text-white/80">Funil comercial completo</p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-white/30 text-white hover:bg-white/20"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Lead
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filtros e busca */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por nome, email ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="new">Novos</SelectItem>
                  <SelectItem value="contacted">Contatados</SelectItem>
                  <SelectItem value="qualified">Qualificados</SelectItem>
                  <SelectItem value="proposal_sent">Proposta enviada</SelectItem>
                  <SelectItem value="negotiating">Negociando</SelectItem>
                  <SelectItem value="won">Ganhos</SelectItem>
                  <SelectItem value="lost">Perdidos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas origens</SelectItem>
                  <SelectItem value="website">Site</SelectItem>
                  <SelectItem value="referral">Indicação</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="social_media">Redes Sociais</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                  <SelectItem value="event">Evento</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_date">Data de criação</SelectItem>
                  <SelectItem value="ai_score">Score IA (maior)</SelectItem>
                  <SelectItem value="next_follow_up">Próximo follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 mt-3 text-sm text-slate-600">
              <span className="font-medium">{leads.length}</span> leads {searchTerm || filterStatus !== 'all' || filterSource !== 'all' ? 'encontrados' : 'no total'}
              {(searchTerm || filterStatus !== 'all' || filterSource !== 'all') && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                    setFilterSource('all');
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Leads</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Convertidos</p>
                  <p className="text-2xl font-bold text-green-600">{stats.won}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Valor Ganho</p>
                  <p className="text-2xl font-bold">R$ {stats.totalValue.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Taxa Conversão</p>
                  <p className="text-2xl font-bold">{stats.conversionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline */}
        <div className="grid lg:grid-cols-7 gap-4">
          {stages.map((stage) => {
            const stageLeads = leads.filter(l => l.status === stage.status);
            
            return (
              <Card key={stage.status} className={stage.color}>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {stage.label}
                    <Badge className="ml-2" variant="secondary">{stageLeads.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stageLeads.map((lead) => (
                    <Card key={lead.id} className="p-3 bg-white">
                      <p className="font-medium text-sm">{lead.name}</p>
                      <p className="text-xs text-slate-500">{lead.email}</p>
                      {lead.estimated_value > 0 && (
                        <p className="text-xs font-semibold text-green-600 mt-1">
                          R$ {lead.estimated_value.toFixed(0)}
                        </p>
                      )}
                      <Select
                        value={lead.status}
                        onValueChange={(value) => updateStatus.mutate({ id: lead.id, status: value })}
                      >
                        <SelectTrigger className="mt-2 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map(s => (
                            <SelectItem key={s.status} value={s.status}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createLead.mutate(formData); }} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Telefone *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Empresa</Label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                />
              </div>
              <div>
                <Label>Origem</Label>
                <Select value={formData.source} onValueChange={(v) => setFormData(prev => ({ ...prev, source: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Indicação</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="social_media">Redes Sociais</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="event">Evento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Conta Média (R$)</Label>
                <Input
                  type="number"
                  value={formData.average_bill}
                  onChange={(e) => setFormData(prev => ({ ...prev, average_bill: e.target.value }))}
                />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div>
                <Label>Estado</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={createLead.isPending}>
                Criar Lead
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}