import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Coins, Leaf, Zap, TrendingUp, TrendingDown, Users, Gift,
  ArrowRightLeft, ShoppingCart, Award, Star, Target
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function EnergyCreditsMarket() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const [transferData, setTransferData] = useState({ recipient_email: '', amount: 0, credit_type: 'green' });
  const [redeemData, setRedeemData] = useState({ amount: 0, type: 'discount' });

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: myCredits = [] } = useQuery({
    queryKey: ['my-credits', user?.email],
    queryFn: () => base44.entities.EnergyCredit.filter({ customer_email: user?.email, status: 'active' }),
    enabled: !!user?.email
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['credit-transactions', user?.email],
    queryFn: () => base44.entities.CreditTransaction.filter({ customer_email: user?.email }),
    enabled: !!user?.email
  });

  const transferCredits = useMutation({
    mutationFn: (data) => base44.entities.CreditTransaction.create({
      customer_email: user.email,
      transaction_type: 'transfer',
      ...data,
      status: 'completed'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-credits']);
      queryClient.invalidateQueries(['credit-transactions']);
      setShowTransferDialog(false);
      setTransferData({ recipient_email: '', amount: 0, credit_type: 'green' });
    }
  });

  const redeemCredits = useMutation({
    mutationFn: (data) => base44.entities.CreditTransaction.create({
      customer_email: user.email,
      transaction_type: 'redeem',
      credit_type: data.credit_type || 'green',
      amount: data.amount,
      description: data.type === 'discount' ? 'Desconto na fatura' : 'Resgate de produto',
      status: 'completed'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-credits']);
      queryClient.invalidateQueries(['credit-transactions']);
      setShowRedeemDialog(false);
      setRedeemData({ amount: 0, type: 'discount' });
    }
  });

  const totalCredits = myCredits.reduce((sum, c) => sum + (c.amount || 0), 0);
  const greenCredits = myCredits.filter(c => c.credit_type === 'green').reduce((sum, c) => sum + c.amount, 0);
  const efficiencyCredits = myCredits.filter(c => c.credit_type === 'efficiency').reduce((sum, c) => sum + c.amount, 0);
  const generationCredits = myCredits.filter(c => c.credit_type === 'generation').reduce((sum, c) => sum + c.amount, 0);

  const creditValue = totalCredits * 0.1; // R$ 0.10 por crédito

  const creditTypeIcons = {
    green: Leaf,
    efficiency: Zap,
    flexibility: TrendingUp,
    generation: Coins
  };

  const creditTypeColors = {
    green: 'bg-green-100 text-green-800',
    efficiency: 'bg-blue-100 text-blue-800',
    flexibility: 'bg-purple-100 text-purple-800',
    generation: 'bg-amber-100 text-amber-900'
  };

  const creditTypeLabels = {
    green: 'Créditos Verdes',
    efficiency: 'Créditos de Eficiência',
    flexibility: 'Créditos de Flexibilidade',
    generation: 'Créditos de Geração'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-amber-900 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Marketplace de Créditos</h1>
              <p className="text-amber-200 text-sm">Acumule, troque e resgate seus créditos de energia</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-amber-200">Saldo Total</p>
              <p className="text-3xl font-bold">{totalCredits.toFixed(0)} créditos</p>
              <p className="text-sm text-amber-200">≈ R$ {creditValue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid sm:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Leaf className="w-12 h-12" />
                <div>
                  <p className="text-sm text-green-100">Créditos Verdes</p>
                  <p className="text-3xl font-bold">{greenCredits.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Zap className="w-12 h-12" />
                <div>
                  <p className="text-sm text-blue-100">Eficiência</p>
                  <p className="text-3xl font-bold">{efficiencyCredits.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Coins className="w-12 h-12" />
                <div>
                  <p className="text-sm text-amber-100">Geração</p>
                  <p className="text-3xl font-bold">{generationCredits.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-800 to-slate-900 text-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Star className="w-12 h-12 text-amber-400" />
                <div>
                  <p className="text-sm text-slate-300">Valor Total</p>
                  <p className="text-3xl font-bold">R$ {creditValue.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Button 
            size="lg" 
            className="h-24 bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => setShowRedeemDialog(true)}
          >
            <ShoppingCart className="w-6 h-6 mr-2" />
            Resgatar Créditos
          </Button>

          <Button 
            size="lg" 
            variant="outline" 
            className="h-24 border-2"
            onClick={() => setShowTransferDialog(true)}
          >
            <ArrowRightLeft className="w-6 h-6 mr-2" />
            Transferir Créditos
          </Button>

          <Button size="lg" variant="outline" className="h-24 border-2">
            <Gift className="w-6 h-6 mr-2" />
            Doar para Projetos
          </Button>
        </div>

        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1">
            <TabsTrigger value="transactions" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              Transações
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              Marketplace
            </TabsTrigger>
            <TabsTrigger value="rewards" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              Recompensas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Histórico de Transações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          tx.transaction_type === 'earn' ? 'bg-green-100' :
                          tx.transaction_type === 'redeem' ? 'bg-red-100' :
                          tx.transaction_type === 'transfer' ? 'bg-blue-100' : 'bg-purple-100'
                        }`}>
                          {tx.transaction_type === 'earn' && <TrendingUp className="w-5 h-5 text-green-600" />}
                          {tx.transaction_type === 'redeem' && <ShoppingCart className="w-5 h-5 text-red-600" />}
                          {tx.transaction_type === 'transfer' && <ArrowRightLeft className="w-5 h-5 text-blue-600" />}
                          {tx.transaction_type === 'donation' && <Gift className="w-5 h-5 text-purple-600" />}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{tx.description || tx.transaction_type}</p>
                          <p className="text-sm text-slate-500">{format(new Date(tx.created_date), 'dd/MM/yyyy HH:mm')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          tx.transaction_type === 'earn' ? 'text-green-600' : 'text-red-600'
                        }`}>
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

          <TabsContent value="marketplace">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Desconto 50 créditos', price: 50, discount: 'R$ 5,00 OFF', icon: Target },
                { title: 'Desconto 100 créditos', price: 100, discount: 'R$ 10,00 OFF', icon: Target },
                { title: 'Kit Eficiência Energética', price: 500, discount: 'Lâmpadas LED', icon: Zap },
                { title: 'Certificado Carbono Zero', price: 200, discount: 'Certificado Digital', icon: Award },
                { title: 'Investimento Usina Solar', price: 1000, discount: 'Participação', icon: Coins },
                { title: 'Doação ONG Ambiental', price: 50, discount: 'Qualquer valor', icon: Leaf }
              ].map((reward, idx) => {
                const Icon = reward.icon;
                return (
                  <Card key={idx} className="border-0 shadow-sm hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-amber-600" />
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-2">{reward.title}</h3>
                      <p className="text-sm text-slate-500 mb-4">{reward.discount}</p>
                      <div className="flex items-center justify-between">
                        <Badge className="bg-amber-100 text-amber-900">{reward.price} créditos</Badge>
                        <Button size="sm" className="bg-amber-500 hover:bg-amber-600">Resgatar</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="rewards">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Como Ganhar Créditos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { action: 'Economia de 100 kWh', reward: 100, type: 'efficiency' },
                    { action: 'Geração excedente', reward: 150, type: 'generation' },
                    { action: 'Consumo em horário off-peak', reward: 50, type: 'flexibility' },
                    { action: 'Energia 100% renovável', reward: 200, type: 'green' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <Award className="w-8 h-8 text-amber-500" />
                        <div>
                          <p className="font-medium text-slate-900">{item.action}</p>
                          <Badge className={creditTypeColors[item.type]}>{creditTypeLabels[item.type]}</Badge>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-amber-600">+{item.reward}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir Créditos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email do destinatário</Label>
              <Input
                type="email"
                value={transferData.recipient_email}
                onChange={(e) => setTransferData(prev => ({ ...prev, recipient_email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label>Tipo de crédito</Label>
              <Select value={transferData.credit_type} onValueChange={(v) => setTransferData(prev => ({ ...prev, credit_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">Créditos Verdes</SelectItem>
                  <SelectItem value="efficiency">Eficiência</SelectItem>
                  <SelectItem value="generation">Geração</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                value={transferData.amount}
                onChange={(e) => setTransferData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
              />
            </div>
            <Button 
              className="w-full bg-amber-500 hover:bg-amber-600" 
              onClick={() => transferCredits.mutate(transferData)}
            >
              Transferir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Redeem Dialog */}
      <Dialog open={showRedeemDialog} onOpenChange={setShowRedeemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resgatar Créditos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de resgate</Label>
              <Select value={redeemData.type} onValueChange={(v) => setRedeemData(prev => ({ ...prev, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount">Desconto na fatura</SelectItem>
                  <SelectItem value="product">Produto/Serviço</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade de créditos</Label>
              <Input
                type="number"
                value={redeemData.amount}
                onChange={(e) => setRedeemData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
              />
              <p className="text-sm text-slate-500 mt-1">
                Valor: R$ {(redeemData.amount * 0.1).toFixed(2)}
              </p>
            </div>
            <Button 
              className="w-full bg-amber-500 hover:bg-amber-600"
              onClick={() => redeemCredits.mutate(redeemData)}
            >
              Resgatar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}