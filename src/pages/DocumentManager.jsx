import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Download, Check, X, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function DocumentManager() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date', 100)
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Document.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['documents']);
      toast.success('Status atualizado!');
    }
  });

  const handleFileUpload = async (e, customerEmail) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await base44.entities.Document.create({
        title: file.name,
        document_type: 'other',
        customer_email: customerEmail,
        file_url: file_url,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type
      });

      queryClient.invalidateQueries(['documents']);
      toast.success('Documento enviado!');
    } catch (error) {
      toast.error('Erro ao enviar documento');
    } finally {
      setUploading(false);
    }
  };

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
      </main>
    </div>
  );
}