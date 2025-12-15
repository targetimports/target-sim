import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, DollarSign, CheckCircle, ArrowLeft, Smartphone } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';

export default function PaymentGateway() {
  const queryClient = useQueryClient();
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_method: 'credit_card',
    installments: 1,
    card_number: '',
    card_holder: '',
    card_expiry: '',
    card_cvv: ''
  });
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', user?.email],
    queryFn: () => base44.entities.Payment.filter({ customer_email: user.email }, '-created_date', 50),
    enabled: !!user
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', user?.email],
    queryFn: () => base44.entities.Invoice.filter({ customer_email: user.email }),
    enabled: !!user
  });

  const processPayment = useMutation({
    mutationFn: async (data) => {
      // Simulate payment processing
      const payment = await base44.entities.Payment.create({
        customer_email: user.email,
        amount: data.amount,
        payment_method: data.payment_method,
        gateway: 'stripe',
        status: 'completed',
        installments: data.installments,
        card_last_digits: data.card_number.slice(-4),
        paid_at: new Date().toISOString()
      });

      // Create financial transaction
      await base44.entities.FinancialTransaction.create({
        transaction_type: 'revenue',
        category: 'client_subscription',
        description: `Pagamento recebido - ${user.email}`,
        amount: data.amount,
        reference_id: payment.id,
        reference_type: 'payment',
        transaction_date: new Date().toISOString().split('T')[0],
        payment_method: data.payment_method,
        status: 'completed'
      });

      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payments']);
      queryClient.invalidateQueries(['financial-transactions']);
      setPaymentSuccess(true);
      setTimeout(() => setPaymentSuccess(false), 5000);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    processPayment.mutate(paymentData);
  };

  const pendingInvoices = invoices.filter(i => i.status === 'pending');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('CustomerDashboard')}>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-amber-400" />
              <div>
                <h1 className="text-2xl font-bold">Pagamentos</h1>
                <p className="text-amber-400 text-sm">Gerencie seus pagamentos e métodos</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {paymentSuccess && (
              <Card className="border-0 shadow-sm bg-green-50 border-l-4 border-green-500">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-900">Pagamento realizado com sucesso!</p>
                      <p className="text-sm text-green-700">Seu pagamento foi processado.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Realizar Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={paymentData.amount}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                      required
                    />
                  </div>

                  <div>
                    <Label>Método de Pagamento</Label>
                    <Select value={paymentData.payment_method} onValueChange={(v) => setPaymentData(prev => ({ ...prev, payment_method: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit_card">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            Cartão de Crédito
                          </div>
                        </SelectItem>
                        <SelectItem value="pix">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4" />
                            PIX
                          </div>
                        </SelectItem>
                        <SelectItem value="bank_slip">Boleto Bancário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentData.payment_method === 'credit_card' && (
                    <>
                      <div>
                        <Label>Número do Cartão</Label>
                        <Input
                          placeholder="0000 0000 0000 0000"
                          value={paymentData.card_number}
                          onChange={(e) => setPaymentData(prev => ({ ...prev, card_number: e.target.value }))}
                          maxLength="16"
                          required
                        />
                      </div>

                      <div>
                        <Label>Nome no Cartão</Label>
                        <Input
                          placeholder="Nome como está no cartão"
                          value={paymentData.card_holder}
                          onChange={(e) => setPaymentData(prev => ({ ...prev, card_holder: e.target.value }))}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <Label>Validade</Label>
                          <Input
                            placeholder="MM/AA"
                            value={paymentData.card_expiry}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, card_expiry: e.target.value }))}
                            maxLength="5"
                            required
                          />
                        </div>
                        <div>
                          <Label>CVV</Label>
                          <Input
                            placeholder="123"
                            value={paymentData.card_cvv}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, card_cvv: e.target.value }))}
                            maxLength="4"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Parcelas</Label>
                        <Select value={paymentData.installments.toString()} onValueChange={(v) => setPaymentData(prev => ({ ...prev, installments: parseInt(v) }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 6, 12].map(n => (
                              <SelectItem key={n} value={n.toString()}>
                                {n}x de R$ {(paymentData.amount / n).toFixed(2)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {paymentData.payment_method === 'pix' && (
                    <div className="p-4 bg-blue-50 rounded-xl text-center">
                      <p className="text-sm text-blue-700 mb-2">Código PIX será gerado após confirmar</p>
                      <div className="w-32 h-32 bg-white mx-auto rounded-lg flex items-center justify-center">
                        <p className="text-xs text-slate-400">QR Code</p>
                      </div>
                    </div>
                  )}

                  <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600" disabled={processPayment.isPending}>
                    {processPayment.isPending ? 'Processando...' : `Pagar R$ ${paymentData.amount.toFixed(2)}`}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Histórico de Pagamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">Nenhum pagamento realizado</p>
                  ) : (
                    payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div>
                          <p className="font-medium">R$ {payment.amount.toFixed(2)}</p>
                          <p className="text-sm text-slate-500">
                            {payment.payment_method === 'credit_card' ? 'Cartão' :
                             payment.payment_method === 'pix' ? 'PIX' : 'Boleto'}
                            {payment.card_last_digits && ` •••• ${payment.card_last_digits}`}
                          </p>
                          <p className="text-xs text-slate-400">
                            {format(new Date(payment.created_date), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                        <Badge className={
                          payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                          payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {payment.status === 'completed' ? 'Pago' :
                           payment.status === 'failed' ? 'Falhou' : 'Pendente'}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Faturas Pendentes</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingInvoices.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">Nenhuma fatura pendente</p>
                ) : (
                  <div className="space-y-3">
                    {pendingInvoices.map((invoice) => (
                      <div key={invoice.id} className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                        <p className="font-semibold text-amber-900">R$ {invoice.total_amount?.toFixed(2)}</p>
                        <p className="text-sm text-amber-700">
                          Vencimento: {invoice.due_date && format(new Date(invoice.due_date), 'dd/MM/yyyy')}
                        </p>
                        <Button
                          size="sm"
                          className="w-full mt-3 bg-amber-500 hover:bg-amber-600"
                          onClick={() => setPaymentData(prev => ({ ...prev, amount: invoice.total_amount }))}
                        >
                          Pagar Agora
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}