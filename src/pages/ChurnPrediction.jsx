import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, ArrowLeft, Users, Brain } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ChurnPrediction() {
  const queryClient = useQueryClient();

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions-active'],
    queryFn: () => base44.entities.Subscription.filter({ status: 'active' })
  });

  const { data: predictions = [] } = useQuery({
    queryKey: ['churn-predictions'],
    queryFn: () => base44.entities.ChurnPrediction.list('-churn_probability', 50)
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-all'],
    queryFn: () => base44.entities.MonthlyInvoice.list()
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ['tickets-all'],
    queryFn: () => base44.entities.SupportTicket.list()
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const predictionsToCreate = [];

      for (const sub of subscriptions.slice(0, 20)) {
        // Fatores de risco
        const customerInvoices = invoices.filter(i => i.customer_email === sub.customer_email);
        const overdueInvoices = customerInvoices.filter(i => i.status === 'overdue').length;
        const customerTickets = tickets.filter(t => t.customer_email === sub.customer_email);
        const openTickets = customerTickets.filter(t => t.status !== 'resolved').length;

        // Calcular probabilidade (simplificado)
        let probability = 0;
        const riskFactors = [];
        const actions = [];

        if (overdueInvoices > 0) {
          probability += overdueInvoices * 15;
          riskFactors.push(`${overdueInvoices} faturas em atraso`);
          actions.push('Entrar em contato sobre pagamento');
        }

        if (openTickets > 2) {
          probability += openTickets * 10;
          riskFactors.push(`${openTickets} chamados abertos`);
          actions.push('Resolver pendências de suporte');
        }

        const daysSinceCreated = Math.floor((new Date() - new Date(sub.created_date)) / (1000 * 60 * 60 * 24));
        if (daysSinceCreated < 60) {
          probability += 20;
          riskFactors.push('Cliente novo (menos de 60 dias)');
          actions.push('Acompanhamento proativo de onboarding');
        }

        probability = Math.min(probability, 100);

        let riskLevel = 'low';
        if (probability > 70) riskLevel = 'critical';
        else if (probability > 50) riskLevel = 'high';
        else if (probability > 30) riskLevel = 'medium';

        if (probability > 20 || riskFactors.length > 0) {
          predictionsToCreate.push({
            customer_email: sub.customer_email,
            subscription_id: sub.id,
            churn_probability: probability,
            risk_level: riskLevel,
            risk_factors: riskFactors,
            recommended_actions: actions,
            payment_issues_count: overdueInvoices,
            support_tickets_count: openTickets
          });
        }
      }

      // Limpar predições antigas
      const oldPredictions = await base44.entities.ChurnPrediction.list();
      for (const old of oldPredictions) {
        await base44.entities.ChurnPrediction.delete(old.id);
      }

      // Criar novas
      for (const pred of predictionsToCreate) {
        await base44.entities.ChurnPrediction.create(pred);
      }

      return { analyzed: subscriptions.length, atRisk: predictionsToCreate.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['churn-predictions']);
      toast.success(`${data.analyzed} clientes analisados, ${data.atRisk} em risco`);
    }
  });

  const riskColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };

  const riskLabels = {
    low: 'Baixo',
    medium: 'Médio',
    high: 'Alto',
    critical: 'Crítico'
  };

  const criticalCount = predictions.filter(p => p.risk_level === 'critical').length;
  const highCount = predictions.filter(p => p.risk_level === 'high').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-red-600 to-pink-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Brain className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">Previsão de Churn (IA)</h1>
                  <p className="text-sm text-white/80">Identifique clientes em risco</p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-white/30 text-white hover:bg-white/20"
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
            >
              <Brain className="w-4 h-4 mr-2" />
              {analyzeMutation.isPending ? 'Analisando...' : 'Analisar Clientes'}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Risco Crítico</p>
                  <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Risco Alto</p>
                  <p className="text-2xl font-bold text-orange-600">{highCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Analisado</p>
                  <p className="text-2xl font-bold">{subscriptions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Em Risco</p>
                  <p className="text-2xl font-bold">{predictions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Predictions */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes em Risco</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {predictions.map((pred) => {
                const subscription = subscriptions.find(s => s.customer_email === pred.customer_email);
                
                return (
                  <div key={pred.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-lg">{subscription?.customer_name}</p>
                        <p className="text-sm text-slate-500">{pred.customer_email}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={riskColors[pred.risk_level]}>
                          {riskLabels[pred.risk_level]}
                        </Badge>
                        <p className="text-2xl font-bold text-red-600 mt-1">
                          {pred.churn_probability.toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    {pred.risk_factors && pred.risk_factors.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-slate-700 mb-2">⚠️ Fatores de Risco:</p>
                        <ul className="space-y-1">
                          {pred.risk_factors.map((factor, idx) => (
                            <li key={idx} className="text-sm text-slate-600 pl-4">• {factor}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {pred.recommended_actions && pred.recommended_actions.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-green-700 mb-2">✅ Ações Recomendadas:</p>
                        <ul className="space-y-1">
                          {pred.recommended_actions.map((action, idx) => (
                            <li key={idx} className="text-sm text-slate-600 pl-4">• {action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}

              {predictions.length === 0 && (
                <div className="text-center py-12">
                  <Brain className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-4">Nenhuma análise realizada ainda</p>
                  <Button onClick={() => analyzeMutation.mutate()}>
                    Executar Análise
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}