import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Upload, CheckCircle, ArrowLeft, Eye } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function UtilityBillManager() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const { data: bills = [] } = useQuery({
    queryKey: ['utility-bills', selectedMonth],
    queryFn: () => base44.entities.UtilityBill.filter({ month_reference: selectedMonth })
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions-bills'],
    queryFn: () => base44.entities.Subscription.list()
  });

  const handleFileUpload = async (e, customerEmail, subscriptionId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadRes.file_url;

      const ocrRes = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: {
          type: 'object',
          properties: {
            consumption_kwh: { type: 'number' },
            amount_charged: { type: 'number' },
            due_date: { type: 'string' },
            installation_number: { type: 'string' },
            distributor: { type: 'string' }
          }
        }
      });

      await base44.entities.UtilityBill.create({
        customer_email: customerEmail,
        subscription_id: subscriptionId,
        month_reference: selectedMonth,
        file_url: fileUrl,
        ...ocrRes.output,
        extracted_data: ocrRes.output,
        ocr_processed: ocrRes.status === 'success'
      });

      queryClient.invalidateQueries(['utility-bills']);
      toast.success('Conta de luz enviada e processada!');
    } catch (error) {
      toast.error('Erro ao processar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const totalBills = bills.length;
  const processedBills = bills.filter(b => b.ocr_processed).length;
  const totalConsumption = bills.reduce((sum, b) => sum + (b.consumption_kwh || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Gestão de Contas de Luz</h1>
                <p className="text-blue-100 text-sm">Upload e OCR automático</p>
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
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Contas do Mês</p>
                  <p className="text-2xl font-bold">{totalBills}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Processadas (OCR)</p>
                  <p className="text-2xl font-bold">{processedBills}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Consumo Total</p>
                  <p className="text-2xl font-bold">{totalConsumption.toLocaleString()} kWh</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upload de Contas</CardTitle>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subscriptions.filter(s => s.status === 'active').map((sub) => {
                const hasBill = bills.find(b => b.subscription_id === sub.id);
                return (
                  <div key={sub.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <p className="font-semibold">{sub.customer_name}</p>
                      <p className="text-sm text-slate-500">{sub.customer_email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {hasBill ? (
                        <>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Enviada
                          </Badge>
                          <a href={hasBill.file_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-2" />
                              Ver
                            </Button>
                          </a>
                        </>
                      ) : (
                        <>
                          <input
                            type="file"
                            id={`file-${sub.id}`}
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload(e, sub.customer_email, sub.id)}
                            disabled={uploading}
                          />
                          <label htmlFor={`file-${sub.id}`}>
                            <Button asChild variant="outline" size="sm" disabled={uploading}>
                              <span>
                                <Upload className="w-4 h-4 mr-2" />
                                {uploading ? 'Processando...' : 'Upload'}
                              </span>
                            </Button>
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contas Enviadas ({selectedMonth})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bills.map((bill) => {
                const subscription = subscriptions.find(s => s.id === bill.subscription_id);
                return (
                  <div key={bill.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold">{subscription?.customer_name}</p>
                        <p className="text-sm text-slate-500">{bill.customer_email}</p>
                      </div>
                      <a href={bill.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Arquivo
                        </Button>
                      </a>
                    </div>

                    {bill.ocr_processed && (
                      <div className="grid grid-cols-4 gap-3">
                        <div className="p-2 bg-white rounded">
                          <p className="text-xs text-slate-500">Consumo</p>
                          <p className="font-semibold">{bill.consumption_kwh} kWh</p>
                        </div>
                        <div className="p-2 bg-white rounded">
                          <p className="text-xs text-slate-500">Valor</p>
                          <p className="font-semibold">R$ {bill.amount_charged?.toFixed(2)}</p>
                        </div>
                        <div className="p-2 bg-white rounded">
                          <p className="text-xs text-slate-500">Distribuidora</p>
                          <p className="font-semibold text-sm">{bill.distributor}</p>
                        </div>
                        <div className="p-2 bg-white rounded">
                          <p className="text-xs text-slate-500">Instalação</p>
                          <p className="font-semibold text-sm">{bill.installation_number}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {bills.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhuma conta enviada neste mês</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}