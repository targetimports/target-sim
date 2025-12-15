import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, TrendingUp, Wrench, MessageSquare, FileText,
  ArrowLeft, Upload, AlertTriangle, CheckCircle, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function AIInnovations() {
  const queryClient = useQueryClient();
  const [selectedPlant, setSelectedPlant] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [invoiceFile, setInvoiceFile] = useState(null);

  const { data: plants = [] } = useQuery({
    queryKey: ['powerplants'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const { data: predictions = [] } = useQuery({
    queryKey: ['predictive-maintenance'],
    queryFn: () => base44.entities.PredictiveMaintenance.filter({ status: 'open' })
  });

  const { data: pricing = [] } = useQuery({
    queryKey: ['dynamic-pricing'],
    queryFn: () => base44.entities.DynamicPricing.list('-date', 10)
  });

  const runPredictiveMaintenance = useMutation({
    mutationFn: async (plantId) => {
      const res = await base44.functions.invoke('predictiveMaintenance', { 
        power_plant_id: plantId 
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Análise concluída! ${data.critical_items} itens críticos encontrados`);
      queryClient.invalidateQueries(['predictive-maintenance']);
      setSelectedPlant('');
    },
    onError: () => {
      toast.error('Erro ao executar análise preditiva');
    }
  });

  const runDynamicPricing = useMutation({
    mutationFn: async ({ plantId, price }) => {
      const res = await base44.functions.invoke('dynamicPricing', { 
        power_plant_id: plantId,
        base_price_kwh: parseFloat(price)
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries(['dynamic-pricing']);
      setSelectedPlant('');
      setBasePrice('');
    },
    onError: () => {
      toast.error('Erro ao calcular preço dinâmico');
    }
  });

  const runPortfolioOptimization = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('optimizePortfolio', {});
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Otimização concluída! ${data.recommended_actions.expand.length} usinas para expansão`);
    }
  });

  const chatbotMutation = useMutation({
    mutationFn: async (message) => {
      const res = await base44.functions.invoke('salesChatbot', { 
        message,
        session_id: `session_${Date.now()}`
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('Chatbot: ' + data.response);
      setChatMessage('');
    }
  });

  const ocrMutation = useMutation({
    mutationFn: async (file) => {
      const res = await base44.functions.invoke('ocrInvoice', { file });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Fatura processada! Valor: R$ ${data.extracted_data.valor_total}`);
      setInvoiceFile(null);
    },
    onError: () => {
      toast.error('Erro ao processar fatura');
    }
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInvoiceFile(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const riskColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">IA & Inovações</h1>
                <p className="text-sm text-white/80">Ferramentas de inteligência artificial</p>
              </div>
            </div>
            <Brain className="w-10 h-10 text-white/30" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="predictive" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1">
            <TabsTrigger value="predictive" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Wrench className="w-4 h-4 mr-2" />
              Manutenção Preditiva
            </TabsTrigger>
            <TabsTrigger value="pricing" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-2" />
              Preços Dinâmicos
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Brain className="w-4 h-4 mr-2" />
              Otimização
            </TabsTrigger>
            <TabsTrigger value="chatbot" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <MessageSquare className="w-4 h-4 mr-2" />
              Chatbot
            </TabsTrigger>
            <TabsTrigger value="ocr" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" />
              OCR Faturas
            </TabsTrigger>
          </TabsList>

          {/* MANUTENÇÃO PREDITIVA */}
          <TabsContent value="predictive">
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Executar Análise</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Selecione a usina</Label>
                    <select
                      value={selectedPlant}
                      onChange={(e) => setSelectedPlant(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg mt-1"
                    >
                      <option value="">Escolha...</option>
                      {plants.map(plant => (
                        <option key={plant.id} value={plant.id}>{plant.name}</option>
                      ))}
                    </select>
                  </div>
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={() => runPredictiveMaintenance.mutate(selectedPlant)}
                    disabled={!selectedPlant || runPredictiveMaintenance.isPending}
                  >
                    {runPredictiveMaintenance.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analisando...</>
                    ) : (
                      'Analisar com IA'
                    )}
                  </Button>
                </CardContent>
              </Card>

              <div className="lg:col-span-2">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle>Previsões Ativas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {predictions.map(pred => (
                        <div key={pred.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <AlertTriangle className={`w-4 h-4 ${
                                pred.risk_level === 'critical' ? 'text-red-500' :
                                pred.risk_level === 'high' ? 'text-orange-500' :
                                pred.risk_level === 'medium' ? 'text-yellow-500' :
                                'text-green-500'
                              }`} />
                              <span className="font-medium">{pred.component}</span>
                              <Badge className={riskColors[pred.risk_level]}>
                                {pred.risk_level}
                              </Badge>
                            </div>
                            <div className="text-sm text-slate-600 space-y-1">
                              <p>Saúde: {pred.health_score}% | Falha: {pred.failure_probability}%</p>
                              <p>Ação: <span className="font-medium">{pred.recommended_action}</span> | Custo: R$ {pred.estimated_cost}</p>
                              <p className="text-xs">Previsão de falha: {pred.predicted_failure_date}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {predictions.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                          <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                          <p>Nenhuma previsão ativa. Execute uma análise!</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* PREÇOS DINÂMICOS */}
          <TabsContent value="pricing">
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Calcular Preço</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Usina</Label>
                    <select
                      value={selectedPlant}
                      onChange={(e) => setSelectedPlant(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg mt-1"
                    >
                      <option value="">Escolha...</option>
                      {plants.map(plant => (
                        <option key={plant.id} value={plant.id}>{plant.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Preço base (R$/kWh)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      placeholder="0.50"
                    />
                  </div>
                  <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => runDynamicPricing.mutate({ plantId: selectedPlant, price: basePrice })}
                    disabled={!selectedPlant || !basePrice || runDynamicPricing.isPending}
                  >
                    {runDynamicPricing.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Calculando...</>
                    ) : (
                      'Calcular Preço Dinâmico'
                    )}
                  </Button>
                </CardContent>
              </Card>

              <div className="lg:col-span-2">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle>Histórico de Preços</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pricing.map(price => (
                        <div key={price.id} className="p-4 bg-slate-50 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{price.date}</span>
                            <Badge className={price.final_adjustment >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {price.final_adjustment > 0 ? '+' : ''}{price.final_adjustment}%
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500">Preço base:</p>
                              <p className="font-semibold">R$ {price.base_price_kwh?.toFixed(4)}/kWh</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Preço dinâmico:</p>
                              <p className="font-semibold text-indigo-600">R$ {price.dynamic_price_kwh?.toFixed(4)}/kWh</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
                            <div>
                              <p className="text-slate-500">Demanda</p>
                              <p className="font-medium">{price.demand_factor?.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Oferta</p>
                              <p className="font-medium">{price.supply_factor?.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Clima</p>
                              <p className="font-medium">{price.weather_factor?.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Mercado</p>
                              <p className="font-medium">{price.market_factor?.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* OTIMIZAÇÃO DE PORTFÓLIO */}
          <TabsContent value="portfolio">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Otimização Automática de Portfólio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Brain className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Análise Inteligente de Portfolio</h3>
                  <p className="text-slate-600 mb-6">
                    A IA analisa performance, ROI e eficiência de todas as usinas para recomendar otimizações
                  </p>
                  <Button 
                    size="lg"
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => runPortfolioOptimization.mutate()}
                    disabled={runPortfolioOptimization.isPending}
                  >
                    {runPortfolioOptimization.isPending ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Otimizando...</>
                    ) : (
                      'Executar Otimização com IA'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CHATBOT */}
          <TabsContent value="chatbot">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Chatbot de Vendas com IA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-600">
                      Teste o chatbot que qualifica leads automaticamente usando IA
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite uma mensagem como cliente..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && chatbotMutation.mutate(chatMessage)}
                    />
                    <Button 
                      onClick={() => chatbotMutation.mutate(chatMessage)}
                      disabled={!chatMessage || chatbotMutation.isPending}
                    >
                      {chatbotMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar'}
                    </Button>
                  </div>
                  <div className="text-xs text-slate-500">
                    Exemplos: "Quanto custa?", "Quero economizar na conta de luz", "Minha conta é R$ 500"
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* OCR */}
          <TabsContent value="ocr">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>OCR de Faturas com IA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl text-center">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 mb-4">
                      Faça upload de uma fatura de luz para extração automática de dados
                    </p>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="invoice-upload"
                    />
                    <label htmlFor="invoice-upload">
                      <Button variant="outline" as="span">
                        Selecionar Arquivo
                      </Button>
                    </label>
                  </div>
                  {invoiceFile && (
                    <Button 
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      onClick={() => ocrMutation.mutate(invoiceFile)}
                      disabled={ocrMutation.isPending}
                    >
                      {ocrMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando com IA...</>
                      ) : (
                        'Extrair Dados da Fatura'
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}