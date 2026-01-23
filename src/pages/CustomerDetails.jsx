import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, User, FileText, Building2, MessageSquare, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import moment from 'moment';

export default function CustomerDetails() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const customerEmail = urlParams.get('email');

  const [newComment, setNewComment] = useState('');

  // Fetch customer data
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list()
  });

  const customer = customers.find(c => c.email === customerEmail);

  // Fetch related data
  const { data: units = [] } = useQuery({
    queryKey: ['consumer-units'],
    queryFn: () => base44.entities.ConsumerUnit.list()
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list()
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['customer-notes'],
    queryFn: () => base44.entities.CustomerNote.list()
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: () => base44.entities.SupportTicket.list()
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list()
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (data) => base44.entities.CustomerNote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-notes'] });
      setNewComment('');
    }
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate({
      customer_email: customerEmail,
      note: newComment,
      note_type: 'comment'
    });
  };

  if (!customer) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Cliente não encontrado</h2>
            <Link to={createPageUrl('CustomerManagement')}>
              <Button>Voltar para Clientes</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const customerUnits = units.filter(u => u.customer_email === customerEmail);
  const customerInvoices = invoices.filter(i => i.customer_email === customerEmail);
  const customerNotes = notes.filter(n => n.customer_email === customerEmail).sort((a, b) => 
    new Date(b.created_date) - new Date(a.created_date)
  );
  const customerTickets = tickets.filter(t => t.customer_email === customerEmail);
  const customerDocuments = documents.filter(d => d.related_customer_email === customerEmail);

  const activities = [
    ...customerNotes.map(n => ({ ...n, type: 'note', date: n.created_date })),
    ...customerTickets.map(t => ({ ...t, type: 'ticket', date: t.created_date })),
    ...customerInvoices.map(i => ({ ...i, type: 'invoice', date: i.created_date }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-red-100 text-red-800',
    suspended: 'bg-yellow-100 text-yellow-800'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to={createPageUrl('CustomerManagement')}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{customer.name}</h1>
            <p className="text-sm text-slate-500">Detalhes do Cliente</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Coluna 1: Informações do Cliente */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Status</span>
                  <Badge className={statusColors[customer.status] || 'bg-slate-100 text-slate-800'}>
                    {customer.status === 'active' ? 'Ativo' : customer.status === 'inactive' ? 'Inativo' : 'Suspenso'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Tipo</span>
                  <span className="text-sm font-medium">
                    {customer.customer_type === 'residential' ? 'Residencial' : 'Comercial'}
                  </span>
                </div>
                {customer.cpf_cnpj && (
                  <div className="space-y-1">
                    <span className="text-sm text-slate-500">CPF/CNPJ</span>
                    <p className="text-sm font-medium">{customer.cpf_cnpj}</p>
                  </div>
                )}
                {customer.customer_number && (
                  <div className="space-y-1">
                    <span className="text-sm text-slate-500">Nº Cliente</span>
                    <p className="text-sm font-medium">{customer.customer_number}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-sm font-medium">{customer.email}</p>
                  </div>
                </div>
                {customer.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Telefone</p>
                      <p className="text-sm font-medium">{customer.phone}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Endereço</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div className="text-sm">
                    {customer.address && <p>{customer.address}</p>}
                    {(customer.city || customer.state) && (
                      <p className="text-slate-600">
                        {customer.city}{customer.city && customer.state ? ', ' : ''}{customer.state}
                      </p>
                    )}
                    {customer.zip_code && <p className="text-slate-600">CEP: {customer.zip_code}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {customer.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">{customer.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Coluna 2: Atividades e Comentários */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Adicionar Comentário</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Digite um comentário..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleAddComment} disabled={!newComment.trim()} className="w-full">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Adicionar Comentário
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Atividades Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activities.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">Nenhuma atividade registrada</p>
                  ) : (
                    activities.map((activity, idx) => (
                      <div key={idx} className="border-l-2 border-slate-200 pl-4 pb-3">
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-xs font-medium text-slate-900">
                            {activity.type === 'note' ? '💬 Comentário' : 
                             activity.type === 'ticket' ? '🎫 Ticket' : '📄 Fatura'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {moment(activity.date).format('DD/MM/YYYY HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">
                          {activity.type === 'note' ? activity.note :
                           activity.type === 'ticket' ? activity.subject :
                           `Fatura #${activity.invoice_number || 'N/A'}`}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna 3: Unidades e Faturas */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Unidades Consumidoras ({customerUnits.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {customerUnits.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">Nenhuma unidade cadastrada</p>
                  ) : (
                    customerUnits.map((unit) => (
                      <div key={unit.id} className="p-3 bg-slate-50 rounded-lg">
                        <p className="font-medium text-sm">{unit.unit_name || 'Sem nome'}</p>
                        {unit.unit_number && (
                          <p className="text-xs text-slate-500">UC: {unit.unit_number}</p>
                        )}
                        {unit.power_plant_name && (
                          <p className="text-xs text-slate-600 mt-1">🏭 {unit.power_plant_name}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Faturas Recentes ({customerInvoices.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {customerInvoices.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">Nenhuma fatura encontrada</p>
                  ) : (
                    customerInvoices.slice(0, 10).map((invoice) => (
                      <div key={invoice.id} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">#{invoice.invoice_number || 'N/A'}</p>
                            <p className="text-xs text-slate-500">
                              {invoice.reference_month || 'N/A'}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-green-600">
                            R$ {invoice.total_amount?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Documentos ({customerDocuments.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {customerDocuments.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">Nenhum documento anexado</p>
                  ) : (
                    customerDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="text-sm flex-1 truncate">{doc.title || 'Documento'}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}