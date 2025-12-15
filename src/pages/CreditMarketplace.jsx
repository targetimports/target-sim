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
  TrendingUp, TrendingDown, ShoppingCart, Gavel, Heart, 
  DollarSign, Clock, Users, Award, Plus, Search, Filter
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function CreditMarketplace() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [showAuctionDialog, setShowAuctionDialog] = useState(false);
  const [showDonateDialog, setShowDonateDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const [sellData, setSellData] = useState({ credit_type: 'green', amount: 0, price_per_credit: 0.12 });
  const [auctionData, setAuctionData] = useState({ credit_type: 'green', amount: 0, starting_price: 0.10, duration_hours: 24 });
  const [donateData, setDonateData] = useState({ project_id: '', amount: 0 });

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: myCredits = [] } = useQuery({
    queryKey: ['my-credits', user?.email],
    queryFn: () => base44.entities.EnergyCredit.filter({ customer_email: user?.email, status: 'active' }),
    enabled: !!user?.email
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['marketplace-listings'],
    queryFn: () => base44.entities.MarketplaceListing.filter({ status: 'active' })
  });

  const { data: auctions = [] } = useQuery({
    queryKey: ['credit-auctions'],
    queryFn: () => base44.entities.CreditAuction.filter({ status: 'active' })
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['social-projects'],
    queryFn: () => base44.entities.SocialProject.filter({ status: 'active' })
  });

  const { data: marketPrices = [] } = useQuery({
    queryKey: ['market-prices'],
    queryFn: () => base44.entities.MarketPrice.list()
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['marketplace-transactions'],
    queryFn: () => base44.entities.MarketplaceTransaction.list('-created_date', 50)
  });

  const createListing = useMutation({
    mutationFn: (data) => base44.entities.MarketplaceListing.create({
      ...data,
      seller_email: user.email,
      total_value: data.amount * data.price_per_credit,
      expiration_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['marketplace-listings']);
      setShowSellDialog(false);
      setSellData({ credit_type: 'green', amount: 0, price_per_credit: 0.12 });
    }
  });

  const createAuction = useMutation({
    mutationFn: (data) => base44.entities.CreditAuction.create({
      ...data,
      seller_email: user.email,
      end_date: new Date(Date.now() + data.duration_hours * 60 * 60 * 1000).toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['credit-auctions']);
      setShowAuctionDialog(false);
      setAuctionData({ credit_type: 'green', amount: 0, starting_price: 0.10, duration_hours: 24 });
    }
  });

  const buyListing = useMutation({
    mutationFn: async (listing) => {
      await base44.entities.MarketplaceTransaction.create({
        listing_id: listing.id,
        seller_email: listing.seller_email,
        buyer_email: user.email,
        credit_type: listing.credit_type,
        amount: listing.amount,
        price_per_credit: listing.price_per_credit,
        total_value: listing.total_value,
        marketplace_fee: listing.total_value * 0.05
      });
      await base44.entities.MarketplaceListing.update(listing.id, { status: 'sold', buyer_email: user.email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['marketplace-listings']);
      queryClient.invalidateQueries(['marketplace-transactions']);
    }
  });

  const placeBid = useMutation({
    mutationFn: async ({ auction, bidAmount }) => {
      await base44.entities.CreditAuction.update(auction.id, {
        current_bid: bidAmount,
        current_bidder_email: user.email,
        bid_count: (auction.bid_count || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['credit-auctions']);
    }
  });

  const donate = useMutation({
    mutationFn: async (data) => {
      const project = projects.find(p => p.id === data.project_id);
      await base44.entities.SocialProject.update(data.project_id, {
        received_credits: (project.received_credits || 0) + data.amount,
        donors_count: (project.donors_count || 0) + 1
      });
      await base44.entities.CreditTransaction.create({
        customer_email: user.email,
        transaction_type: 'donation',
        credit_type: 'green',
        amount: data.amount,
        description: `Doação para ${project.project_name}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['social-projects']);
      setShowDonateDialog(false);
      setDonateData({ project_id: '', amount: 0 });
    }
  });

  const totalCredits = myCredits.reduce((sum, c) => sum + c.amount, 0);
  const filteredListings = listings.filter(l => 
    l.seller_email !== user?.email &&
    (filterType === 'all' || l.credit_type === filterType) &&
    (searchTerm === '' || l.credit_type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getMarketPrice = (type) => {
    const price = marketPrices.find(p => p.credit_type === type);
    return price?.average_price || 0.12;
  };

  const creditTypeLabels = {
    green: 'Verde',
    efficiency: 'Eficiência',
    flexibility: 'Flexibilidade',
    generation: 'Geração'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-amber-900 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Marketplace de Créditos</h1>
              <p className="text-amber-200 text-sm">Compre, venda e doe créditos de energia</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-amber-200">Seu Saldo</p>
              <p className="text-3xl font-bold">{totalCredits.toFixed(0)} créditos</p>
              <p className="text-sm text-amber-200">≈ R$ {(totalCredits * 0.12).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Market Prices */}
        <div className="grid sm:grid-cols-4 gap-6 mb-8">
          {['green', 'efficiency', 'flexibility', 'generation'].map((type) => {
            const price = marketPrices.find(p => p.credit_type === type);
            const change = price?.price_change_24h || 0;
            return (
              <Card key={type} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-500">{creditTypeLabels[type]}</p>
                    {change !== 0 && (
                      <div className={`flex items-center gap-1 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span className="text-xs font-semibold">{Math.abs(change).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-slate-900">R$ {getMarketPrice(type).toFixed(3)}</p>
                  <p className="text-xs text-slate-500 mt-1">por crédito</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Button size="lg" className="h-20 bg-amber-500 hover:bg-amber-600" onClick={() => setShowSellDialog(true)}>
            <ShoppingCart className="w-6 h-6 mr-2" />
            Vender Créditos
          </Button>
          <Button size="lg" variant="outline" className="h-20 border-2" onClick={() => setShowAuctionDialog(true)}>
            <Gavel className="w-6 h-6 mr-2" />
            Criar Leilão
          </Button>
          <Button size="lg" variant="outline" className="h-20 border-2" onClick={() => setShowDonateDialog(true)}>
            <Heart className="w-6 h-6 mr-2" />
            Doar Créditos
          </Button>
        </div>

        <Tabs defaultValue="buy" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1">
            <TabsTrigger value="buy" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Comprar
            </TabsTrigger>
            <TabsTrigger value="auctions" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Gavel className="w-4 h-4 mr-2" />
              Leilões
            </TabsTrigger>
            <TabsTrigger value="donate" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Heart className="w-4 h-4 mr-2" />
              Projetos Sociais
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buy">
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Buscar ofertas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="green">Verde</SelectItem>
                  <SelectItem value="efficiency">Eficiência</SelectItem>
                  <SelectItem value="flexibility">Flexibilidade</SelectItem>
                  <SelectItem value="generation">Geração</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map((listing) => (
                <Card key={listing.id} className="border-0 shadow-sm hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge className="bg-amber-100 text-amber-900">{creditTypeLabels[listing.credit_type]}</Badge>
                      <p className="text-sm text-slate-500">Por {listing.seller_email.split('@')[0]}</p>
                    </div>
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Quantidade</span>
                        <span className="font-semibold">{listing.amount} créditos</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Preço unitário</span>
                        <span className="font-semibold text-amber-600">R$ {listing.price_per_credit.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between text-lg">
                        <span className="font-semibold">Total</span>
                        <span className="font-bold text-slate-900">R$ {listing.total_value.toFixed(2)}</span>
                      </div>
                    </div>
                    <Button className="w-full bg-amber-500 hover:bg-amber-600" onClick={() => buyListing.mutate(listing)}>
                      Comprar Agora
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="auctions">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {auctions.map((auction) => {
                const timeLeft = new Date(auction.end_date) - new Date();
                const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
                return (
                  <Card key={auction.id} className="border-0 shadow-sm hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <Badge className="bg-purple-100 text-purple-800">{creditTypeLabels[auction.credit_type]}</Badge>
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Clock className="w-4 h-4" />
                          {hoursLeft}h restantes
                        </div>
                      </div>
                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Quantidade</span>
                          <span className="font-semibold">{auction.amount} créditos</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Lance inicial</span>
                          <span className="text-slate-600">R$ {auction.starting_price.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between text-lg">
                          <span className="font-semibold">Lance atual</span>
                          <span className="font-bold text-amber-600">R$ {(auction.current_bid || auction.starting_price).toFixed(3)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Users className="w-4 h-4" />
                          {auction.bid_count || 0} lances
                        </div>
                      </div>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="Seu lance"
                        className="mb-2"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const bid = parseFloat(e.target.value);
                            if (bid > (auction.current_bid || auction.starting_price)) {
                              placeBid.mutate({ auction, bidAmount: bid });
                              e.target.value = '';
                            }
                          }
                        }}
                      />
                      <Button className="w-full bg-purple-500 hover:bg-purple-600">
                        <Gavel className="w-4 h-4 mr-2" />
                        Dar Lance
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="donate">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => {
                const progress = ((project.received_credits || 0) / project.goal_credits) * 100;
                return (
                  <Card key={project.id} className="border-0 shadow-sm hover:shadow-lg transition-shadow">
                    {project.image_url && (
                      <div className="h-40 bg-gradient-to-br from-green-500 to-emerald-600" />
                    )}
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-slate-900 mb-2">{project.project_name}</h3>
                      <p className="text-sm text-slate-600 mb-4">{project.description}</p>
                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Arrecadado</span>
                          <span className="font-semibold">{project.received_credits || 0} / {project.goal_credits}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Users className="w-4 h-4" />
                          {project.donors_count || 0} doadores
                        </div>
                      </div>
                      <Button 
                        className="w-full bg-green-500 hover:bg-green-600"
                        onClick={() => {
                          setSelectedProject(project);
                          setShowDonateDialog(true);
                        }}
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        Doar Créditos
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Transações Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.slice(0, 20).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                          <ShoppingCart className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{tx.amount} créditos {creditTypeLabels[tx.credit_type]}</p>
                          <p className="text-sm text-slate-500">
                            {tx.buyer_email === user?.email ? 'Compra' : 'Venda'} • {format(new Date(tx.created_date), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">R$ {tx.total_value.toFixed(2)}</p>
                        <p className="text-xs text-slate-500">R$ {tx.price_per_credit.toFixed(3)}/crédito</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Sell Dialog */}
      <Dialog open={showSellDialog} onOpenChange={setShowSellDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vender Créditos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Crédito</Label>
              <Select value={sellData.credit_type} onValueChange={(v) => setSellData(prev => ({ ...prev, credit_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">Verde</SelectItem>
                  <SelectItem value="efficiency">Eficiência</SelectItem>
                  <SelectItem value="flexibility">Flexibilidade</SelectItem>
                  <SelectItem value="generation">Geração</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                value={sellData.amount}
                onChange={(e) => setSellData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
              />
            </div>
            <div>
              <Label>Preço por crédito (R$)</Label>
              <Input
                type="number"
                step="0.001"
                value={sellData.price_per_credit}
                onChange={(e) => setSellData(prev => ({ ...prev, price_per_credit: parseFloat(e.target.value) }))}
              />
              <p className="text-sm text-slate-500 mt-1">
                Preço de mercado: R$ {getMarketPrice(sellData.credit_type).toFixed(3)}
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl">
              <p className="text-sm text-slate-600 mb-1">Valor total</p>
              <p className="text-2xl font-bold">R$ {(sellData.amount * sellData.price_per_credit).toFixed(2)}</p>
            </div>
            <Button className="w-full bg-amber-500 hover:bg-amber-600" onClick={() => createListing.mutate(sellData)}>
              Criar Oferta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auction Dialog */}
      <Dialog open={showAuctionDialog} onOpenChange={setShowAuctionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Leilão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Crédito</Label>
              <Select value={auctionData.credit_type} onValueChange={(v) => setAuctionData(prev => ({ ...prev, credit_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">Verde</SelectItem>
                  <SelectItem value="efficiency">Eficiência</SelectItem>
                  <SelectItem value="flexibility">Flexibilidade</SelectItem>
                  <SelectItem value="generation">Geração</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                value={auctionData.amount}
                onChange={(e) => setAuctionData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
              />
            </div>
            <div>
              <Label>Lance Inicial (R$ por crédito)</Label>
              <Input
                type="number"
                step="0.001"
                value={auctionData.starting_price}
                onChange={(e) => setAuctionData(prev => ({ ...prev, starting_price: parseFloat(e.target.value) }))}
              />
            </div>
            <div>
              <Label>Duração (horas)</Label>
              <Select value={String(auctionData.duration_hours)} onValueChange={(v) => setAuctionData(prev => ({ ...prev, duration_hours: parseInt(v) }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 horas</SelectItem>
                  <SelectItem value="12">12 horas</SelectItem>
                  <SelectItem value="24">24 horas</SelectItem>
                  <SelectItem value="48">48 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-purple-500 hover:bg-purple-600" onClick={() => createAuction.mutate(auctionData)}>
              Criar Leilão
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Donate Dialog */}
      <Dialog open={showDonateDialog} onOpenChange={setShowDonateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Doar Créditos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedProject && (
              <div className="p-4 bg-green-50 rounded-xl">
                <h4 className="font-semibold text-slate-900 mb-1">{selectedProject.project_name}</h4>
                <p className="text-sm text-slate-600">{selectedProject.description}</p>
              </div>
            )}
            <div>
              <Label>Projeto</Label>
              <Select value={donateData.project_id} onValueChange={(v) => setDonateData(prev => ({ ...prev, project_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade de Créditos</Label>
              <Input
                type="number"
                value={donateData.amount}
                onChange={(e) => setDonateData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                placeholder="0"
              />
              <p className="text-sm text-slate-500 mt-1">
                Valor aproximado: R$ {(donateData.amount * 0.12).toFixed(2)}
              </p>
            </div>
            <Button className="w-full bg-green-500 hover:bg-green-600" onClick={() => donate.mutate(donateData)}>
              <Heart className="w-4 h-4 mr-2" />
              Confirmar Doação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}