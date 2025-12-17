import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Play, ArrowLeft, MessageSquare, Mail } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AutomatedAlerts() {
  const queryClient = useQueryClient();

  const { data: alerts = [] } = useQuery({
    queryKey: ['automated-alerts'],
    queryFn: () => base44.entities.AutomatedAlert.list('-created_date', 100)
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => base44.entities.Subscription.filter({ status: 'active' })
  });

  const { data: creditBalances = [] } = useQuery({
    queryKey: ['credit-balances'],
    queryFn: () => base44.entities.CreditBalance.list()
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-pending'],
    queryFn: () => base44.entities.MonthlyInvoice.filter({ status: 'pending' })
  });

  const runAlertsMutation = useMutation({
    mutationFn: async (alertType) => {
      let alertsToCreate = [];
      const today = new Date();

      switch (alertType) {
        case 'credit_expiring':
          // Créditos expirando em 30 dias
          const expiringCredits = creditBalances.filter(c => {
            if (!c.expiration_date) return false;
            const expDate = new Date(c.expiration_date);
            const daysToExpire = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
            return daysToExpire > 0 && daysToExpire <= 30;
          });

          alertsToCreate = expiringCredits.map(c => ({
            alert_type: 'credit_expiring',
            customer_email: c.customer_email,
            message: `⚠️ Seus créditos de energia (${c.balance_kwh.toFixed(0)} kWh) expiram em ${format(new Date(c.expiration_date), 'dd/MM/yyyy')}. Use-os antes que vençam!`,
            sent_via: 'whatsapp',
            metadata: { credit_balance_id: c.id, expiration_date: c.expiration_date }
          }));
          break;

        case 'invoice_ready':
          // Faturas disponíveis
          alertsToCreate = invoices.slice(0, 10).map(i => ({
            alert_type: 'invoice_ready',
            customer_email: i.customer_email,
            message: `💰 Sua fatura do mês ${i.month_reference} está disponível! Valor: R$ ${i.final_amount?.toFixed(2)}. Vencimento: ${format(new Date(i.due_date), 'dd/MM/yyyy')}`,
            sent_via: 'whatsapp',
            metadata: { invoice_id: i.id, amount: i.final_amount }
          }));
          break;

        case 'payment_due':
          // Pagamentos próximos do vencimento (5 dias)
          const dueInvoices = invoices.filter(i => {
            if (!i.due_date) return false;
            const dueDate = new Date(i.due_date);
            const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
            return daysUntilDue >= 0 && daysUntilDue <= 5;
          });

          alertsToCreate = dueInvoices.map(i => ({
            alert_type: 'payment_due',
            customer_email: i.customer_email,
            message: `🔔 Lembrete: Sua fatura de R$ ${i.final_amount?.toFixed(2)} vence em ${format(new Date(i.due_date), 'dd/MM/yyyy')}. Evite juros!`,
            sent_via: 'whatsapp',
            metadata: { invoice_id: i.id }
          }));
          break;
      }

      // Criar alertas
      for (const alert of alertsToCreate) {
        await base44.entities.AutomatedAlert.create(alert);
      }

      return { created: alertsToCreate.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['automated-alerts']);
      toast.success(`${data.created} alertas criados!`);
    }
  });

  const alertTypeLabels = {
    credit_expiring: 'Créditos Expirando',
    invoice_ready: 'Fatura Disponível',
    payment_due: 'Pagamento Próximo',
    high_consumption: 'Consumo Alto',
    low_generation: 'Geração Baixa'
  };

  const alertTypeColors = {
    credit_expiring: 'bg-yellow-100 text-yellow-800',
    invoice_ready: 'bg-blue-100 text-blue-800',
    payment_due: 'bg-orange-100 text-orange-800',
    high_consumption: 'bg-red-100 text-red-800',
    low_generation: 'bg-purple-100 text-purple-800'
  };

  const statusColors = {
    pending: 'bg-slate-100 text-slate-800',
    sent: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Bell className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">Alertas Automáticos</h1>
                  <p className="text-sm text-white/80">Notificações inteligentes para clientes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-500">Créditos Expirando</p>
                  <p className="text-2xl font-bold">
                    {creditBalances.filter(c => {
                      if (!c.expiration_date) return false;
                      const days = Math.floor((new Date(c.expiration_date) - new Date()) / (1000 * 60 * 60 * 24));
                      return days > 0 && days <= 30;
                    }).length}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => runAlertsMutation.mutate('credit_expiring')}
                  disabled={runAlertsMutation.isPending}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Enviar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-500">Faturas Disponíveis</p>
                  <p className="text-2xl font-bold">{invoices.length}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => runAlertsMutation.mutate('invoice_ready')}
                  disabled={runAlertsMutation.isPending}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Enviar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-500">Pagamentos Próximos</p>
                  <p className="text-2xl font-bold">
                    {invoices.filter(i => {
                      if (!i.due_date) return false;
                      const days = Math.floor((new Date(i.due_date) - new Date()) / (1000 * 60 * 60 * 24));
                      return days >= 0 && days <= 5;
                    }).length}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => runAlertsMutation.mutate('payment_due')}
                  disabled={runAlertsMutation.isPending}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Enviar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts History */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={alertTypeColors[alert.alert_type]}>
                        {alertTypeLabels[alert.alert_type]}
                      </Badge>
                      <Badge className={statusColors[alert.status]}>
                        {alert.status}
                      </Badge>
                      {alert.sent_via === 'whatsapp' ? (
                        <MessageSquare className="w-4 h-4 text-green-600" />
                      ) : (
                        <Mail className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <p className="text-sm text-slate-700 mb-1">{alert.message}</p>
                    <p className="text-xs text-slate-500">
                      Para: {alert.customer_email} • {format(new Date(alert.created_date), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              ))}

              {alerts.length === 0 && (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhum alerta enviado ainda</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}