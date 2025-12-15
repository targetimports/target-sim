import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, AlertTriangle, Users, DollarSign, ArrowLeft, Target } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function AdvancedAnalytics() {
  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => base44.entities.Subscription.list()
  });

  const { data: churnPredictions = [] } = useQuery({
    queryKey: ['churn-predictions'],
    queryFn: () => base44.entities.ChurnPrediction.list('-churn_risk_score')
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.FinancialTransaction.list('-transaction_date', 500)
  });

  // Calculate metrics
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
  const totalRevenue = transactions.filter(t => t.transaction_type === 'revenue').reduce((sum, t) => sum + t.amount, 0);
  const avgLTV = churnPredictions.reduce((sum, c) => sum + (c.lifetime_value || 0), 0) / (churnPredictions.length || 1);
  const highRiskChurn = churnPredictions.filter(c => c.risk_level === 'high' || c.risk_level === 'critical').length;

  // Customer segments
  const segments = [
    { name: 'Alto Valor', count: subscriptions.filter(s => s.average_bill_value > 500).length },
    { name: 'Médio Valor', count: subscriptions.filter(s => s.average_bill_value > 200 && s.average_bill_value <= 500).length },
    { name: 'Baixo Valor', count: subscriptions.filter(s => s.average_bill_value <= 200).length }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-amber-400" />
              <div>
                <h1 className="text-2xl font-bold">Analytics Avançado</h1>
                <p className="text-amber-400 text-sm">Insights e previsões inteligentes</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Clientes Ativos</p>
                  <p className="text-2xl font-bold">{activeSubscriptions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">LTV Médio</p>
                  <p className="text-2xl font-bold">R$ {avgLTV.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Receita Total</p>
                  <p className="text-2xl font-bold">R$ {totalRevenue.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Risco de Churn</p>
                  <p className="text-2xl font-bold">{highRiskChurn}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="churn" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1">
            <TabsTrigger value="churn">Previsão de Churn</TabsTrigger>
            <TabsTrigger value="segments">Segmentação</TabsTrigger>
            <TabsTrigger value="ltv">Lifetime Value</TabsTrigger>
          </TabsList>

          <TabsContent value="churn">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Clientes em Risco de Cancelamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {churnPredictions.slice(0, 10).map((prediction) => (
                    <div key={prediction.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">{prediction.customer_email}</p>
                          <p className="text-sm text-slate-500">Score: {prediction.churn_risk_score}/100</p>
                        </div>
                        <Badge className={
                          prediction.risk_level === 'critical' ? 'bg-red-100 text-red-800' :
                          prediction.risk_level === 'high' ? 'bg-orange-100 text-orange-800' :
                          prediction.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }>
                          {prediction.risk_level === 'critical' ? 'Crítico' :
                           prediction.risk_level === 'high' ? 'Alto' :
                           prediction.risk_level === 'medium' ? 'Médio' : 'Baixo'}
                        </Badge>
                      </div>

                      {prediction.factors && prediction.factors.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-slate-500 mb-2">Fatores de Risco:</p>
                          <div className="flex flex-wrap gap-2">
                            {prediction.factors.map((factor, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">{factor}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {prediction.recommended_actions && prediction.recommended_actions.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-500 mb-2">Ações Recomendadas:</p>
                          <ul className="list-disc list-inside text-sm text-slate-600">
                            {prediction.recommended_actions.map((action, idx) => (
                              <li key={idx}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}

                  {churnPredictions.length === 0 && (
                    <div className="text-center py-12">
                      <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">Nenhuma previsão disponível</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="segments">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Segmentação de Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={segments}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>

                <div className="grid sm:grid-cols-3 gap-4 mt-6">
                  {segments.map((segment) => (
                    <div key={segment.name} className="p-4 bg-slate-50 rounded-xl text-center">
                      <p className="text-sm text-slate-500 mb-1">{segment.name}</p>
                      <p className="text-2xl font-bold">{segment.count}</p>
                      <p className="text-xs text-slate-400">clientes</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ltv">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Análise de Lifetime Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                    <p className="text-sm text-green-600 mb-2">LTV Médio</p>
                    <p className="text-4xl font-bold text-green-700">R$ {avgLTV.toFixed(2)}</p>
                    <p className="text-xs text-green-600 mt-2">Por cliente ativo</p>
                  </div>

                  <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl">
                    <p className="text-sm text-blue-600 mb-2">LTV Total</p>
                    <p className="text-4xl font-bold text-blue-700">
                      R$ {(avgLTV * activeSubscriptions).toFixed(0)}
                    </p>
                    <p className="text-xs text-blue-600 mt-2">Valor total estimado</p>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="font-semibold mb-4">Top 10 Clientes por LTV</h3>
                  <div className="space-y-3">
                    {churnPredictions
                      .sort((a, b) => (b.lifetime_value || 0) - (a.lifetime_value || 0))
                      .slice(0, 10)
                      .map((pred) => (
                        <div key={pred.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm font-medium">{pred.customer_email}</span>
                          <span className="text-sm font-bold text-green-600">
                            R$ {(pred.lifetime_value || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}