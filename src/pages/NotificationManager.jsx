import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Play, ArrowLeft, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from 'sonner';

export default function NotificationManager() {
  const queryClient = useQueryClient();

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => base44.entities.Subscription.list()
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.MonthlyInvoice.list()
  });

  const { data: creditBalances = [] } = useQuery({
    queryKey: ['credits'],
    queryFn: () => base44.entities.CreditBalance.list()
  });

  const { data: churnPredictions = [] } = useQuery({
    queryKey: ['churn-predictions'],
    queryFn: () => base44.entities.ChurnPrediction.list()
  });

  const { data: plantPerformances = [] } = useQuery({
    queryKey: ['plant-performances'],
    queryFn: () => base44.entities.PlantPerformance.list()
  });

  // Notificações de pagamento próximo (5 dias)
  const sendPaymentRemindersMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const dueInvoices = invoices.filter(i => {
        if (!i.due_date || i.status !== 'pending') return false;
        const dueDate = new Date(i.due_date);
        const daysUntil = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
        return daysUntil >= 0 && daysUntil <= 5;
      });

      for (const invoice of dueInvoices) {
        await base44.entities.SystemNotification.create({
          recipient_email: invoice.customer_email,
          notification_type: 'payment_due',
          title: '💰 Lembrete de Pagamento',
          message: `Sua fatura de R$ ${invoice.final_amount?.toFixed(2)} vence em ${Math.floor((new Date(invoice.due_date) - now) / (1000 * 60 * 60 * 24))} dias. Não esqueça de efetuar o pagamento!`,
          priority: 'high',
          action_url: '/customer-portal'
        });
      }

      return { sent: dueInvoices.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['notifications']);
      toast.success(`${data.sent} lembretes de pagamento enviados!`);
    }
  });

  // Notificações de créditos expirando (30 dias)
  const sendCreditExpirationMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const expiringCredits = creditBalances.filter(c => {
        if (!c.expiration_date || c.balance_kwh <= 0) return false;
        const expDate = new Date(c.expiration_date);
        const daysUntil = Math.floor((expDate - now) / (1000 * 60 * 60 * 24));
        return daysUntil > 0 && daysUntil <= 30;
      });

      for (const credit of expiringCredits) {
        const daysUntil = Math.floor((new Date(credit.expiration_date) - now) / (1000 * 60 * 60 * 24));
        await base44.entities.SystemNotification.create({
          recipient_email: credit.customer_email,
          notification_type: 'credit_expiring',
          title: '⏰ Créditos Expirando',
          message: `Você tem ${credit.balance_kwh.toFixed(0)} kWh de créditos que expiram em ${daysUntil} dias. Use-os antes que vençam!`,
          priority: daysUntil <= 7 ? 'high' : 'medium',
          action_url: '/customer-portal'
        });
      }

      return { sent: expiringCredits.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['notifications']);
      toast.success(`${data.sent} alertas de créditos enviados!`);
    }
  });

  // Notificações de faturas disponíveis
  const sendInvoiceAvailableMutation = useMutation({
    mutationFn: async () => {
      const recentInvoices = invoices.filter(i => {
        const daysSince = Math.floor((new Date() - new Date(i.created_date)) / (1000 * 60 * 60 * 24));
        return daysSince <= 1 && i.status === 'pending';
      });

      for (const invoice of recentInvoices) {
        await base44.entities.SystemNotification.create({
          recipient_email: invoice.customer_email,
          notification_type: 'payment_due',
          title: '📄 Fatura Disponível',
          message: `Sua fatura de ${invoice.month_reference} no valor de R$ ${invoice.final_amount?.toFixed(2)} está disponível. Vencimento: ${new Date(invoice.due_date).toLocaleDateString('pt-BR')}`,
          priority: 'medium',
          action_url: '/customer-portal'
        });
      }

      return { sent: recentInvoices.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['notifications']);
      toast.success(`${data.sent} notificações de fatura enviadas!`);
    }
  });

  // Alertas de geração baixa para admins
  const sendLowGenerationAlertsMutation = useMutation({
    mutationFn: async () => {
      const lowPerformance = plantPerformances.filter(p => 
        p.status === 'low_performance' || p.performance_ratio < 70
      );

      const admins = subscriptions.filter(s => s.customer_email.includes('admin'));
      
      for (const admin of admins) {
        if (lowPerformance.length > 0) {
          await base44.entities.SystemNotification.create({
            recipient_email: admin.customer_email,
            notification_type: 'system_alert',
            title: '⚠️ Alerta de Performance',
            message: `${lowPerformance.length} usinas com baixa performance detectadas. Verifique o sistema.`,
            priority: 'urgent',
            action_url: '/plant-performance-dashboard'
          });
        }
      }

      return { sent: admins.length, issues: lowPerformance.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['notifications']);
      toast.success(`Alertas enviados para ${data.sent} administradores!`);
    }
  });

  // Alertas de churn para admins
  const sendChurnAlertsMutation = useMutation({
    mutationFn: async () => {
      const highRisk = churnPredictions.filter(p => 
        p.risk_level === 'critical' || p.risk_level === 'high'
      );

      const admins = subscriptions.filter(s => s.customer_email.includes('admin'));
      
      for (const admin of admins) {
        if (highRisk.length > 0) {
          await base44.entities.SystemNotification.create({
            recipient_email: admin.customer_email,
            notification_type: 'system_alert',
            title: '🚨 Alerta de Churn',
            message: `${highRisk.length} clientes com alto risco de cancelamento identificados. Ação imediata necessária!`,
            priority: 'urgent',
            action_url: '/churn-prediction'
          });
        }
      }

      return { sent: admins.length, atRisk: highRisk.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['notifications']);
      toast.success(`Alertas enviados para ${data.sent} administradores!`);
    }
  });

  const stats = {
    duePayments: invoices.filter(i => {
      if (!i.due_date || i.status !== 'pending') return false;
      const days = Math.floor((new Date(i.due_date) - new Date()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 5;
    }).length,
    expiringCredits: creditBalances.filter(c => {
      if (!c.expiration_date) return false;
      const days = Math.floor((new Date(c.expiration_date) - new Date()) / (1000 * 60 * 60 * 24));
      return days > 0 && days <= 30;
    }).length,
    lowPerformance: plantPerformances.filter(p => p.status === 'low_performance').length,
    highChurnRisk: churnPredictions.filter(p => p.risk_level === 'critical' || p.risk_level === 'high').length
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Gerenciador de Notificações</h1>
                <p className="text-sm text-white/80">Envie alertas para clientes e administradores</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Notificações para Clientes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Notificações para Clientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold">💰 Pagamentos Próximos</p>
                    <p className="text-sm text-slate-600">Vencimento em até 5 dias</p>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800">
                    {stats.duePayments}
                  </Badge>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => sendPaymentRemindersMutation.mutate()}
                  disabled={sendPaymentRemindersMutation.isPending}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Enviar Lembretes
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold">⏰ Créditos Expirando</p>
                    <p className="text-sm text-slate-600">Expiram em até 30 dias</p>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {stats.expiringCredits}
                  </Badge>
                </div>
                <Button 
                  className="w-full"
                  onClick={() => sendCreditExpirationMutation.mutate()}
                  disabled={sendCreditExpirationMutation.isPending}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Enviar Alertas
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold">📄 Faturas Disponíveis</p>
                    <p className="text-sm text-slate-600">Faturas novas (24h)</p>
                  </div>
                </div>
                <Button 
                  className="w-full"
                  onClick={() => sendInvoiceAvailableMutation.mutate()}
                  disabled={sendInvoiceAvailableMutation.isPending}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Notificar Clientes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Alertas para Administradores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Alertas para Administradores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg border-orange-200 bg-orange-50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold">⚡ Geração Baixa</p>
                    <p className="text-sm text-slate-600">Usinas com problemas</p>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800">
                    {stats.lowPerformance}
                  </Badge>
                </div>
                <Button 
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  onClick={() => sendLowGenerationAlertsMutation.mutate()}
                  disabled={sendLowGenerationAlertsMutation.isPending}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Alertar Administradores
                </Button>
              </div>

              <div className="p-4 border rounded-lg border-red-200 bg-red-50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold">🚨 Risco de Churn</p>
                    <p className="text-sm text-slate-600">Clientes em risco crítico/alto</p>
                  </div>
                  <Badge className="bg-red-100 text-red-800">
                    {stats.highChurnRisk}
                  </Badge>
                </div>
                <Button 
                  className="w-full bg-red-600 hover:bg-red-700"
                  onClick={() => sendChurnAlertsMutation.mutate()}
                  disabled={sendChurnAlertsMutation.isPending}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Alertar Administradores
                </Button>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  💡 <strong>Dica:</strong> Configure notificações automáticas para enviar alertas regularmente sem intervenção manual.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}