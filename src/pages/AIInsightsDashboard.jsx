import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, TrendingUp, Target, Zap, AlertTriangle, ArrowLeft, Sparkles, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AIInsightsDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('sales');

  const { data: salesInsights, refetch: refetchSales, isLoading: loadingSales } = useQuery({
    queryKey: ['ai-sales-insights'],
    queryFn: () => base44.functions.invoke('aiInsights', {
      analysis_type: 'sales_trends',
      data: {}
    }),
    staleTime: 30 * 60 * 1000 // 30 minutos
  });

  const { data: leadScoring, refetch: refetchLeads, isLoading: loadingLeads } = useQuery({
    queryKey: ['ai-lead-scoring'],
    queryFn: () => base44.functions.invoke('aiInsights', {
      analysis_type: 'lead_scoring',
      data: {}
    }),
    staleTime: 30 * 60 * 1000
  });

  const { data: automationOptimization, refetch: refetchAutomation, isLoading: loadingAutomation } = useQuery({
    queryKey: ['ai-automation-optimization'],
    queryFn: () => base44.functions.invoke('aiInsights', {
      analysis_type: 'automation_optimization',
      data: {}
    }),
    staleTime: 30 * 60 * 1000
  });

  const { data: financialAnomalies, refetch: refetchFinancial, isLoading: loadingFinancial } = useQuery({
    queryKey: ['ai-financial-anomalies'],
    queryFn: () => base44.functions.invoke('aiInsights', {
      analysis_type: 'financial_anomalies',
      data: {}
    }),
    staleTime: 30 * 60 * 1000
  });

  const refreshAll = async () => {
    toast.promise(
      Promise.all([
        refetchSales(),
        refetchLeads(),
        refetchAutomation(),
        refetchFinancial()
      ]),
      {
        loading: 'Atualizando insights...',
        success: 'Insights atualizados!',
        error: 'Erro ao atualizar'
      }
    );
  };

  const sales = salesInsights?.data;
  const leads = leadScoring?.data;
  const automation = automationOptimization?.data;
  const financial = financialAnomalies?.data;

  const forecastData = sales?.forecast ? [
    { month: 'Mês 1', value: sales.forecast.next_month },
    { month: 'Mês 2', value: sales.forecast.second_month },
    { month: 'Mês 3', value: sales.forecast.third_month }
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
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
                  <h1 className="text-2xl font-bold">Dashboard de IA</h1>
                  <p className="text-sm text-white/80">Insights inteligentes e preditivos</p>
                </div>
              </div>
            </div>
            <Button
              onClick={refreshAll}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/20"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-slate-200 p-1 mb-6">
            <TabsTrigger value="sales" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-2" />
              Vendas
            </TabsTrigger>
            <TabsTrigger value="leads" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Target className="w-4 h-4 mr-2" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="automation" className="data-[state=active]:bg-pink-600 data-[state=active]:text-white">
              <Zap className="w-4 h-4 mr-2" />
              Automação
            </TabsTrigger>
            <TabsTrigger value="financial" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Financeiro
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sales">
            {loadingSales ? (
              <Card><CardContent className="p-12 text-center">Analisando dados...</CardContent></Card>
            ) : (
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                    <CardContent className="p-6">
                      <Sparkles className="w-8 h-8 mb-2" />
                      <p className="text-sm opacity-90">Previsão Mês 1</p>
                      <p className="text-3xl font-bold">{sales?.forecast?.next_month || 0}</p>
                      <p className="text-xs mt-1">conversões esperadas</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                    <CardContent className="p-6">
                      <Sparkles className="w-8 h-8 mb-2" />
                      <p className="text-sm opacity-90">Previsão Mês 2</p>
                      <p className="text-3xl font-bold">{sales?.forecast?.second_month || 0}</p>
                      <p className="text-xs mt-1">conversões esperadas</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-pink-500 to-red-500 text-white">
                    <CardContent className="p-6">
                      <Sparkles className="w-8 h-8 mb-2" />
                      <p className="text-sm opacity-90">Previsão Mês 3</p>
                      <p className="text-3xl font-bold">{sales?.forecast?.third_month || 0}</p>
                      <p className="text-xs mt-1">conversões esperadas</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>📈 Previsão de Conversões</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={forecastData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>🎯 Tendências Identificadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {sales?.trends?.map((trend, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Badge className="mt-1">{i + 1}</Badge>
                          <span>{trend}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>💡 Recomendações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {sales?.recommendations?.map((rec, i) => (
                        <div key={i} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <p className="font-medium text-green-900">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>🏆 Melhores Canais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {sales?.best_channels?.map((channel, i) => (
                        <Badge key={i} variant="outline" className="text-base py-2 px-4">
                          {channel}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="leads">
            {loadingLeads ? (
              <Card><CardContent className="p-12 text-center">Analisando leads...</CardContent></Card>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>🎯 Leads Pontuados pela IA</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {leads?.scored_leads?.slice(0, 10).map((lead) => (
                        <div key={lead.lead_id} className="p-4 border border-slate-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold">Lead ID: {lead.lead_id}</span>
                            <div className="flex items-center gap-2">
                              <Badge className={
                                lead.ai_score >= 80 ? 'bg-green-600' :
                                lead.ai_score >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                              }>
                                Score: {lead.ai_score}
                              </Badge>
                              <Badge variant="outline">
                                {lead.conversion_probability}% conversão
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 mb-3">{lead.reason}</p>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-slate-700">Ações recomendadas:</p>
                            {lead.recommended_actions?.map((action, i) => (
                              <p key={i} className="text-xs text-slate-600">• {action}</p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="automation">
            {loadingAutomation ? (
              <Card><CardContent className="p-12 text-center">Analisando automações...</CardContent></Card>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>💡 Insights Gerais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {automation?.insights?.map((insight, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Badge className="mt-1">{i + 1}</Badge>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>🔧 Otimizações Sugeridas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {automation?.optimization_suggestions?.map((opt, i) => (
                        <div key={i} className="p-4 border-l-4 border-orange-500 bg-orange-50 rounded-r-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold">{opt.rule_name}</span>
                            <Badge className={
                              opt.priority === 'high' ? 'bg-red-600' :
                              opt.priority === 'medium' ? 'bg-yellow-600' : 'bg-blue-600'
                            }>
                              {opt.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-orange-900 mb-2">
                            <strong>Problema:</strong> {opt.issue}
                          </p>
                          <p className="text-sm text-orange-900">
                            <strong>Sugestão:</strong> {opt.suggestion}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>✨ Ideias de Novas Regras</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {automation?.new_rule_ideas?.map((idea, i) => (
                        <div key={i} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p>{idea}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="financial">
            {loadingFinancial ? (
              <Card><CardContent className="p-12 text-center">Analisando finanças...</CardContent></Card>
            ) : (
              <div className="space-y-6">
                <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                  <CardContent className="p-6 text-center">
                    <p className="text-sm opacity-90 mb-2">Score de Saúde Financeira</p>
                    <p className="text-6xl font-bold">{financial?.financial_health_score || 0}</p>
                    <p className="text-sm mt-2">de 100 pontos</p>
                  </CardContent>
                </Card>

                {financial?.alerts && financial.alerts.length > 0 && (
                  <Card className="border-red-500 bg-red-50">
                    <CardHeader>
                      <CardTitle className="text-red-900">⚠️ Alertas Importantes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {financial.alerts.map((alert, i) => (
                          <li key={i} className="text-red-900">{alert}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>🔍 Anomalias Detectadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {financial?.anomalies?.map((anomaly, i) => (
                        <div key={i} className={`p-4 border-l-4 rounded-r-lg ${
                          anomaly.severity === 'high' ? 'border-red-500 bg-red-50' :
                          anomaly.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                          'border-blue-500 bg-blue-50'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold">{anomaly.type}</span>
                            <Badge className={
                              anomaly.severity === 'high' ? 'bg-red-600' :
                              anomaly.severity === 'medium' ? 'bg-yellow-600' : 'bg-blue-600'
                            }>
                              {anomaly.severity}
                            </Badge>
                          </div>
                          <p className="text-sm mb-2">{anomaly.description}</p>
                          <p className="text-sm font-semibold">Ação recomendada:</p>
                          <p className="text-sm">{anomaly.recommended_action}</p>
                          {anomaly.affected_entities?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-semibold">Entidades afetadas:</p>
                              <p className="text-xs">{anomaly.affected_entities.join(', ')}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}