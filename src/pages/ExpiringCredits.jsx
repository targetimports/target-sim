import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, Zap, ArrowLeft, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";

export default function ExpiringCredits() {
  const [filterDays, setFilterDays] = useState('all');

  const { data: balances = [] } = useQuery({
    queryKey: ['credit-balances-expiring'],
    queryFn: () => base44.entities.CreditBalance.list()
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions-expiring'],
    queryFn: () => base44.entities.Subscription.list()
  });

  const now = new Date();
  
  const expiringBalances = balances
    .filter(b => b.expiration_date && b.balance_kwh > 0)
    .map(b => {
      const daysToExpire = differenceInDays(new Date(b.expiration_date), now);
      const subscription = subscriptions.find(s => s.id === b.subscription_id);
      return { ...b, daysToExpire, subscription };
    })
    .filter(b => {
      if (filterDays === 'all') return true;
      if (filterDays === '15') return b.daysToExpire <= 15;
      if (filterDays === '30') return b.daysToExpire <= 30;
      if (filterDays === '60') return b.daysToExpire <= 60;
      if (filterDays === 'expired') return b.daysToExpire < 0;
      return true;
    })
    .sort((a, b) => a.daysToExpire - b.daysToExpire);

  const expiredCredits = expiringBalances.filter(b => b.daysToExpire < 0);
  const expiring15Days = expiringBalances.filter(b => b.daysToExpire >= 0 && b.daysToExpire <= 15);
  const expiring30Days = expiringBalances.filter(b => b.daysToExpire > 15 && b.daysToExpire <= 30);
  const expiring60Days = expiringBalances.filter(b => b.daysToExpire > 30 && b.daysToExpire <= 60);

  const totalExpiringKwh = expiringBalances.reduce((sum, b) => sum + (b.balance_kwh || 0), 0);
  const totalExpiredKwh = expiredCredits.reduce((sum, b) => sum + (b.balance_kwh || 0), 0);

  const getUrgencyColor = (days) => {
    if (days < 0) return 'bg-slate-100 text-slate-800';
    if (days <= 15) return 'bg-red-100 text-red-800';
    if (days <= 30) return 'bg-orange-100 text-orange-800';
    if (days <= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">⏰ Gestão de Créditos Expirados</h1>
              <p className="text-orange-100 text-sm">Monitoramento e alertas de expiração</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-200 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-700" />
                </div>
                <div>
                  <p className="text-sm text-red-600">Expirando 15 dias</p>
                  <p className="text-2xl font-bold text-red-700">{expiring15Days.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-200 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-orange-700" />
                </div>
                <div>
                  <p className="text-sm text-orange-600">Expirando 30 dias</p>
                  <p className="text-2xl font-bold text-orange-700">{expiring30Days.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-200 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-700" />
                </div>
                <div>
                  <p className="text-sm text-yellow-600">Expirando 60 dias</p>
                  <p className="text-2xl font-bold text-yellow-700">{expiring60Days.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-slate-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-slate-700" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Já Expirados</p>
                  <p className="text-2xl font-bold text-slate-700">{expiredCredits.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Créditos com Risco de Expiração</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={filterDays === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterDays('all')}
                >
                  Todos
                </Button>
                <Button
                  variant={filterDays === '15' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterDays('15')}
                  className={filterDays === '15' ? 'bg-red-600' : ''}
                >
                  15 dias
                </Button>
                <Button
                  variant={filterDays === '30' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterDays('30')}
                  className={filterDays === '30' ? 'bg-orange-600' : ''}
                >
                  30 dias
                </Button>
                <Button
                  variant={filterDays === '60' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterDays('60')}
                  className={filterDays === '60' ? 'bg-yellow-600' : ''}
                >
                  60 dias
                </Button>
                <Button
                  variant={filterDays === 'expired' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterDays('expired')}
                  className={filterDays === 'expired' ? 'bg-slate-600' : ''}
                >
                  Expirados
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiringBalances.map((balance) => (
                <div key={balance.id} className="p-4 bg-white rounded-xl border shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getUrgencyColor(balance.daysToExpire)}>
                          {balance.daysToExpire < 0 
                            ? `Expirado há ${Math.abs(balance.daysToExpire)} dias`
                            : `Expira em ${balance.daysToExpire} dias`
                          }
                        </Badge>
                        <span className="font-bold text-lg">{balance.balance_kwh.toFixed(2)} kWh</span>
                      </div>
                      <p className="text-sm text-slate-700 mb-1">
                        <strong>Cliente:</strong> {balance.subscription?.customer_name || balance.customer_email}
                      </p>
                      <p className="text-sm text-slate-600">
                        <strong>Email:</strong> {balance.customer_email}
                      </p>
                      <p className="text-sm text-slate-600">
                        <strong>Data de Expiração:</strong> {format(new Date(balance.expiration_date), 'dd/MM/yyyy')}
                      </p>
                      <p className="text-sm text-slate-500 mt-2">
                        Acumulado: {balance.accumulated_kwh?.toFixed(2)} kWh | Consumido: {balance.consumed_kwh?.toFixed(2)} kWh
                      </p>
                    </div>
                    {balance.daysToExpire <= 15 && balance.daysToExpire >= 0 && (
                      <AlertCircle className="w-6 h-6 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
              {expiringBalances.length === 0 && (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhum crédito expirando no período selecionado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo de Perdas por Expiração</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700 mb-1">Total de kWh em risco (próximos 60 dias)</p>
                <p className="text-3xl font-bold text-red-800">{totalExpiringKwh.toFixed(2)} kWh</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-700 mb-1">Total de kWh já expirados</p>
                <p className="text-3xl font-bold text-slate-800">{totalExpiredKwh.toFixed(2)} kWh</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}