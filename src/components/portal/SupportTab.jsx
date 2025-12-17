import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SupportTab({ userEmail }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'general',
    priority: 'normal',
    description: ''
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ['my-tickets', userEmail],
    queryFn: () => base44.entities.SupportTicket.filter({ customer_email: userEmail }),
    enabled: !!userEmail
  });

  const createTicketMutation = useMutation({
    mutationFn: (data) => base44.entities.SupportTicket.create({
      ...data,
      customer_email: userEmail,
      status: 'open'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-tickets']);
      setShowForm(false);
      setFormData({ title: '', category: 'general', priority: 'normal', description: '' });
      toast.success('Chamado criado com sucesso!');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createTicketMutation.mutate(formData);
  };

  const statusColors = {
    open: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-slate-100 text-slate-800'
  };

  const statusIcons = {
    open: AlertCircle,
    in_progress: Clock,
    resolved: CheckCircle,
    closed: CheckCircle
  };

  const priorityColors = {
    low: 'bg-slate-100 text-slate-800',
    normal: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  return (
    <div className="grid gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Central de Suporte</h3>
          <p className="text-sm text-slate-600">Abra chamados e acompanhe suas solicitações</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Chamado
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Abrir Novo Chamado</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Assunto *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Descreva brevemente o problema"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Categoria</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Geral</SelectItem>
                      <SelectItem value="billing">Faturamento</SelectItem>
                      <SelectItem value="technical">Técnico</SelectItem>
                      <SelectItem value="energy">Créditos de Energia</SelectItem>
                      <SelectItem value="contract">Contrato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Prioridade</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Descrição *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o problema em detalhes..."
                  rows={5}
                  required
                />
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={createTicketMutation.isPending}>
                  {createTicketMutation.isPending ? 'Criando...' : 'Criar Chamado'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Meus Chamados ({tickets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tickets.map((ticket) => {
              const StatusIcon = statusIcons[ticket.status];
              
              return (
                <div key={ticket.id} className="p-4 border rounded-lg hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3">
                      <StatusIcon className="w-5 h-5 text-slate-500 mt-1" />
                      <div>
                        <p className="font-semibold">{ticket.title}</p>
                        <p className="text-sm text-slate-600 mt-1">{ticket.description}</p>
                        <p className="text-xs text-slate-400 mt-2">
                          Criado em {format(new Date(ticket.created_date), "dd/MM/yyyy 'às' HH:mm")}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <Badge className={statusColors[ticket.status]}>
                        {ticket.status === 'open' ? 'Aberto' :
                         ticket.status === 'in_progress' ? 'Em Andamento' :
                         ticket.status === 'resolved' ? 'Resolvido' : 'Fechado'}
                      </Badge>
                      <Badge className={priorityColors[ticket.priority]}>
                        {ticket.priority === 'low' ? 'Baixa' :
                         ticket.priority === 'normal' ? 'Normal' :
                         ticket.priority === 'high' ? 'Alta' : 'Urgente'}
                      </Badge>
                    </div>
                  </div>

                  {ticket.assigned_to && (
                    <p className="text-xs text-slate-500 mt-2">
                      Atribuído a: {ticket.assigned_to}
                    </p>
                  )}

                  {ticket.resolution && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm font-medium text-green-900 mb-1">Resolução:</p>
                      <p className="text-sm text-green-800">{ticket.resolution}</p>
                    </div>
                  )}
                </div>
              );
            })}

            {tickets.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-4">Nenhum chamado aberto</p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Abrir Primeiro Chamado
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}