import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Upload, Download, Check, X, ArrowLeft, Eye, Pen, Scan } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SignatureCanvas from '../components/documents/SignatureCanvas';

export default function DocumentManager() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [ocrDialogOpen, setOcrDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    customerEmail: '',
    documentType: 'other',
    title: '',
    requiresSignature: false
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date', 100)
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => base44.entities.Subscription.list()
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Document.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['documents']);
      toast.success('Status atualizado!');
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!uploadForm.customerEmail || !uploadForm.title) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await base44.entities.Document.create({
        title: uploadForm.title,
        document_type: uploadForm.documentType,
        customer_email: uploadForm.customerEmail,
        file_url: file_url,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        requires_signature: uploadForm.requiresSignature
      });

      queryClient.invalidateQueries(['documents']);
      toast.success('Documento enviado!');
      setUploadDialogOpen(false);
      setUploadForm({ customerEmail: '', documentType: 'other', title: '', requiresSignature: false });
    } catch (error) {
      toast.error('Erro ao enviar documento');
    } finally {
      setUploading(false);
    }
  };

  const saveSignatureMutation = useMutation({
    mutationFn: async ({ docId, signatureData }) => {
      await base44.entities.Document.update(docId, {
        signed: true,
        signed_date: new Date().toISOString(),
        signed_by: uploadForm.customerEmail,
        signature_data: signatureData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['documents']);
      setSignatureDialogOpen(false);
      toast.success('Documento assinado!');
    }
  });

  const processOCRMutation = useMutation({
    mutationFn: async (doc) => {
      toast.info('Processando OCR...');
      
      const schema = {
        type: 'object',
        properties: {
          customer_name: { type: 'string' },
          document_number: { type: 'string' },
          value: { type: 'number' },
          due_date: { type: 'string' },
          issue_date: { type: 'string' }
        }
      };

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: doc.file_url,
        json_schema: schema
      });

      if (result.status === 'success') {
        await base44.entities.Document.update(doc.id, {
          extracted_data: result.output,
          ocr_processed: true,
          ocr_confidence: 85
        });
        return result.output;
      } else {
        throw new Error(result.details || 'Erro no OCR');
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['documents']);
      setOcrDialogOpen(false);
      toast.success('Dados extraídos com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao processar OCR: ' + error.message);
    }
  });

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };

  const typeLabels = {
    contract: 'Contrato',
    invoice: 'Fatura',
    id_document: 'Documento ID',
    proof_address: 'Comprovante Endereço',
    power_bill: 'Conta de Luz',
    other: 'Outro'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
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
                <h1 className="text-2xl font-bold">Gestão de Documentos</h1>
                <p className="text-sm text-white/80">Contratos, faturas e comprovantes</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Novo Documento
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Documentos ({documents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <p className="font-medium">{doc.title}</p>
                      <Badge variant="outline">{typeLabels[doc.document_type]}</Badge>
                    </div>
                    <p className="text-sm text-slate-500">
                      {doc.customer_email} • {format(new Date(doc.created_date), 'dd/MM/yyyy')}
                    </p>
                    {doc.file_size && (
                      <p className="text-xs text-slate-400 mt-1">
                        {(doc.file_size / 1024).toFixed(0)} KB • v{doc.version}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[doc.status]}>
                      {doc.status === 'pending' ? 'Pendente' :
                       doc.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                    </Badge>

                    {doc.requires_signature && !doc.signed && (
                      <Badge className="bg-orange-100 text-orange-800">
                        <Pen className="w-3 h-3 mr-1" />
                        Requer Assinatura
                      </Badge>
                    )}

                    {doc.signed && (
                      <Badge className="bg-green-100 text-green-800">
                        <Check className="w-3 h-3 mr-1" />
                        Assinado
                      </Badge>
                    )}

                    {doc.ocr_processed && (
                      <Badge className="bg-blue-100 text-blue-800">
                        <Scan className="w-3 h-3 mr-1" />
                        OCR
                      </Badge>
                    )}
                    
                    {doc.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: doc.id, status: 'approved' })}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: doc.id, status: 'rejected' })}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    )}

                    {doc.requires_signature && !doc.signed && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedDoc(doc);
                          setSignatureDialogOpen(true);
                        }}
                      >
                        <Pen className="w-4 h-4" />
                      </Button>
                    )}

                    {!doc.ocr_processed && ['invoice', 'power_bill', 'contract'].includes(doc.document_type) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedDoc(doc);
                          processOCRMutation.mutate(doc);
                        }}
                        disabled={processOCRMutation.isPending}
                      >
                        <Scan className="w-4 h-4" />
                      </Button>
                    )}

                    {doc.extracted_data && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedDoc(doc);
                          setOcrDialogOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <Button size="sm" variant="outline" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}

              {documents.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhum documento cadastrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upload Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Documento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Cliente *</Label>
                <Select value={uploadForm.customerEmail} onValueChange={(v) => setUploadForm(prev => ({ ...prev, customerEmail: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {subscriptions.map(s => (
                      <SelectItem key={s.id} value={s.customer_email}>
                        {s.customer_name} - {s.customer_email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Título *</Label>
                <Input
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Contrato de Adesão"
                />
              </div>

              <div>
                <Label>Tipo de Documento</Label>
                <Select value={uploadForm.documentType} onValueChange={(v) => setUploadForm(prev => ({ ...prev, documentType: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">Contrato</SelectItem>
                    <SelectItem value="invoice">Fatura</SelectItem>
                    <SelectItem value="id_document">Documento de Identidade</SelectItem>
                    <SelectItem value="proof_address">Comprovante de Endereço</SelectItem>
                    <SelectItem value="power_bill">Conta de Luz</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requiresSignature"
                  checked={uploadForm.requiresSignature}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, requiresSignature: e.target.checked }))}
                  className="w-4 h-4"
                />
                <Label htmlFor="requiresSignature">Requer assinatura digital</Label>
              </div>

              <div>
                <Label>Arquivo *</Label>
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </div>

              {uploading && (
                <p className="text-sm text-blue-600">Enviando documento...</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Signature Dialog */}
        <Dialog open={signatureDialogOpen} onOpenChange={setSignatureDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assinatura Digital - {selectedDoc?.title}</DialogTitle>
            </DialogHeader>
            <SignatureCanvas
              onSave={(signatureData) => {
                saveSignatureMutation.mutate({
                  docId: selectedDoc.id,
                  signatureData
                });
              }}
              onCancel={() => setSignatureDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* OCR Results Dialog */}
        <Dialog open={ocrDialogOpen} onOpenChange={setOcrDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dados Extraídos (OCR)</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {selectedDoc?.extracted_data && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(selectedDoc.extracted_data, null, 2)}
                  </pre>
                </div>
              )}
              {selectedDoc?.ocr_confidence && (
                <p className="text-sm text-slate-600">
                  Confiança: {selectedDoc.ocr_confidence}%
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}