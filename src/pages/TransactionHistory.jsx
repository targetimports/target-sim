import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Download, Search, Filter, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";

export default function TransactionHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const { data: transactions = [] } = useQuery({
    queryKey: ['credit-transactions'],
    queryFn: () => base44.entities.CreditTransaction.list('-created_date', 500)
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions-history'],
    queryFn: () => base44.entities.Subscription.list()
  });

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || tx.transaction_type === filterType;
    const matchesMonth = !selectedMonth || tx.month_reference === selectedMonth;
    return matchesSearch && matchesType && matchesMonth;
  });

  const typeConfig = {
    allocation: { label: 'Alocação', color: 'bg-green-100 text-green-800', icon: '📥' },
    consumption: { label: 'Consumo', color: 'bg-blue-100 text-blue-800', icon: '⚡' },
    adjustment: { label: 'Ajuste', color: 'bg-purple-100 text-purple-800', icon: '✏️' },
    expiration: { label: 'Expiração', color: 'bg-red-100 text-red-800', icon: '⏰' },
    compensation: { label: 'Compensação', color: 'bg-amber-100 text-amber-800', icon: '⚖️' }
  };

  const totalByType = Object.keys(typeConfig).reduce((acc, type) => {
    acc[type] = transactions.filter(t => t.transaction_type === type).length;
    return acc;
  }, {});

  const exportToCSV = () => {
    const headers = ['Data', 'Cliente', 'Tipo', 'Quantidade (kWh)', 'Saldo Antes', 'Saldo Depois', 'Descrição'];
    const rows = filteredTransactions.map(tx => [
      format(new Date(tx.created_date), 'dd/MM/yyyy HH:mm'),
      tx.customer_email,
      typeConfig[tx.transaction_type]?.label || tx.transaction_type,
      tx.amount_kwh,
      tx.balance_before,
      tx.balance_after,
      tx.description
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historico-transacoes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-slate-700 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">📜 Histórico de Transações</h1>
                <p className="text-slate-300 text-sm">Rastreamento completo de cada kWh</p>
              </div>
            </div>
            <Button onClick={exportToCSV} variant="outline" className="border-white/30 text-white hover:bg-white/20">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          {Object.entries(typeConfig).map(([key, config]) => (
            <Card key={key}>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl mb-2">{config.icon}</div>
                  <p className="text-sm text-slate-500 mb-1">{config.label}</p>
                  <p className="text-2xl font-bold">{totalByType[key]}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por cliente ou descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tipo de transação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {Object.entries(typeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.icon} {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-48"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transações ({filteredTransactions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredTransactions.map((tx) => {
                const config = typeConfig[tx.transaction_type] || {};
                const subscription = subscriptions.find(s => s.customer_email === tx.customer_email);
                return (
                  <div key={tx.id} className="p-4 bg-slate-50 rounded-lg border hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={config.color}>
                            {config.icon} {config.label}
                          </Badge>
                          <span className="text-sm text-slate-500">
                            {format(new Date(tx.created_date), 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                        <p className="font-medium text-slate-900 mb-1">
                          {subscription?.customer_name || tx.customer_email}
                        </p>
                        <p className="text-sm text-slate-600 mb-2">{tx.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className={tx.amount_kwh >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {tx.amount_kwh >= 0 ? '+' : ''}{tx.amount_kwh.toFixed(2)} kWh
                          </span>
                          <span className="text-slate-500">
                            Saldo: {tx.balance_before?.toFixed(2)} → {tx.balance_after?.toFixed(2)} kWh
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredTransactions.length === 0 && (
                <div className="text-center py-12">
                  <History className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhuma transação encontrada</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}