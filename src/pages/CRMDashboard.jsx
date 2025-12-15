import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Users, Phone, Mail, MessageCircle, Calendar, TrendingUp, ArrowLeft, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from 'date-fns';

export default function CRMDashboard() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [interactionData, setInteractionData] = useState({
    customer_email: '',
    interaction_type: 'call',
    subject: '',
    notes: '',
    outcome: 'resolved'
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['crm-subscriptions'],
    queryFn: () => base44.entities.Subscription.list('-created_date')
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ['interactions'],
    queryFn: () => base44.entities.CustomerInteraction.list('-created_date', 200)
  });

  const { data: npsScores = [] } = useQuery({
    queryKey: ['nps-scores'],
    queryFn: () => base44.entities.NPSScore.list('-survey_date')
  });

  const createInteraction = useMutation({
    mutationFn: (data) => base44.entities.CustomerInteraction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['interactions']);
      setShowDialog(false);
      setInteractionData({
        customer_email: '',
        interaction_type: 'call',
        subject: '',
        notes: '',
        outcome: 'resolved'
      });
    }
  });

  const avgNPS = npsScores.length > 0 
    ? npsScores.reduce((sum, s) => sum + s.score, 0) / npsScores.length 
    : 0;

  const promoters = npsScores.filter(s => s.category === 'promoter').length;
  const detractors = npsScores.filter(s => s.category === 'detractor').length;
  const npsResult = npsScores.length > 0 
    ? ((promoters - detractors) / npsScores.length) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-amber-400" />
                <div>
                  <h1 className="text-2xl font-bold">CRM - Gestão de Clientes</h1>
                  <p className="text-amber-400 text-sm">Histórico completo de interações</p>
                </div>
              </div>
            </div>
            <Button onClick={() => setShowDialog(true)} className="bg-amber-500 hover:bg-amber-600">
              <Plus className="w-4 h-4 mr-2" />
              Nova Interação
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid sm:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total de Clientes</p>
                  <p className="text-2xl font-bold">{subscriptions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">NPS Score</p>
                  <p className="text-2xl font-bold">{npsResult.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Interações (30d)</p>
                  <p className="text-2xl font-bold">{interactions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Histórico de Interações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {interactions.map((interaction) => (
                    <div key={interaction.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">{interaction.customer_email}</p>
                          <p className="text-sm text-slate-500">{interaction.subject}</p>
                        </div>
                        <Badge className={
                          interaction.outcome === 'resolved' ? 'bg-green-100 text-green-800' :
                          interaction.outcome === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }>
                          {interaction.outcome === 'resolved' ? 'Resolvido' :
                           interaction.outcome === 'pending' ? 'Pendente' :
                           interaction.outcome === 'escalated' ? 'Escalado' : 'Acompanhamento'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 mb-2 text-sm text-slate-600">
                        {interaction.interaction_type === 'call' && <Phone className="w-4 h-4" />}
                        {interaction.interaction_type === 'email' && <Mail className="w-4 h-4" />}
                        {interaction.interaction_type === 'chat' && <MessageCircle className="w-4 h-4" />}
                        <span className="capitalize">{interaction.interaction_type}</span>
                        <span>•</span>
                        <span>{format(new Date(interaction.created_date), 'dd/MM/yyyy HH:mm')}</span>
                        {interaction.agent_email && (
                          <>
                            <span>•</span>
                            <span>Atendente: {interaction.agent_email}</span>
                          </>
                        )}
                      </div>

                      {interaction.notes && (
                        <p className="text-sm text-slate-600 mt-2">{interaction.notes}</p>
                      )}

                      {interaction.satisfaction_score && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-slate-500">Satisfação:</span>
                          <Badge variant="outline">{interaction.satisfaction_score}/10</Badge>
                        </div>
                      )}
                    </div>
                  ))}

                  {interactions.length === 0 && (
                    <div className="text-center py-12">
                      <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">Nenhuma interação registrada</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>NPS Recente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {npsScores.slice(0, 5).map((nps) => (
                    <div key={nps.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{nps.customer_email}</span>
                        <Badge className={
                          nps.category === 'promoter' ? 'bg-green-100 text-green-800' :
                          nps.category === 'detractor' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {nps.score}/10
                        </Badge>
                      </div>
                      {nps.feedback && (
                        <p className="text-xs text-slate-600">{nps.feedback}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardContent className="p-6">
                <p className="text-sm text-blue-600 mb-2">NPS Médio</p>
                <p className="text-4xl font-bold text-blue-700">{avgNPS.toFixed(1)}</p>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-600">Promotores</span>
                    <span className="font-bold">{promoters}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">Detratores</span>
                    <span className="font-bold">{detractors}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Interação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cliente *</Label>
              <Select value={interactionData.customer_email} onValueChange={(v) => setInteractionData(prev => ({ ...prev, customer_email: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {subscriptions.map(s => (
                    <SelectItem key={s.id} value={s.customer_email}>{s.customer_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo *</Label>
                <Select value={interactionData.interaction_type} onValueChange={(v) => setInteractionData(prev => ({ ...prev, interaction_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Ligação</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="visit">Visita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Resultado *</Label>
                <Select value={interactionData.outcome} onValueChange={(v) => setInteractionData(prev => ({ ...prev, outcome: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resolved">Resolvido</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="escalated">Escalado</SelectItem>
                    <SelectItem value="follow_up_needed">Acompanhamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Assunto</Label>
              <Input value={interactionData.subject} onChange={(e) => setInteractionData(prev => ({ ...prev, subject: e.target.value }))} />
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={interactionData.notes}
                onChange={(e) => setInteractionData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
              />
            </div>

            <Button className="w-full bg-amber-500 hover:bg-amber-600" onClick={() => createInteraction.mutate(interactionData)}>
              Registrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}