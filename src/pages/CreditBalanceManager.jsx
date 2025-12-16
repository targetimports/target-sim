import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Wallet, TrendingUp, Clock, ArrowLeft, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format, addMonths } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CreditBalanceManager() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: balances = [] } = useQuery({
    queryKey: ['credit-balances'],
    queryFn: () => base44.entities.CreditBalance.list('-last_update', 200)
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions-credits'],
    queryFn: () => base44.entities.Subscription.list()
  });

  const filteredBalances = balances.filter(b => 
    b.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedBalances = filteredBalances.reduce((acc, balance) => {
    if (!acc[balance.customer_email]) {
      acc[balance.customer_email] = [];
    }
    acc[balance.customer_email].push(balance);
    return acc;
  }, {});

  const totalCredits = balances.reduce((sum, b) => sum + (b.balance_kwh || 0), 0);
  const totalAccumulated = balances.reduce((sum, b) => sum + (b.accumulated_kwh || 0), 0);
  const expiringSoon = balances.filter(b => {
    if (!b.expiration_date) return false;
    const monthsUntilExpiry = Math.ceil((new Date(b.expiration_date) - new Date()) / (1000 * 60 * 60 * 24 * 30));
    return monthsUntilExpiry <= 6 && monthsUntilExpiry > 0;
  }).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Gestão de Saldo de Créditos</h1>
                <p className="text-emerald-100 text-sm">Controle de créditos de energia por cliente</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Créditos Ativos</p>
                  <p className="text-2xl font-bold">{totalCredits.toLocaleString()} kWh</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Acumulado</p>
                  <p className="text-2xl font-bold">{totalAccumulated.toLocaleString()} kWh</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Expirando em 6 meses</p>
                  <p className="text-2xl font-bold">{expiringSoon}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Saldos por Cliente</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(groupedBalances).map(([email, customerBalances]) => {
                const subscription = subscriptions.find(s => s.customer_email === email);
                const totalBalance = customerBalances.reduce((sum, b) => sum + (b.balance_kwh || 0), 0);
                const totalAccumulated = customerBalances.reduce((sum, b) => sum + (b.accumulated_kwh || 0), 0);
                const totalConsumed = customerBalances.reduce((sum, b) => sum + (b.consumed_kwh || 0), 0);

                return (
                  <Card key={email} className="border border-slate-200">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{subscription?.customer_name || email}</h3>
                          <p className="text-sm text-slate-500">{email}</p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-800">
                          {totalBalance.toFixed(2)} kWh disponíveis
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs text-blue-600 mb-1">Acumulado Total</p>
                          <p className="text-lg font-bold text-blue-700">{totalAccumulated.toFixed(0)} kWh</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <p className="text-xs text-purple-600 mb-1">Consumido</p>
                          <p className="text-lg font-bold text-purple-700">{totalConsumed.toFixed(0)} kWh</p>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-lg">
                          <p className="text-xs text-emerald-600 mb-1">Saldo Atual</p>
                          <p className="text-lg font-bold text-emerald-700">{totalBalance.toFixed(0)} kWh</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {customerBalances.slice(0, 3).map(balance => (
                          <div key={balance.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                            <span className="text-slate-600">{balance.month_reference}</span>
                            <span className="font-medium">{balance.balance_kwh?.toFixed(2)} kWh</span>
                            {balance.expiration_date && (
                              <span className="text-xs text-slate-500">
                                Expira: {format(new Date(balance.expiration_date), 'MM/yyyy')}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {Object.keys(groupedBalances).length === 0 && (
                <div className="text-center py-12">
                  <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhum crédito registrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}