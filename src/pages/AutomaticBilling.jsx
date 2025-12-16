import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, FileText, Calendar, AlertCircle, Play, ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from 'sonner';

export default function AutomaticBilling() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [processing, setProcessing] = useState(false);

  const { data: allocations = [] } = useQuery({
    queryKey: ['energy-allocations', selectedMonth],
    queryFn: () => base44.entities.EnergyAllocation.filter({ month_reference: selectedMonth })
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['monthly-invoices', selectedMonth],
    queryFn: () => base44.entities.MonthlyInvoice.filter({ month_reference: selectedMonth })
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions-billing'],
    queryFn: () => base44.entities.Subscription.filter({ status: 'active' })
  });

  const generateInvoicesMutation = useMutation({
    mutationFn: async () => {
      setProcessing(true);
      const newInvoices = [];
      
      for (const allocation of allocations) {
        const existingInvoice = invoices.find(inv => 
          inv.customer_email === allocation.customer_email && 
          inv.month_reference === selectedMonth
        );
        
        if (!existingInvoice) {
          const subscription = subscriptions.find(s => s.id === allocation.subscription_id);
          const discountPercentage = subscription?.discount_percentage || 15;
          const originalAmount = allocation.allocated_kwh * 0.50; // R$ 0,50/kWh exemplo
          const discountAmount = originalAmount * (discountPercentage / 100);
          const finalAmount = originalAmount - discountAmount;
          
          const invoice = await base44.entities.MonthlyInvoice.create({
            customer_email: allocation.customer_email,
            subscription_id: allocation.subscription_id,
            month_reference: selectedMonth,
            energy_allocated_kwh: allocation.allocated_kwh,
            discount_percentage: discountPercentage,
            original_amount: originalAmount,
            discount_amount: discountAmount,
            final_amount: finalAmount,
            status: 'pending',
            due_date: format(new Date(selectedMonth + '-20'), 'yyyy-MM-dd')
          });
          newInvoices.push(invoice);
        }
      }
      
      return newInvoices;
    },
    onSuccess: (newInvoices) => {
      setProcessing(false);
      queryClient.invalidateQueries(['monthly-invoices']);
      toast.success(`${newInvoices.length} faturas geradas com sucesso!`);
    },
    onError: () => {
      setProcessing(false);
      toast.error('Erro ao gerar faturas');
    }
  });

  const totalPending = invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.final_amount, 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.final_amount, 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.final_amount, 0);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-slate-100 text-slate-800'
  };

  const statusLabels = {
    pending: 'Pendente',
    paid: 'Pago',
    overdue: 'Vencido',
    cancelled: 'Cancelado'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-blue-900 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">💳 Faturamento Automático</h1>
              <p className="text-blue-200 text-sm">Geração automática de faturas mensais</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Faturas</p>
                  <p className="text-2xl font-bold">{invoices.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pendente</p>
                  <p className="text-2xl font-bold text-yellow-600">R$ {totalPending.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pago</p>
                  <p className="text-2xl font-bold text-green-600">R$ {totalPaid.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Vencido</p>
                  <p className="text-2xl font-bold text-red-600">R$ {totalOverdue.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Gerar Faturas do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Mês de Referência</label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
              <Button
                onClick={() => generateInvoicesMutation.mutate()}
                disabled={processing || allocations.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Play className="w-4 h-4 mr-2" />
                {processing ? 'Gerando...' : 'Gerar Faturas'}
              </Button>
            </div>
            {allocations.length === 0 && (
              <p className="text-sm text-amber-600 mt-2">
                ⚠️ Nenhuma alocação encontrada para este mês. Execute o rateio de energia primeiro.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Faturas de {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Cliente</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Energia (kWh)</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Valor Original</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Desconto</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Valor Final</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Vencimento</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm">{invoice.customer_email}</td>
                      <td className="py-3 px-4 text-sm font-medium">{invoice.energy_allocated_kwh?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-sm">R$ {invoice.original_amount?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-sm text-green-600">-{invoice.discount_percentage}%</td>
                      <td className="py-3 px-4 text-sm font-bold">R$ {invoice.final_amount?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-sm">{invoice.due_date && format(new Date(invoice.due_date), 'dd/MM/yyyy')}</td>
                      <td className="py-3 px-4">
                        <Badge className={statusColors[invoice.status]}>
                          {statusLabels[invoice.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {invoices.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhuma fatura gerada para este mês</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}