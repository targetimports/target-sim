import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Coins, TrendingUp, Gift, Users, Leaf, Zap, 
  ArrowUpRight, ArrowDownRight, Send, ShoppingBag, Heart
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CreditSystem() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [redeemAmount, setRedeemAmount] = useState('');

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: credits = [] } = useQuery({
    queryKey: ['my-credits', user?.email],
    queryFn: () => base44.entities.EnergyCredit.filter({ 
      customer_email: user?.email,
      status: 'active'
    }),
    enabled: !!user?.email
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['my-transactions', user?.email],
    queryFn: () => base44.entities.CreditTransaction.filter({ customer_email: user?.email }),
    enabled: !!user?.email
  });

  const totalCredits = credits.reduce((sum, c) => sum + (c.amount || 0), 0);
  const creditsByType = credits.reduce((acc, c) => {
    acc[c.credit_type] = (acc[c.credit_type] || 0) + c.amount;
    return acc;
  }, {});

  const transferMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.CreditTransaction.create({
        customer_email: user.email,
        transaction_type: 'transfer',
        credit_type: 'green',
        amount: parseFloat(data.amount),
        recipient_email: data.email,
        description: `Transferência para ${data.email}`,
        balance_after: totalCredits - parseFloat(data.amount)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-credits']);
      queryClient.invalidateQueries(['my-transactions']);
      setTransferEmail('');
      setTransferAmount('');
    }
  });

  const redeemMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.CreditTransaction.create({
        customer_email: user.email,
        transaction_type: 'redeem',
        credit_type: 'green',
        amount: parseFloat(data.amount),
        value_brl: parseFloat(data.amount) * 0.5,
        description: 'Resgate para desconto na fatura',
        balance_after: totalCredits - parseFloat(data.amount)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-credits']);
      queryClient.invalidateQueries(['my-transactions']);
      setRedeemAmount('');
    }
  });

  const creditTypeInfo = {
    green: { icon: Leaf, label: 'Créditos Verdes', color: 'bg-green-100 text-green-800', iconColor: 'text-green-600' },
    efficiency: { icon: Zap, label: 'Eficiência', color: 'bg-blue-100 text-blue-800', iconColor: 'text-blue-600' },
    flexibility: { icon: TrendingUp, label: 'Flexibilidade', color: 'bg-purple-100 text-purple-800', iconColor: 'text-purple-600' },
    generation: { icon: Coins, label: 'Geração', color: 'bg-amber-100 text-amber-900', iconColor: 'text-amber-600' }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-amber-900 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Banco de Créditos</h1>
              <p className="text-amber-400 text-sm">Ganhe, troque e resgate seus créditos</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-amber-200">Saldo Total</p>
              <p className="text-4xl font-bold">{totalCredits.toFixed(0)}</p>
              <p className="text-sm text-amber-200">créditos</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Credit Types */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Object.entries(creditsByType).map(([type, amount]) => {
            const info = creditTypeInfo[type];
            if (!info) return null;
            return (
              <motion.div key={type} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                        <info.icon className={`w-6 h-6 ${info.iconColor}`} />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">{info.label}</p>
                        <p className="text-2xl font-bold text-slate-900">{amount.toFixed(0)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <Tabs defaultValue="earn" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1">
            <TabsTrigger value="earn" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Coins className="w-4 h-4 mr-2" />
              Ganhar
            </TabsTrigger>
            <TabsTrigger value="redeem" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Gift className="w-4 h-4 mr-2" />
              Resgatar
            </TabsTrigger>
            <TabsTrigger value="transfer" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Send className="w-4 h-4 mr-2" />
              Transferir
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="earn">
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { title: 'Economia de Energia', desc: 'Reduza seu consumo e ganhe créditos', icon: Zap, credits: '10 créditos por 100 kWh economizados', color: 'amber' },
                { title: 'Microgeração', desc: 'Gere sua própria energia e acumule créditos', icon: Coins, credits: '20 créditos por 100 kWh injetados', color: 'green' },
                { title: 'Horário Flexível', desc: 'Consuma fora dos picos e ganhe bônus', icon: TrendingUp, credits: '5 créditos por dia em off-peak', color: 'purple' },
                { title: 'Indicação de Amigos', desc: 'Indique e ganhe quando eles assinarem', icon: Users, credits: '500 créditos por indicação convertida', color: 'blue' }
              ].map((item, idx) => (
                <Card key={idx} className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 bg-${item.color}-100 rounded-xl flex items-center justify-center`}>
                        <item.icon className={`w-6 h-6 text-${item.color}-600`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                        <p className="text-sm text-slate-600 mb-2">{item.desc}</p>
                        <Badge className="bg-amber-100 text-amber-900">{item.credits}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="redeem">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Resgatar para Desconto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-600">Converta seus créditos em desconto na próxima fatura</p>
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-sm text-slate-600 mb-1">Taxa de conversão</p>
                    <p className="text-2xl font-bold text-slate-900">1 crédito = R$ 0,50</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade de créditos</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={redeemAmount}
                      onChange={(e) => setRedeemAmount(e.target.value)}
                    />
                    {redeemAmount && (
                      <p className="text-sm text-slate-600">
                        Desconto: R$ {(parseFloat(redeemAmount) * 0.5).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <Button 
                    className="w-full bg-amber-500 hover:bg-amber-600"
                    onClick={() => redeemMutation.mutate({ amount: redeemAmount })}
                    disabled={!redeemAmount || parseFloat(redeemAmount) > totalCredits}
                  >
                    Resgatar Créditos
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-6">
                {[
                  { title: 'Produtos Parceiros', icon: ShoppingBag, desc: 'Use créditos em lojas parceiras', soon: false },
                  { title: 'Doação Social', icon: Heart, desc: 'Doe para projetos sustentáveis', soon: false },
                  { title: 'Investir em Usinas', icon: Coins, desc: 'Participe de novos projetos', soon: true }
                ].map((option, idx) => (
                  <Card key={idx} className="border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <option.icon className="w-5 h-5 text-slate-600" />
                        <div>
                          <p className="font-medium text-slate-900">{option.title}</p>
                          <p className="text-sm text-slate-500">{option.desc}</p>
                        </div>
                      </div>
                      {option.soon && <Badge variant="outline">Em breve</Badge>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transfer">
            <Card className="border-0 shadow-sm max-w-lg mx-auto">
              <CardHeader>
                <CardTitle>Transferir Créditos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">Envie créditos para outro cliente</p>
                <div className="space-y-2">
                  <Label>Email do destinatário</Label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={transferEmail}
                    onChange={(e) => setTransferEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade de créditos</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full bg-slate-900 hover:bg-slate-800"
                  onClick={() => transferMutation.mutate({ email: transferEmail, amount: transferAmount })}
                  disabled={!transferEmail || !transferAmount || parseFloat(transferAmount) > totalCredits}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Transferir
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Histórico de Transações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          tx.transaction_type === 'earn' ? 'bg-green-100' :
                          tx.transaction_type === 'redeem' ? 'bg-amber-100' :
                          'bg-blue-100'
                        }`}>
                          {tx.transaction_type === 'earn' ? <ArrowUpRight className="w-5 h-5 text-green-600" /> :
                           tx.transaction_type === 'redeem' ? <Gift className="w-5 h-5 text-amber-600" /> :
                           <Send className="w-5 h-5 text-blue-600" />}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{tx.description}</p>
                          <p className="text-sm text-slate-500">
                            {format(new Date(tx.created_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${tx.transaction_type === 'earn' ? 'text-green-600' : 'text-slate-900'}`}>
                          {tx.transaction_type === 'earn' ? '+' : '-'}{tx.amount} créditos
                        </p>
                        {tx.value_brl && (
                          <p className="text-sm text-slate-500">R$ {tx.value_brl.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}