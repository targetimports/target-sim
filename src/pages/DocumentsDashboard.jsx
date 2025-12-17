import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, Eye, Calendar, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Button } from "@/components/ui/button";

export default function DocumentsDashboard() {
  const { data: documents = [] } = useQuery({
    queryKey: ['documents-dashboard'],
    queryFn: () => base44.entities.Document.list('-created_date', 500)
  });

  // Documentos por tipo
  const docsByType = documents.reduce((acc, doc) => {
    acc[doc.document_type] = (acc[doc.document_type] || 0) + 1;
    return acc;
  }, {});

  const typeData = Object.entries(docsByType).map(([type, count]) => ({
    name: type === 'contract' ? 'Contrato' :
          type === 'invoice' ? 'Fatura' :
          type === 'id_document' ? 'Documento ID' :
          type === 'proof_address' ? 'Comp. Endereço' :
          type === 'power_bill' ? 'Conta de Luz' : 'Outros',
    value: count
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#64748b'];

  // Status de documentos
  const statusData = [
    { name: 'Pendente', value: documents.filter(d => d.status === 'pending').length },
    { name: 'Aprovado', value: documents.filter(d => d.status === 'approved').length },
    { name: 'Rejeitado', value: documents.filter(d => d.status === 'rejected').length }
  ].filter(d => d.value > 0);

  // Status de assinatura
  const signedCount = documents.filter(d => d.signed).length;
  const unsignedCount = documents.filter(d => d.requires_signature && !d.signed).length;
  const noSignatureRequired = documents.filter(d => !d.requires_signature).length;

  const signatureData = [
    { name: 'Assinados', value: signedCount, color: '#10b981' },
    { name: 'Pendente Assinatura', value: unsignedCount, color: '#f59e0b' },
    { name: 'Não Requer', value: noSignatureRequired, color: '#94a3b8' }
  ].filter(d => d.value > 0);

  // OCR processado
  const ocrProcessed = documents.filter(d => d.ocr_processed).length;
  const ocrPending = documents.filter(d => !d.ocr_processed).length;

  // Volume de uploads ao longo do tempo (últimos 6 meses)
  const monthlyUploads = documents.reduce((acc, doc) => {
    const month = new Date(doc.created_date).toISOString().substring(0, 7);
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const uploadTrendData = Object.entries(monthlyUploads)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([month, count]) => ({
      month,
      uploads: count
    }));

  // Stats cards
  const stats = {
    total: documents.length,
    pending: documents.filter(d => d.status === 'pending').length,
    approved: documents.filter(d => d.status === 'approved').length,
    ocrProcessed: ocrProcessed
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('DocumentManager')}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Dashboard de Documentos</h1>
                <p className="text-sm text-white/80">Análise e estatísticas de documentos</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Cards de Resumo */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">Total de Documentos</p>
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">Pendentes</p>
                <Calendar className="w-6 h-6 text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">Aprovados</p>
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">OCR Processado</p>
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-600">{stats.ocrProcessed}</p>
              <p className="text-xs text-slate-500 mt-1">
                {ocrPending} pendentes
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Tipos de Documentos */}
          <Card>
            <CardHeader>
              <CardTitle>Documentos por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              {typeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  Sem dados
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status de Assinatura */}
          <Card>
            <CardHeader>
              <CardTitle>Status de Assinatura Digital</CardTitle>
            </CardHeader>
            <CardContent>
              {signatureData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={signatureData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {signatureData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  Sem dados
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Status de Aprovação */}
          <Card>
            <CardHeader>
              <CardTitle>Status de Aprovação</CardTitle>
            </CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  Sem dados
                </div>
              )}
            </CardContent>
          </Card>

          {/* Volume de Uploads ao Longo do Tempo */}
          <Card>
            <CardHeader>
              <CardTitle>Volume de Uploads (Últimos 6 Meses)</CardTitle>
            </CardHeader>
            <CardContent>
              {uploadTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={uploadTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="uploads" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      name="Uploads"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  Sem dados
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Insights */}
        <Card className="mt-6 border-2 border-blue-200">
          <CardHeader>
            <CardTitle>💡 Insights e Recomendações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unsignedCount > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-900">
                  ⚠️ <strong>{unsignedCount} documentos</strong> aguardando assinatura digital
                </p>
              </div>
            )}
            {ocrPending > 0 && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-900">
                  🔍 <strong>{ocrPending} documentos</strong> pendentes de processamento OCR
                </p>
              </div>
            )}
            {stats.pending > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  📋 <strong>{stats.pending} documentos</strong> aguardando revisão e aprovação
                </p>
              </div>
            )}
            {stats.total > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-900">
                  ✅ Taxa de aprovação: <strong>{((stats.approved / stats.total) * 100).toFixed(1)}%</strong>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}