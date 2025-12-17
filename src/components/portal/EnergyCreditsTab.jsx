import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function EnergyCreditsTab({ subscription, userEmail }) {
  const { data: creditBalances = [] } = useQuery({
    queryKey: ['my-credits', userEmail],
    queryFn: () => base44.entities.CreditBalance.filter({ customer_email: userEmail }),
    enabled: !!userEmail
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['my-transactions', userEmail],
    queryFn: () => base44.entities.CreditTransaction.filter({ customer_email: userEmail }),
    enabled: !!userEmail
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['my-allocations', subscription?.id],
    queryFn: () => base44.entities.EnergyAllocation.filter({ subscription_id: subscription?.id }),
    enabled: !!subscription?.id
  });

  const currentBalance = creditBalances[0];
  const recentTransactions = transactions.slice(0, 10);
  
  // Preparar dados para o gráfico
  const chartData = transactions
    .slice(0, 6)
    .reverse()
    .map(t => ({
      date: format(new Date(t.created_date), 'dd/MM'),
      balance: t.balance_after
    }));

  return (
    <div className="grid gap-6">
      {/* Saldo Atual */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-600">Saldo de Créditos</p>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-green-600">
              {currentBalance?.balance_kwh?.toFixed(0) || 0} kWh
            </p>
            {currentBalance?.expiration_date && (
              <p className="text-xs text-slate-500 mt-2">
                Expira em {format(new Date(currentBalance.expiration_date), 'dd/MM/yyyy')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-600">Total Acumulado</p>
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">
              {currentBalance?.accumulated_kwh?.toFixed(0) || 0} kWh
            </p>
            <p className="text-xs text-slate-500 mt-2">Desde o início</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-600">Total Consumido</p>
              <TrendingDown className="w-6 h-6 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-orange-600">
              {currentBalance?.consumed_kwh?.toFixed(0) || 0} kWh
            </p>
            <p className="text-xs text-slate-500 mt-2">Uso histórico</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evolução do Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Saldo (kWh)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Alocações Recentes */}
      {allocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Alocações de Energia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allocations.slice(0, 5).map((allocation) => (
                <div key={allocation.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">{allocation.month_reference}</p>
                    <p className="text-sm text-slate-500">
                      {format(new Date(allocation.created_date), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      +{allocation.allocated_kwh?.toFixed(0)} kWh
                    </p>
                    <Badge className="bg-green-100 text-green-800">
                      {allocation.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Transações */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 border-b last:border-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {transaction.transaction_type}
                    </Badge>
                    {transaction.month_reference && (
                      <span className="text-xs text-slate-500">{transaction.month_reference}</span>
                    )}
                  </div>
                  {transaction.description && (
                    <p className="text-sm text-slate-600 mt-1">{transaction.description}</p>
                  )}
                  <p className="text-xs text-slate-400">
                    {format(new Date(transaction.created_date), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    transaction.transaction_type === 'allocation' || transaction.transaction_type === 'compensation'
                      ? 'text-green-600' 
                      : 'text-orange-600'
                  }`}>
                    {transaction.transaction_type === 'allocation' || transaction.transaction_type === 'compensation' ? '+' : '-'}
                    {transaction.amount_kwh?.toFixed(0)} kWh
                  </p>
                  <p className="text-xs text-slate-500">
                    Saldo: {transaction.balance_after?.toFixed(0)} kWh
                  </p>
                </div>
              </div>
            ))}

            {recentTransactions.length === 0 && (
              <div className="text-center py-8">
                <p className="text-slate-500">Nenhuma transação encontrada</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}