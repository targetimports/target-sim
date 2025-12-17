import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Play, ArrowLeft, MessageSquare, Brain, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function LeadAutomation() {
  const queryClient = useQueryClient();

  const { data: leads = [] } = useQuery({
    queryKey: ['sales-leads'],
    queryFn: () => base44.entities.SalesLead.list('-created_date', 100)
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['whatsapp-campaigns'],
    queryFn: () => base44.entities.WhatsAppCampaign.list()
  });

  // Automação de follow-ups
  const runFollowUpsMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const leadsToFollowUp = leads.filter(lead => {
        if (!lead.next_follow_up || !lead.auto_follow_up_enabled) return false;
        const nextDate = new Date(lead.next_follow_up);
        return nextDate <= now && ['new', 'contacted', 'qualified'].includes(lead.status);
      });

      let messagesScheduled = 0;

      for (const lead of leadsToFollowUp) {
        let message = '';
        let nextFollowUp = new Date(now);

        switch (lead.status) {
          case 'new':
            message = `Olá ${lead.name}! Notei seu interesse em energia solar. Posso te ajudar a economizar até 15% na conta de luz. Tem alguns minutos para conversarmos?`;
            nextFollowUp.setDate(nextFollowUp.getDate() + 2);
            await base44.entities.SalesLead.update(lead.id, { 
              status: 'contacted',
              next_follow_up: nextFollowUp.toISOString(),
              follow_up_count: (lead.follow_up_count || 0) + 1,
              last_interaction: now.toISOString()
            });
            break;

          case 'contacted':
            message = `Oi ${lead.name}! Vi que você demonstrou interesse em energia solar. Já tive a chance de pensar sobre a economia na conta de luz? Posso preparar uma proposta personalizada.`;
            nextFollowUp.setDate(nextFollowUp.getDate() + 3);
            await base44.entities.SalesLead.update(lead.id, { 
              next_follow_up: nextFollowUp.toISOString(),
              follow_up_count: (lead.follow_up_count || 0) + 1,
              last_interaction: now.toISOString()
            });
            break;

          case 'qualified':
            message = `Olá ${lead.name}! Preparei uma proposta especial para você economizar R$ ${((lead.average_bill || 0) * 0.15).toFixed(2)} por mês. Posso enviar os detalhes?`;
            nextFollowUp.setDate(nextFollowUp.getDate() + 5);
            await base44.entities.SalesLead.update(lead.id, { 
              status: 'proposal_sent',
              next_follow_up: nextFollowUp.toISOString(),
              follow_up_count: (lead.follow_up_count || 0) + 1,
              last_interaction: now.toISOString()
            });
            break;
        }

        // Criar alerta para enviar mensagem
        if (message) {
          await base44.entities.AutomatedAlert.create({
            alert_type: 'payment_due',
            customer_email: lead.email,
            message: message,
            sent_via: 'whatsapp',
            metadata: { lead_id: lead.id, follow_up: true }
          });
          messagesScheduled++;
        }
      }

      return { processed: leadsToFollowUp.length, messagesScheduled };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['sales-leads']);
      toast.success(`${data.messagesScheduled} mensagens agendadas para ${data.processed} leads!`);
    }
  });

  // Score preditivo com IA
  const runAIScoreMutation = useMutation({
    mutationFn: async () => {
      const leadsToScore = leads.filter(l => !l.ai_score && l.status !== 'won' && l.status !== 'lost').slice(0, 20);

      for (const lead of leadsToScore) {
        let score = 50;
        let conversionProb = 50;

        // Fatores positivos
        if (lead.average_bill > 500) {
          score += 20;
          conversionProb += 15;
        } else if (lead.average_bill > 300) {
          score += 10;
          conversionProb += 8;
        }

        if (lead.source === 'referral') {
          score += 15;
          conversionProb += 12;
        }

        if (lead.company) {
          score += 10;
          conversionProb += 8;
        }

        const daysSinceCreated = Math.floor((new Date() - new Date(lead.created_date)) / (1000 * 60 * 60 * 24));
        if (daysSinceCreated < 3) {
          score += 15;
          conversionProb += 10;
        }

        if (lead.follow_up_count > 2) {
          score -= 10;
          conversionProb -= 8;
        }

        // Normalizar
        score = Math.max(0, Math.min(100, score));
        conversionProb = Math.max(0, Math.min(100, conversionProb));

        await base44.entities.SalesLead.update(lead.id, {
          ai_score: score,
          conversion_probability: conversionProb
        });
      }

      return { scored: leadsToScore.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['sales-leads']);
      toast.success(`${data.scored} leads pontuados com IA!`);
    }
  });

  // Campanhas segmentadas
  const runSegmentedCampaignMutation = useMutation({
    mutationFn: async (segment) => {
      let targetLeads = [];
      let campaignName = '';
      let message = '';

      switch (segment) {
        case 'high_value':
          targetLeads = leads.filter(l => 
            l.average_bill > 500 && 
            ['new', 'contacted'].includes(l.status)
          );
          campaignName = 'Alta Conversão - Contas Premium';
          message = '🌟 Oferta VIP: Para contas acima de R$ 500, garantimos 15% de economia + bônus de boas-vindas!';
          break;

        case 'hot_leads':
          targetLeads = leads.filter(l => 
            (l.ai_score || 0) > 70 && 
            l.status === 'qualified'
          );
          campaignName = 'Leads Quentes - Proposta Urgente';
          message = '🔥 Proposta Relâmpago! Seus vizinhos já economizam com nossa energia solar. Últimas vagas!';
          break;

        case 're_engagement':
          targetLeads = leads.filter(l => {
            const daysSince = Math.floor((new Date() - new Date(l.last_interaction || l.created_date)) / (1000 * 60 * 60 * 24));
            return daysSince > 7 && ['contacted', 'qualified'].includes(l.status);
          });
          campaignName = 'Reengajamento - 2ª Chance';
          message = '💡 Ainda está pagando caro na conta de luz? Temos uma proposta especial esperando por você!';
          break;
      }

      // Criar campanha
      const campaign = await base44.entities.WhatsAppCampaign.create({
        name: campaignName,
        status: 'scheduled',
        target_audience: segment,
        message: message,
        scheduled_date: new Date().toISOString(),
        total_recipients: targetLeads.length
      });

      // Marcar leads
      for (const lead of targetLeads) {
        const campaigns = lead.campaign_sent || [];
        campaigns.push(campaign.id);
        await base44.entities.SalesLead.update(lead.id, {
          campaign_sent: campaigns
        });

        // Criar alerta
        await base44.entities.AutomatedAlert.create({
          alert_type: 'payment_due',
          customer_email: lead.email,
          message: message,
          sent_via: 'whatsapp',
          metadata: { campaign_id: campaign.id, lead_id: lead.id }
        });
      }

      return { campaign: campaignName, sent: targetLeads.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['whatsapp-campaigns']);
      queryClient.invalidateQueries(['sales-leads']);
      toast.success(`Campanha "${data.campaign}" enviada para ${data.sent} leads!`);
    }
  });

  const pendingFollowUps = leads.filter(l => {
    if (!l.next_follow_up) return false;
    return new Date(l.next_follow_up) <= new Date() && l.auto_follow_up_enabled;
  }).length;

  const highScoreLeads = leads.filter(l => (l.ai_score || 0) > 70 && !['won', 'lost'].includes(l.status)).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('SalesPipeline')}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Automação de Vendas</h1>
                <p className="text-sm text-white/80">Follow-ups, IA e campanhas inteligentes</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-500">Follow-ups Pendentes</p>
                  <p className="text-3xl font-bold text-blue-600">{pendingFollowUps}</p>
                </div>
                <MessageSquare className="w-10 h-10 text-blue-600" />
              </div>
              <Button 
                className="w-full"
                onClick={() => runFollowUpsMutation.mutate()}
                disabled={runFollowUpsMutation.isPending}
              >
                <Play className="w-4 h-4 mr-2" />
                Executar Follow-ups
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-500">Leads sem Score</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {leads.filter(l => !l.ai_score && !['won', 'lost'].includes(l.status)).length}
                  </p>
                </div>
                <Brain className="w-10 h-10 text-purple-600" />
              </div>
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={() => runAIScoreMutation.mutate()}
                disabled={runAIScoreMutation.isPending}
              >
                <Brain className="w-4 h-4 mr-2" />
                Calcular Score IA
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-500">Leads Alta Conversão</p>
                  <p className="text-3xl font-bold text-green-600">{highScoreLeads}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-green-600" />
              </div>
              <Badge className="bg-green-100 text-green-800">
                Score &gt; 70
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Campanhas Segmentadas */}
        <Card>
          <CardHeader>
            <CardTitle>Campanhas Segmentadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    💰
                  </div>
                  <div>
                    <p className="font-semibold">Contas Premium</p>
                    <p className="text-xs text-slate-500">Contas &gt; R$ 500</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  {leads.filter(l => l.average_bill > 500 && ['new', 'contacted'].includes(l.status)).length} leads elegíveis
                </p>
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => runSegmentedCampaignMutation.mutate('high_value')}
                  disabled={runSegmentedCampaignMutation.isPending}
                >
                  Enviar Campanha
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    🔥
                  </div>
                  <div>
                    <p className="font-semibold">Leads Quentes</p>
                    <p className="text-xs text-slate-500">Score IA &gt; 70</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  {highScoreLeads} leads elegíveis
                </p>
                <Button 
                  size="sm" 
                  className="w-full bg-red-600 hover:bg-red-700"
                  onClick={() => runSegmentedCampaignMutation.mutate('hot_leads')}
                  disabled={runSegmentedCampaignMutation.isPending}
                >
                  Enviar Campanha
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    🔄
                  </div>
                  <div>
                    <p className="font-semibold">Reengajamento</p>
                    <p className="text-xs text-slate-500">Sem contato &gt; 7 dias</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  {leads.filter(l => {
                    const days = Math.floor((new Date() - new Date(l.last_interaction || l.created_date)) / (1000 * 60 * 60 * 24));
                    return days > 7 && ['contacted', 'qualified'].includes(l.status);
                  }).length} leads elegíveis
                </p>
                <Button 
                  size="sm" 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => runSegmentedCampaignMutation.mutate('re_engagement')}
                  disabled={runSegmentedCampaignMutation.isPending}
                >
                  Enviar Campanha
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}