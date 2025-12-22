import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, ArrowLeft, CheckCircle, AlertCircle, Loader2, Eye } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function UtilityBillProcessor() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedSubscription, setSelectedSubscription] = useState('');
  const [viewData, setViewData] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => base44.entities.Subscription.list()
  });

  const { data: processedBills = [] } = useQuery({
    queryKey: ['utility-bills'],
    queryFn: () => base44.entities.UtilityBill.list('-created_date', 50)
  });

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      toast.error('Selecione um arquivo PDF');
    }
  };

  const handleUploadAndProcess = async () => {
    if (!file || !selectedCustomer || !selectedSubscription) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      setUploading(true);
      
      // Upload do arquivo
      const uploadResponse = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadResponse.file_url;
      
      setUploading(false);
      setProcessing(true);

      // Processar com OCR
      const result = await base44.functions.invoke('processUtilityBill', {
        file_url: fileUrl,
        customer_email: selectedCustomer,
        subscription_id: selectedSubscription
      });

      setProcessing(false);

      if (result.data.success) {
        toast.success('Fatura processada com sucesso!');
        setViewData(result.data);
        setIsDialogOpen(true);
        queryClient.invalidateQueries(['utility-bills']);
        setFile(null);
        setSelectedCustomer('');
        setSelectedSubscription('');
      } else {
        toast.error('Erro ao processar fatura');
      }
    } catch (error) {
      setUploading(false);
      setProcessing(false);
      toast.error('Erro: ' + error.message);
    }
  };

  const selectedSub = subscriptions.find(s => s.id === selectedSubscription);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Processador de Faturas OCR</h1>
                <p className="text-sm text-white/80">Extraia dados de faturas da concessionária</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Nova Fatura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Cliente *</Label>
                  <Select value={selectedCustomer} onValueChange={(v) => {
                    setSelectedCustomer(v);
                    setSelectedSubscription('');
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSubscriptions.map(sub => (
                        <SelectItem key={sub.id} value={sub.customer_email}>
                          {sub.customer_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCustomer && (
                  <div>
                    <Label>Assinatura/Contrato *</Label>
                    <Select value={selectedSubscription} onValueChange={setSelectedSubscription}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a assinatura" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeSubscriptions
                          .filter(s => s.customer_email === selectedCustomer)
                          .map(sub => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {sub.consumer_unit_number || sub.id.slice(0, 8)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Arquivo PDF *</Label>
                  <div className="mt-2">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload">
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-600">
                          {file ? file.name : 'Clique para selecionar PDF'}
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {selectedSub && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                    <p className="font-semibold text-blue-900 mb-1">Cliente selecionado:</p>
                    <p className="text-blue-700">{selectedSub.customer_name}</p>
                    <p className="text-blue-600 text-xs">{selectedSub.customer_email}</p>
                  </div>
                )}

                <Button
                  onClick={handleUploadAndProcess}
                  disabled={!file || !selectedCustomer || !selectedSubscription || uploading || processing}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando OCR...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Processar Fatura
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Processed Bills List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Faturas Processadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {processedBills.map((bill) => (
                    <div key={bill.id} className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">{bill.customer_email}</span>
                            <Badge className={bill.status === 'processed' ? 'bg-green-600' : 'bg-yellow-600'}>
                              {bill.status === 'processed' ? 'Processada' : 'Pendente'}
                            </Badge>
                            {bill.ocr_processed && (
                              <Badge variant="outline" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                OCR
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                            <div>
                              <span className="font-medium">Referência:</span> {bill.reference_month}
                            </div>
                            <div>
                              <span className="font-medium">NF:</span> {bill.invoice_number}
                            </div>
                            <div>
                              <span className="font-medium">kWh:</span> {bill.kwh_consumed?.toLocaleString()}
                            </div>
                            <div>
                              <span className="font-medium">Total:</span> R$ {bill.total_amount?.toFixed(2)}
                            </div>
                            <div className="col-span-2">
                              <span className="font-medium text-green-700">Base desconto (Energia):</span> R$ {bill.discount_base_value?.toFixed(2)}
                            </div>
                          </div>
                          {bill.other_charges?.length > 0 && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                              <span className="font-semibold">Outras cobranças:</span> R$ {bill.non_discountable_value?.toFixed(2)}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setViewData({
                              utility_bill: bill,
                              extracted_data: bill.extracted_data,
                              summary: {
                                total: bill.total_amount,
                                kwh_value: bill.kwh_value,
                                other_charges: bill.non_discountable_value,
                                kwh_consumed: bill.kwh_consumed
                              }
                            });
                            setIsDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {processedBills.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>Nenhuma fatura processada ainda</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* View Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Fatura</DialogTitle>
          </DialogHeader>
          {viewData && (
            <div className="space-y-4">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600">Total da Fatura</p>
                      <p className="text-2xl font-bold text-green-700">
                        R$ {viewData.summary.total?.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">kWh Consumidos</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {viewData.summary.kwh_consumed?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-600 mb-2">Base para Desconto (Energia)</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-slate-500">TUSD</p>
                          <p className="font-semibold">R$ {viewData.summary.kwh_tusd?.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">TE</p>
                          <p className="font-semibold">R$ {viewData.summary.kwh_te?.toFixed(2)}</p>
                        </div>
                        <div className="bg-green-100 p-2 rounded">
                          <p className="text-slate-600">Total Energia</p>
                          <p className="font-bold text-green-700">R$ {viewData.summary.discount_base?.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-2">Outras Cobranças (Não descontáveis)</p>
                      <div className="grid grid-cols-5 gap-2 text-xs">
                        <div>
                          <p className="text-slate-500">COSIP</p>
                          <p className="font-semibold">R$ {viewData.summary.breakdown?.cosip?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Bandeiras</p>
                          <p className="font-semibold">R$ {viewData.summary.breakdown?.flags?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Multas</p>
                          <p className="font-semibold">R$ {viewData.summary.breakdown?.fines?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Juros</p>
                          <p className="font-semibold">R$ {viewData.summary.breakdown?.interest?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div className="bg-amber-100 p-2 rounded">
                          <p className="text-slate-600">Total</p>
                          <p className="font-bold text-amber-700">R$ {viewData.summary.non_discountable?.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {viewData.extracted_data?.other_charges?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Detalhamento de Outras Cobranças</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {viewData.extracted_data.other_charges.map((charge, i) => (
                        <div key={i} className="flex justify-between text-sm p-2 bg-slate-50 rounded">
                          <span>{charge.description}</span>
                          <span className="font-semibold">R$ {charge.amount?.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {viewData.extracted_data?.taxes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Impostos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(viewData.extracted_data.taxes).map(([tax, value]) => (
                        value > 0 && (
                          <div key={tax} className="flex justify-between">
                            <span className="uppercase font-medium">{tax}:</span>
                            <span>R$ {value?.toFixed(2)}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="p-3 bg-slate-100 rounded-lg text-xs text-slate-600">
                <p><strong>Cliente:</strong> {viewData.extracted_data?.customer_name}</p>
                <p><strong>CPF/CNPJ:</strong> {viewData.extracted_data?.customer_cpf_cnpj}</p>
                <p><strong>Instalação:</strong> {viewData.extracted_data?.installation_number}</p>
                <p><strong>Vencimento:</strong> {viewData.extracted_data?.due_date}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}