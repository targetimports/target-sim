import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User, Mail, Phone, MapPin, CreditCard, FileText, 
  MessageSquare, Calendar, AlertCircle, Building2, Zap,
  Download, Upload, Send, Bell, CheckCircle, Clock, Hash
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
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Buscar dados relacionados
  const { data: consumerUnits = [] } = useQuery({
    queryKey: ['customer-units', subscription.email],
    queryFn: () => base44.entities.ConsumerUnit.filter({ 
      customer_email: subscription.email 
    })
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['customer-invoices', subscription.email],
    queryFn: () => base44.entities.UtilityBill.filter({ 
      customer_email: subscription.email 
    })
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['customer-notes', subscription.email],
    queryFn: () => base44.entities.CustomerNote.filter({ 
      customer_email: subscription.email 
    })
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ['customer-tickets', subscription.email],
    queryFn: () => base44.entities.SupportTicket.filter({ 
      customer_email: subscription.email 
    })
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['customer-documents', subscription.email],
    queryFn: () => base44.entities.Document.filter({ 
      customer_email: subscription.email 
    })
  });

  // Mutation para criar comentário
  const createCommentMutation = useMutation({
    mutationFn: (noteData) => base44.entities.CustomerNote.create(noteData),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer-notes']);
      setNewComment('');
      toast.success('Comentário adicionado!');
    }
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    createCommentMutation.mutate({
      customer_email: subscription.email,
      customer_id: subscription.id,
      note: newComment,
      note_type: 'general',
      is_important: false
    });
  };

  // Combinar todas as atividades
  const activities = [
    ...notes.map(n => ({ ...n, type: 'note', date: n.created_date })),
    ...tickets.map(t => ({ ...t, type: 'ticket', date: t.created_date })),
    ...invoices.map(i => ({ ...i, type: 'invoice', date: i.created_date }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
      {/* Left Sidebar - Customer Info */}
      <div className="col-span-3 space-y-4 overflow-y-auto">
        <Card>
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
                {subscription.name?.charAt(0)}
              </div>
              <h2 className="font-bold text-lg">{subscription.name}</h2>
              <p className="text-sm text-slate-500">
                Criado em {format(new Date(subscription.created_date), 'dd \'de\' MMMM, yyyy')}
              </p>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className="text-slate-500 mb-1">Nome</p>
                <p className="font-medium">{subscription.name}</p>
              </div>

              <div>
                <p className="text-slate-500 mb-1">Email</p>
                <p className="font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {subscription.email || '-'}
                </p>
              </div>

              <div>
                <p className="text-slate-500 mb-1">Whatsapp do Cliente</p>
                <p className="font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {subscription.phone || '-'}
                </p>
              </div>

              <div>
                <p className="text-slate-500 mb-1">Concessionária</p>
                <p className="font-medium">-</p>
              </div>

              <div>
                <p className="text-slate-500 mb-1">Documento [CPFCNPJ]</p>
                <p className="font-medium">{subscription.cpf_cnpj || '-'}</p>
              </div>

              <div>
                <p className="text-slate-500 mb-1">Telefone</p>
                <p className="font-medium">{subscription.phone || '-'}</p>
              </div>

              <div>
                <p className="text-slate-500 mb-1">Responsável</p>
                <p className="font-medium">-</p>
              </div>

              <div>
                <p className="text-slate-500 mb-1">Compartilhado com</p>
                <p className="font-medium">-</p>
              </div>

              <Button variant="outline" size="sm" className="w-full">
                + Criar campo personalizado
              </Button>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Não há um usuário vinculado a este cliente
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Com um conta, um cliente pode acessar o GDASII e acompanhar sua economia e produção de energia.
                </p>
                <Button variant="link" size="sm" className="text-xs p-0 h-auto mt-2">
                  + Cria um usuário para este cliente
                </Button>
              </div>

              <Button variant="outline" size="sm" className="w-full text-red-600">
                Excluir cliente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Center - Activity Timeline */}
      <div className="col-span-6 space-y-4 overflow-y-auto">
        {/* Comment Box */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="Adicione um comentário. Use @ para deixar uma nota para um membro da equipe."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
                className="flex-1"
              />
              <div className="flex flex-col gap-2">
                <Button size="icon" variant="outline">
                  <Upload className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="outline">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                Este cliente possui 0 atividade(s) em aberto
              </label>
              <Button onClick={handleAddComment} disabled={createCommentMutation.isPending}>
                Adicionar comentário
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Installment Info */}
        {consumerUnits.length > 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Mês de referência</p>
                  <p className="font-semibold">JAN/2026</p>
                </div>
                <div>
                  <p className="text-slate-500">Instalação</p>
                  <p className="font-semibold">{consumerUnits[0]?.unit_number}</p>
                </div>
                <div>
                  <p className="text-slate-500">Data de vencimento</p>
                  <p className="font-semibold">20/02/2026</p>
                </div>
              </div>
              <Button className="mt-3 w-full bg-green-600">Aguardando pagamento</Button>
            </CardContent>
          </Card>
        )}

        {/* Activity Tabs */}
        <Card>
          <CardHeader className="border-b">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start">
                <TabsTrigger value="all">Tudo</TabsTrigger>
                <TabsTrigger value="notes">Notas</TabsTrigger>
                <TabsTrigger value="emails">Emails</TabsTrigger>
                <TabsTrigger value="attachments">Anexos</TabsTrigger>
                <TabsTrigger value="activities">Atividades</TabsTrigger>
                <TabsTrigger value="messages">Mensagens</TabsTrigger>
                <TabsTrigger value="billing">Envio de cobranças</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {activities.map((activity, idx) => (
                <div key={idx} className="p-4 hover:bg-slate-50">
                  <div className="flex gap-3">
                    <div className="w-2 h-2 bg-slate-400 rounded-full mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {activity.type === 'note' && activity.note}
                        {activity.type === 'ticket' && `${activity.subject} - ${activity.description}`}
                        {activity.type === 'invoice' && `Fatura ${activity.reference_month}`}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(activity.date), 'dd \'de\' MMMM \'de\' yyyy \'às\' HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  Nenhuma atividade registrada
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Sidebar - Units & Invoices */}
      <div className="col-span-3 space-y-4 overflow-y-auto">
        {/* Usina */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>🏭 Usina</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">-</p>
            <p className="text-xs text-slate-500">Potência: - kWp</p>
            <Button variant="outline" size="sm" className="w-full mt-3">
              + Vincular negócio
            </Button>
          </CardContent>
        </Card>

        {/* Negócios */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">📋 Negócios (0)</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" className="w-full">
              + Vincular negócio
            </Button>
          </CardContent>
        </Card>

        {/* Produtos e serviços */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">🛍️ Produtos e serviços (0)</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" className="w-full">
              + Vincular produto
            </Button>
          </CardContent>
        </Card>

        {/* Unidades consumidoras */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>⚡ Unidades consumidoras ({consumerUnits.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {consumerUnits.slice(0, 3).map((unit) => (
              <div key={unit.id} className="p-2 border rounded-lg">
                <p className="text-sm font-medium">{unit.unit_name || unit.unit_number}</p>
                <p className="text-xs text-slate-500">100%</p>
              </div>
            ))}
            {consumerUnits.length === 0 && (
              <p className="text-sm text-slate-500">Nenhuma unidade</p>
            )}
            <Button variant="outline" size="sm" className="w-full">
              Ver lista de unidades consumidoras
            </Button>
          </CardContent>
        </Card>

        {/* Últimas faturas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">🧾 Últimas faturas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start bg-green-50 text-green-700 border-green-200">
              ✓ Todas as faturas da conta corrente foram capturadas
            </Button>
            {invoices.slice(0, 3).map((invoice) => (
              <div key={invoice.id} className="p-2 border rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Mês de referência: {invoice.reference_month}</p>
                  <p className="text-xs text-slate-500">Status: {invoice.status}</p>
                </div>
                <Button size="icon" variant="ghost">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <Bell className="w-4 h-4 mr-2" />
              Configurar fatura automática de faturas
            </Button>
          </CardContent>
        </Card>

        {/* Tabs Bottom */}
        <Tabs defaultValue="attachments" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="attachments" className="flex-1">Anexos</TabsTrigger>
            <TabsTrigger value="documents" className="flex-1">Documentos</TabsTrigger>
            <TabsTrigger value="contracts" className="flex-1">Contratos</TabsTrigger>
          </TabsList>
          <TabsContent value="attachments" className="text-center py-8 text-sm text-slate-500">
            Nenhum anexo
          </TabsContent>
          <TabsContent value="documents" className="text-center py-8 text-sm text-slate-500">
            Nenhum documento
          </TabsContent>
          <TabsContent value="contracts" className="text-center py-8 text-sm text-slate-500">
            Nenhum contrato
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}