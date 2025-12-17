import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User, Mail, Phone, MapPin, CreditCard, FileText, 
  MessageSquare, Calendar, AlertCircle, TrendingUp, Plus
} from 'lucide-react';
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

export default function CustomerDetails({ subscription, onClose }) {
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [isImportant, setIsImportant] = useState(false);

  // Buscar dados relacionados
  const { data: invoices = [] } = useQuery({
    queryKey: ['customer-invoices', subscription.customer_email],
    queryFn: () => base44.entities.MonthlyInvoice.filter({ 
      customer_email: subscription.customer_email 
    })
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['customer-notes', subscription.customer_email],
    queryFn: () => base44.entities.CustomerNote.filter({ 
      customer_email: subscription.customer_email 
    })
  });

  const { data: creditBalance = [] } = useQuery({
    queryKey: ['customer-credits', subscription.customer_email],
    queryFn: () => base44.entities.CreditBalance.filter({ 
      customer_email: subscription.customer_email 
    })
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ['customer-tickets', subscription.customer_email],
    queryFn: () => base44.entities.SupportTicket.filter({ 
      customer_email: subscription.customer_email 
    })
  });

  // Mutation para criar nota
  const createNoteMutation = useMutation({
    mutationFn: (noteData) => base44.entities.CustomerNote.create(noteData),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer-notes']);
      setNewNote('');
      setNoteType('general');
      setIsImportant(false);
      toast.success('Nota adicionada com sucesso!');
    }
  });

  const handleAddNote = () => {
    if (!newNote.trim()) {
      toast.error('Digite uma nota');
      return;
    }

    createNoteMutation.mutate({
      customer_email: subscription.customer_email,
      subscription_id: subscription.id,
      note: newNote,
      note_type: noteType,
      is_important: isImportant
    });
  };

  const noteTypeColors = {
    general: 'bg-slate-100 text-slate-800',
    billing: 'bg-green-100 text-green-800',
    technical: 'bg-blue-100 text-blue-800',
    support: 'bg-purple-100 text-purple-800',
    commercial: 'bg-amber-100 text-amber-800'
  };

  const noteTypeLabels = {
    general: 'Geral',
    billing: 'Financeiro',
    technical: 'Técnico',
    support: 'Suporte',
    commercial: 'Comercial'
  };

  const totalCredits = creditBalance.reduce((sum, c) => sum + (c.balance_kwh || 0), 0);
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.final_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Customer Info */}
      <Card>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-500">Nome</p>
                  <p className="font-semibold">{subscription.customer_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="font-semibold">{subscription.customer_email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-500">Telefone</p>
                  <p className="font-semibold">{subscription.customer_phone}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-500">Endereço</p>
                  <p className="font-semibold">{subscription.address}</p>
                  <p className="text-sm text-slate-600">{subscription.city}/{subscription.state}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-500">CPF/CNPJ</p>
                  <p className="font-semibold">{subscription.customer_cpf_cnpj}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-500">Cliente desde</p>
                  <p className="font-semibold">
                    {format(new Date(subscription.created_date), 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{totalCredits.toFixed(0)}</p>
              <p className="text-sm text-slate-500">kWh Créditos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">R$ {totalInvoiced.toFixed(2)}</p>
              <p className="text-sm text-slate-500">Total Faturado</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{tickets.length}</p>
              <p className="text-sm text-slate-500">Chamados</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="notes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="notes">
            <MessageSquare className="w-4 h-4 mr-2" />
            Notas ({notes.length})
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <FileText className="w-4 h-4 mr-2" />
            Faturas ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="tickets">
            <AlertCircle className="w-4 h-4 mr-2" />
            Chamados ({tickets.length})
          </TabsTrigger>
        </TabsList>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Adicionar Nota</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Select value={noteType} onValueChange={setNoteType}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Geral</SelectItem>
                    <SelectItem value="billing">Financeiro</SelectItem>
                    <SelectItem value="technical">Técnico</SelectItem>
                    <SelectItem value="support">Suporte</SelectItem>
                    <SelectItem value="commercial">Comercial</SelectItem>
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isImportant}
                    onChange={(e) => setIsImportant(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Importante</span>
                </label>
              </div>
              <Textarea
                placeholder="Digite sua nota aqui..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
              />
              <Button 
                onClick={handleAddNote}
                disabled={createNoteMutation.isPending}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                {createNoteMutation.isPending ? 'Salvando...' : 'Adicionar Nota'}
              </Button>
            </CardContent>
          </Card>

          {/* Notes List */}
          <div className="space-y-3">
            {notes.map((note) => (
              <Card key={note.id} className={note.is_important ? 'border-amber-300 bg-amber-50' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex gap-2">
                      <Badge className={noteTypeColors[note.note_type]}>
                        {noteTypeLabels[note.note_type]}
                      </Badge>
                      {note.is_important && (
                        <Badge className="bg-amber-500 text-white">
                          ⭐ Importante
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      {format(new Date(note.created_date), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.note}</p>
                  <p className="text-xs text-slate-500 mt-2">Por: {note.created_by}</p>
                </CardContent>
              </Card>
            ))}
            {notes.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhuma nota registrada</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-3">
          {invoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{invoice.month_reference}</p>
                    <p className="text-sm text-slate-500">
                      {invoice.energy_allocated_kwh} kWh • {invoice.discount_percentage}% desconto
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      R$ {invoice.final_amount?.toFixed(2)}
                    </p>
                    <Badge className={
                      invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                      invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }>
                      {invoice.status === 'paid' ? 'Pago' :
                       invoice.status === 'overdue' ? 'Vencido' : 'Pendente'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {invoices.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nenhuma fatura registrada</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tickets Tab */}
        <TabsContent value="tickets" className="space-y-3">
          {tickets.map((ticket) => (
            <Card key={ticket.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">{ticket.subject}</p>
                    <p className="text-sm text-slate-500">{ticket.category}</p>
                  </div>
                  <Badge className={
                    ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }>
                    {ticket.status}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600">{ticket.description}</p>
                <p className="text-xs text-slate-500 mt-2">
                  {format(new Date(ticket.created_date), 'dd/MM/yyyy HH:mm')}
                </p>
              </CardContent>
            </Card>
          ))}
          {tickets.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nenhum chamado registrado</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}