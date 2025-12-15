import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageSquare, Plus, Search, Clock, CheckCircle, 
  AlertCircle, Mail, Phone, MessageCircle, Star,
  FileText, Zap, DollarSign, Settings
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SupportCenter() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    category: 'general',
    priority: 'medium',
    subject: '',
    description: ''
  });

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: tickets = [] } = useQuery({
    queryKey: ['support-tickets', user?.email],
    queryFn: () => base44.entities.SupportTicket.filter({ customer_email: user?.email }),
    enabled: !!user?.email
  });

  const createTicket = useMutation({
    mutationFn: (data) => base44.entities.SupportTicket.create({
      ...data,
      customer_email: user.email,
      customer_name: user.full_name,
      status: 'open'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['support-tickets']);
      setShowNewTicket(false);
      setFormData({
        category: 'general',
        priority: 'medium',
        subject: '',
        description: ''
      });
    }
  });

  const filteredTickets = tickets.filter(ticket =>
    ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

  const statusColors = {
    open: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    waiting_customer: 'bg-purple-100 text-purple-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-slate-100 text-slate-800'
  };

  const statusLabels = {
    open: 'Aberto',
    in_progress: 'Em Andamento',
    waiting_customer: 'Aguardando Cliente',
    resolved: 'Resolvido',
    closed: 'Fechado'
  };

  const categoryIcons = {
    billing: DollarSign,
    technical: Zap,
    plan_change: Settings,
    consumption: FileText,
    general: MessageSquare
  };

  const categoryLabels = {
    billing: 'Faturamento',
    technical: 'Técnico',
    plan_change: 'Mudança de Plano',
    consumption: 'Consumo',
    general: 'Geral'
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createTicket.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Central de Suporte</h1>
              <p className="text-amber-400 text-sm">Estamos aqui para ajudar você</p>
            </div>
            <Button 
              onClick={() => setShowNewTicket(!showNewTicket)}
              className="bg-amber-500 hover:bg-amber-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Ticket
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
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Tickets Abertos</p>
                  <p className="text-3xl font-bold text-slate-900">{openTickets}</p>
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
                  <p className="text-sm text-slate-500">Resolvidos</p>
                  <p className="text-3xl font-bold text-slate-900">{resolvedTickets}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total de Tickets</p>
                  <p className="text-3xl font-bold text-slate-900">{tickets.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Options */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-900 to-amber-900 text-white">
            <CardContent className="p-6">
              <Phone className="w-8 h-8 mb-3" />
              <h3 className="font-semibold mb-2">Telefone</h3>
              <p className="text-sm text-amber-100 mb-3">Seg a Sex, 8h às 18h</p>
              <p className="font-bold text-lg">0800 123 4567</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-yellow-600">
            <CardContent className="p-6">
              <MessageCircle className="w-8 h-8 mb-3 text-white" />
              <h3 className="font-semibold mb-2 text-white">WhatsApp</h3>
              <p className="text-sm text-white/80 mb-3">Atendimento rápido</p>
              <p className="font-bold text-lg text-white">(11) 99999-9999</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-700 to-slate-900 text-white">
            <CardContent className="p-6">
              <Mail className="w-8 h-8 mb-3" />
              <h3 className="font-semibold mb-2">E-mail</h3>
              <p className="text-sm text-slate-300 mb-3">Resposta em até 24h</p>
              <p className="font-bold text-sm">suporte@energia.com</p>
            </CardContent>
          </Card>
        </div>

        {/* New Ticket Form */}
        {showNewTicket && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-0 shadow-sm mb-8">
              <CardHeader>
                <CardTitle>Novo Ticket de Suporte</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Categoria *</Label>
                      <Select 
                        value={formData.category} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="billing">Faturamento</SelectItem>
                          <SelectItem value="technical">Técnico</SelectItem>
                          <SelectItem value="plan_change">Mudança de Plano</SelectItem>
                          <SelectItem value="consumption">Consumo</SelectItem>
                          <SelectItem value="general">Geral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Prioridade *</Label>
                      <Select 
                        value={formData.priority} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="urgent">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Assunto *</Label>
                    <Input
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Descreva brevemente o problema"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição *</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descreva em detalhes o que você precisa"
                      rows={4}
                      required
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setShowNewTicket(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-amber-500 hover:bg-amber-600">
                      Enviar Ticket
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Buscar tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tickets List */}
        <div className="space-y-4">
          {filteredTickets.map((ticket) => {
            const CategoryIcon = categoryIcons[ticket.category];
            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <CategoryIcon className="w-6 h-6 text-slate-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-2">
                            <h3 className="font-semibold text-slate-900 flex-1">{ticket.subject}</h3>
                            <Badge className={statusColors[ticket.status]}>
                              {statusLabels[ticket.status]}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-3">{ticket.description}</p>
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {format(new Date(ticket.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                            <Badge variant="outline">{categoryLabels[ticket.category]}</Badge>
                            {ticket.satisfaction_rating && (
                              <span className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                {ticket.satisfaction_rating}/5
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {filteredTickets.length === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum ticket encontrado</h3>
                <p className="text-slate-500 mb-6">Crie um novo ticket para entrar em contato com o suporte</p>
                <Button onClick={() => setShowNewTicket(true)} className="bg-amber-500 hover:bg-amber-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Ticket
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}