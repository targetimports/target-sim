import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShoppingBag, Shield, DollarSign, Briefcase, Crown,
  Sun, ArrowLeft, Package, TrendingUp, Award, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function SuperApp() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: products = [] } = useQuery({
    queryKey: ['eco-products'],
    queryFn: () => base44.entities.EcoProduct.filter({ is_available: true })
  });

  const { data: insurance = [] } = useQuery({
    queryKey: ['my-insurance', user?.email],
    queryFn: () => base44.entities.Insurance.filter({ customer_email: user?.email }),
    enabled: !!user?.email
  });

  const { data: credits = [] } = useQuery({
    queryKey: ['my-credits', user?.email],
    queryFn: () => base44.entities.SolarCredit.filter({ customer_email: user?.email }),
    enabled: !!user?.email
  });

  const { data: consulting = [] } = useQuery({
    queryKey: ['my-consulting', user?.email],
    queryFn: () => base44.entities.EnergyConsulting.filter({ customer_email: user?.email }),
    enabled: !!user?.email
  });

  const { data: concierge = [] } = useQuery({
    queryKey: ['my-concierge', user?.email],
    queryFn: () => base44.entities.ConciergeService.filter({ customer_email: user?.email }),
    enabled: !!user?.email
  });

  const categories = {
    solar_panel: '☀️ Painéis',
    inverter: '⚡ Inversores',
    battery: '🔋 Baterias',
    charger: '🔌 Carregadores',
    accessories: '🛠️ Acessórios',
    other: '📦 Outros'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-amber-600 to-yellow-500 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('CustomerDashboard')}>
                <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Super App Target Sim</h1>
                <p className="text-sm text-white/80">Seu hub completo de energia solar</p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-white/30">
              Olá, {user?.full_name?.split(' ')[0] || 'Cliente'}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="marketplace" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1">
            <TabsTrigger value="marketplace" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Marketplace
            </TabsTrigger>
            <TabsTrigger value="insurance" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Shield className="w-4 h-4 mr-2" />
              Seguros
            </TabsTrigger>
            <TabsTrigger value="credit" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <DollarSign className="w-4 h-4 mr-2" />
              Crédito Solar
            </TabsTrigger>
            <TabsTrigger value="consulting" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Briefcase className="w-4 h-4 mr-2" />
              Consultoria
            </TabsTrigger>
            <TabsTrigger value="concierge" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Crown className="w-4 h-4 mr-2" />
              Concierge
            </TabsTrigger>
          </TabsList>

          {/* MARKETPLACE */}
          <TabsContent value="marketplace">
            <div className="space-y-6">
              <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Marketplace Eco</h3>
                      <p className="text-slate-600">Produtos sustentáveis e equipamentos solares</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-3 gap-6">
                {products.map(product => (
                  <Card key={product.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    {product.image_url && (
                      <div className="h-48 bg-slate-100 rounded-t-xl overflow-hidden">
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardContent className="p-6">
                      <Badge className="mb-2" variant="outline">
                        {categories[product.category]}
                      </Badge>
                      <h4 className="font-semibold text-lg mb-2">{product.name}</h4>
                      <p className="text-sm text-slate-600 mb-4">{product.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-amber-600">
                          R$ {product.price?.toFixed(2)}
                        </span>
                        <Button size="sm" className="bg-amber-500 hover:bg-amber-600">
                          Comprar
                        </Button>
                      </div>
                      {product.co2_offset_kg && (
                        <p className="text-xs text-green-600 mt-3">
                          🌱 Economiza {product.co2_offset_kg} kg CO²/ano
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {products.length === 0 && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nenhum produto disponível no momento</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* SEGUROS */}
          <TabsContent value="insurance">
            <div className="space-y-6">
              <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center">
                        <Shield className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">Proteção Completa</h3>
                        <p className="text-slate-600">Seguros para equipamentos e propriedades</p>
                      </div>
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Contratar Seguro
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                {insurance.map(ins => (
                  <Card key={ins.id} className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{ins.insurance_type}</span>
                        <Badge className={
                          ins.status === 'active' ? 'bg-green-100 text-green-800' :
                          ins.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-slate-100 text-slate-800'
                        }>
                          {ins.status}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Apólice:</span>
                          <span className="font-medium">{ins.policy_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Cobertura:</span>
                          <span className="font-medium">R$ {ins.coverage_amount?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Prêmio mensal:</span>
                          <span className="font-medium text-blue-600">R$ {ins.premium_monthly}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {insurance.length === 0 && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h4 className="font-semibold mb-2">Proteja seu investimento</h4>
                    <p className="text-slate-500 mb-6">Seguros a partir de R$ 49/mês</p>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Ver Planos de Seguro
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* CRÉDITO SOLAR */}
          <TabsContent value="credit">
            <div className="space-y-6">
              <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center">
                        <DollarSign className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">Crédito Solar</h3>
                        <p className="text-slate-600">Financie seus equipamentos com taxas especiais</p>
                      </div>
                    </div>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      Simular Crédito
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                {credits.map(credit => (
                  <Card key={credit.id} className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Crédito #{credit.credit_number}</span>
                        <Badge className={
                          credit.status === 'active' ? 'bg-green-100 text-green-800' :
                          credit.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          credit.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-slate-100 text-slate-800'
                        }>
                          {credit.status}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Valor financiado:</span>
                          <span className="font-semibold">R$ {credit.amount?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Parcelas:</span>
                          <span>{credit.paid_installments || 0}/{credit.installments}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Valor da parcela:</span>
                          <span className="font-semibold text-emerald-600">R$ {credit.installment_value}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Saldo devedor:</span>
                          <span>R$ {credit.remaining_balance?.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {credits.length === 0 && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h4 className="font-semibold mb-2">Financie seu projeto solar</h4>
                    <p className="text-slate-500 mb-6">Taxas a partir de 0,99% ao mês</p>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      Solicitar Crédito
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* CONSULTORIA */}
          <TabsContent value="consulting">
            <div className="space-y-6">
              <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center">
                        <Briefcase className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">Consultoria Energética</h3>
                        <p className="text-slate-600">Especialistas para otimizar seu consumo</p>
                      </div>
                    </div>
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      Agendar Consultoria
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-3 gap-6">
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-6 h-6 text-purple-600" />
                    </div>
                    <h4 className="font-semibold mb-2">Auditoria Energética</h4>
                    <p className="text-sm text-slate-600 mb-4">Análise completa do seu consumo</p>
                    <p className="text-2xl font-bold text-purple-600 mb-4">R$ 299</p>
                    <Button variant="outline" size="sm">Contratar</Button>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                    <h4 className="font-semibold mb-2">Otimização</h4>
                    <p className="text-sm text-slate-600 mb-4">Reduza custos em até 40%</p>
                    <p className="text-2xl font-bold text-purple-600 mb-4">R$ 499</p>
                    <Button variant="outline" size="sm">Contratar</Button>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Sun className="w-6 h-6 text-purple-600" />
                    </div>
                    <h4 className="font-semibold mb-2">Projeto Completo</h4>
                    <p className="text-sm text-slate-600 mb-4">Do zero à instalação</p>
                    <p className="text-2xl font-bold text-purple-600 mb-4">R$ 1.499</p>
                    <Button variant="outline" size="sm">Contratar</Button>
                  </CardContent>
                </Card>
              </div>

              {consulting.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle>Minhas Consultorias</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {consulting.map(cons => (
                        <div key={cons.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                          <div>
                            <p className="font-medium">{cons.service_type}</p>
                            <p className="text-sm text-slate-500">{cons.consultant_name || 'A designar'}</p>
                          </div>
                          <Badge>{cons.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* CONCIERGE */}
          <TabsContent value="concierge">
            <div className="space-y-6">
              <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center">
                      <Crown className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Concierge Premium</h3>
                      <p className="text-slate-600">Atendimento VIP personalizado</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-3 gap-6">
                <Card className="border-2 border-slate-200">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Silver</span>
                      <Award className="w-5 h-5 text-slate-400" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold mb-2">R$ 99<span className="text-sm font-normal">/mês</span></p>
                    <ul className="space-y-2 text-sm mb-6">
                      <li>✓ Suporte prioritário</li>
                      <li>✓ Relatórios mensais</li>
                      <li>✓ 2 consultorias/ano</li>
                    </ul>
                    <Button variant="outline" className="w-full">Assinar</Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-amber-500 relative">
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500">
                    Mais Popular
                  </Badge>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Gold</span>
                      <Award className="w-5 h-5 text-amber-500" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold mb-2">R$ 249<span className="text-sm font-normal">/mês</span></p>
                    <ul className="space-y-2 text-sm mb-6">
                      <li>✓ Tudo do Silver</li>
                      <li>✓ Gerente dedicado</li>
                      <li>✓ 5 consultorias/ano</li>
                      <li>✓ Desconto 10% produtos</li>
                    </ul>
                    <Button className="w-full bg-amber-500 hover:bg-amber-600">Assinar</Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-500">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Platinum</span>
                      <Award className="w-5 h-5 text-purple-500" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold mb-2">R$ 599<span className="text-sm font-normal">/mês</span></p>
                    <ul className="space-y-2 text-sm mb-6">
                      <li>✓ Tudo do Gold</li>
                      <li>✓ Consultorias ilimitadas</li>
                      <li>✓ Desconto 20% produtos</li>
                      <li>✓ Acesso exclusivo a eventos</li>
                    </ul>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700">Assinar</Button>
                  </CardContent>
                </Card>
              </div>

              {concierge.length > 0 && concierge[0]?.status === 'active' && (
                <Card className="border-0 shadow-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge className="bg-white/20 text-white mb-2">
                          {concierge[0].tier.toUpperCase()}
                        </Badge>
                        <h4 className="text-xl font-bold">Você é membro {concierge[0].tier}!</h4>
                        <p className="text-white/80">Seu gerente: {concierge[0].dedicated_manager || 'A designar'}</p>
                      </div>
                      <Crown className="w-16 h-16 text-white/30" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}