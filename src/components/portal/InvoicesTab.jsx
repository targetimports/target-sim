import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

export default function InvoicesTab({ userEmail }) {
  const { data: invoices = [] } = useQuery({
    queryKey: ['my-invoices', userEmail],
    queryFn: () => base44.entities.MonthlyInvoice.filter({ customer_email: userEmail }),
    enabled: !!userEmail
  });

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-slate-100 text-slate-800'
  };

  const statusIcons = {
    pending: Clock,
    paid: CheckCircle,
    overdue: AlertCircle,
    cancelled: AlertCircle
  };

  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + (i.final_amount || 0), 0);

  const totalPending = invoices
    .filter(i => i.status === 'pending')
    .reduce((sum, i) => sum + (i.final_amount || 0), 0);

  return (
    <div className="grid gap-6">
      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-600">Total Pago</p>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">
              R$ {totalPaid.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-600">Total Pendente</p>
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <p className="text-3xl font-bold text-yellow-600">
              R$ {totalPending.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-600">Total de Faturas</p>
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">
              {invoices.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Faturas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invoices.map((invoice) => {
              const StatusIcon = statusIcons[invoice.status];
              
              return (
                <div key={invoice.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-slate-50 transition">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <StatusIcon className="w-5 h-5 text-slate-500" />
                      <div>
                        <p className="font-semibold">Fatura {invoice.month_reference}</p>
                        <p className="text-sm text-slate-500">
                          Criada em {format(new Date(invoice.created_date), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                      {invoice.energy_allocated_kwh && (
                        <div>
                          <p className="text-slate-500">Energia Alocada</p>
                          <p className="font-medium">{invoice.energy_allocated_kwh.toFixed(0)} kWh</p>
                        </div>
                      )}
                      {invoice.original_amount && (
                        <div>
                          <p className="text-slate-500">Valor Original</p>
                          <p className="font-medium">R$ {invoice.original_amount.toFixed(2)}</p>
                        </div>
                      )}
                      {invoice.discount_amount && (
                        <div>
                          <p className="text-slate-500">Desconto</p>
                          <p className="font-medium text-green-600">-R$ {invoice.discount_amount.toFixed(2)}</p>
                        </div>
                      )}
                      {invoice.due_date && (
                        <div>
                          <p className="text-slate-500">Vencimento</p>
                          <p className="font-medium">{format(new Date(invoice.due_date), 'dd/MM/yyyy')}</p>
                        </div>
                      )}
                    </div>

                    {invoice.payment_date && (
                      <p className="text-xs text-green-600 mt-2">
                        Pago em {format(new Date(invoice.payment_date), 'dd/MM/yyyy')}
                        {invoice.payment_method && ` via ${invoice.payment_method}`}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">
                        R$ {invoice.final_amount?.toFixed(2)}
                      </p>
                      {invoice.discount_percentage && (
                        <p className="text-xs text-green-600">
                          {invoice.discount_percentage}% desconto
                        </p>
                      )}
                    </div>
                    <Badge className={statusColors[invoice.status]}>
                      {invoice.status === 'pending' ? 'Pendente' :
                       invoice.status === 'paid' ? 'Pago' :
                       invoice.status === 'overdue' ? 'Vencido' : 'Cancelado'}
                    </Badge>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Baixar
                    </Button>
                  </div>
                </div>
              );
            })}

            {invoices.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nenhuma fatura encontrada</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}