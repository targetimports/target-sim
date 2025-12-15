import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sun, Zap, Wallet, TrendingDown, FileText, Users, 
  Calendar, Download, Copy, Check, Leaf, ArrowUpRight 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CustomerDashboard() {
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['my-subscriptions', user?.email],
    queryFn: () => base44.entities.Subscription.filter({ customer_email: user?.email }),
    enabled: !!user?.email
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['my-invoices', subscriptions],
    queryFn: async () => {
      if (subscriptions.length === 0) return [];
      const allInvoices = await base44.entities.Invoice.list('-created_date', 50);
      return allInvoices.filter(inv => 
        subscriptions.some(sub => sub.id === inv.subscription_id)
      );
    },
    enabled: subscriptions.length > 0
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['my-referrals', user?.email],
    queryFn: () => base44.entities.Referral.filter({ referrer_email: user?.email }),
    enabled: !!user?.email
  });

  const subscription = subscriptions[0];
  const totalSavings = invoices.reduce((sum, inv) => sum + (inv.discount_value || 0), 0);
  const convertedReferrals = referrals.filter(r => r.status === 'converted').length;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}?ref=${user?.email}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    analyzing: 'bg-blue-100 text-blue-800',
    active: 'bg-amber-100 text-amber-900',
    suspended: 'bg-red-100 text-red-800',
    cancelled: 'bg-slate-100 text-slate-800'
  };

  const statusLabels = {
    pending: 'Pendente',
    analyzing: 'Em análise',
    active: 'Ativa',
    suspended: 'Suspensa',
    cancelled: 'Cancelada'
  };

  const invoiceStatusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-amber-100 text-amber-900',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-slate-100 text-slate-800'
  };

  const invoiceStatusLabels = {
    pending: 'Pendente',
    paid: 'Pago',
    overdue: 'Vencido',
    cancelled: 'Cancelado'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-900 to-amber-600 rounded-xl flex items-center justify-center">
                <Sun className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Target Sim</h1>
                <p className="text-sm text-slate-500">Olá, {user?.full_name || 'Cliente'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('SuperApp')}>
                <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                  🌟 Super App
                </Button>
              </Link>
              <Link to={createPageUrl('NotificationCenter')}>
                <Button variant="ghost" className="text-slate-600 hover:text-amber-600">
                  Notificações
                </Button>
              </Link>
              <Link to={createPageUrl('Gamification')}>
                <Button variant="ghost" className="text-slate-600 hover:text-amber-600">
                  Conquistas
                </Button>
              </Link>
              <Button variant="outline" onClick={() => base44.auth.logout()}>
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-amber-600" />
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-sm text-slate-500 mb-1">Economia total</p>
                <p className="text-2xl font-bold text-slate-900">R$ {totalSavings.toFixed(2)}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-amber-500" />
                  </div>
                </div>
                <p className="text-sm text-slate-500 mb-1">Desconto mensal</p>
                <p className="text-2xl font-bold text-slate-900">
                  {subscription?.discount_percentage || 15}%
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <Leaf className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
                <p className="text-sm text-slate-500 mb-1">CO² evitado</p>
                <p className="text-2xl font-bold text-slate-900">{(totalSavings * 0.5).toFixed(0)} kg</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-sm text-slate-500 mb-1">Indicações convertidas</p>
                <p className="text-2xl font-bold text-slate-900">{convertedReferrals}</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <Tabs defaultValue="subscription" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1">
            <TabsTrigger value="subscription" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Zap className="w-4 h-4 mr-2" />
              Assinatura
            </TabsTrigger>
            <TabsTrigger value="invoices" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" />
              Faturas
            </TabsTrigger>
            <TabsTrigger value="referrals" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Indicações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="subscription">
            {subscription ? (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Minha assinatura</CardTitle>
                    <Badge className={statusColors[subscription.status]}>
                      {statusLabels[subscription.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-slate-900">Dados do contrato</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between py-2 border-b border-slate-100">
                          <span className="text-slate-500">Valor médio da conta</span>
                          <span className="font-medium">R$ {subscription.average_bill_value?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-100">
                          <span className="text-slate-500">Desconto</span>
                          <span className="font-medium text-amber-600">{subscription.discount_percentage || 15}%</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-100">
                          <span className="text-slate-500">Economia mensal estimada</span>
                          <span className="font-medium text-amber-600">
                            R$ {((subscription.average_bill_value || 0) * (subscription.discount_percentage || 15) / 100).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-100">
                          <span className="text-slate-500">Distribuidora</span>
                          <span className="font-medium">{subscription.distributor}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-semibold text-slate-900">Endereço de instalação</h4>
                      <div className="p-4 bg-slate-50 rounded-xl text-sm">
                        <p className="text-slate-700">{subscription.address}</p>
                        <p className="text-slate-700">{subscription.city} - {subscription.state}</p>
                        <p className="text-slate-500">CEP: {subscription.zip_code}</p>
                      </div>
                      {subscription.contract_start_date && (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Calendar className="w-4 h-4" />
                          <span>Contrato iniciado em {format(new Date(subscription.contract_start_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma assinatura encontrada</h3>
                  <p className="text-slate-500 mb-6">Faça sua adesão e comece a economizar</p>
                  <Button className="bg-amber-500 hover:bg-amber-600">
                    Assinar agora
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="invoices">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Histórico de faturas</CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length > 0 ? (
                  <div className="space-y-4">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{invoice.reference_month}</p>
                            <p className="text-sm text-slate-500">
                              Vencimento: {invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy') : '-'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">R$ {invoice.final_value?.toFixed(2)}</p>
                          <Badge className={invoiceStatusColors[invoice.status]}>
                            {invoiceStatusLabels[invoice.status]}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nenhuma fatura encontrada</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle>Minhas indicações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {referrals.length > 0 ? (
                      <div className="space-y-4">
                        {referrals.map((referral) => (
                          <div key={referral.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                            <div>
                              <p className="font-medium text-slate-900">{referral.referred_name}</p>
                              <p className="text-sm text-slate-500">{referral.referred_email}</p>
                            </div>
                            <Badge className={
                              referral.status === 'converted' ? 'bg-amber-100 text-amber-900' :
                              referral.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {referral.status === 'converted' ? 'Convertido' :
                               referral.status === 'contacted' ? 'Contatado' : 'Pendente'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">Você ainda não fez nenhuma indicação</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-900 to-amber-600 text-white">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold mb-2">Indique e ganhe!</h3>
                  <p className="text-amber-50 text-sm mb-6">
                    Ganhe R$ 100 por cada amigo que assinar nossa energia.
                  </p>
                  <div className="bg-white/10 rounded-xl p-4 mb-4">
                    <p className="text-xs text-amber-50 mb-2">Seu link de indicação:</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-white/10 px-2 py-1 rounded flex-1 truncate">
                        {window.location.origin}?ref={user?.email}
                      </code>
                      <Button size="sm" variant="secondary" onClick={copyReferralLink} className="shrink-0">
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold">R$ {convertedReferrals * 100}</p>
                    <p className="text-sm text-amber-50">Total em bônus</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}