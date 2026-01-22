import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Upload, CheckCircle, AlertCircle, Loader2, ArrowLeft, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SubscriptionImport() {
  const [file, setFile] = useState(null);
  const [pastedData, setPastedData] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split('\t');
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const obj = {};
      const values = lines[i].split('\t');
      headers.forEach((header, index) => {
        obj[header.trim()] = values[index]?.trim() || '';
      });
      rows.push(obj);
    }

    return rows;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleImport = async (source) => {
    let text = '';
    
    if (source === 'file' && !file) {
      setError('Selecione um arquivo');
      return;
    }

    if (source === 'paste' && !pastedData.trim()) {
      setError('Cole os dados no campo de texto');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      text = source === 'file' ? await file.text() : pastedData;
      const subscriptions = parseCSV(text);

      if (subscriptions.length === 0) {
        setError('Nenhum dado encontrado no arquivo');
        return;
      }

      const response = await base44.functions.invoke('importSubscriptions', {
        subscriptions
      });

      setResult(response.data);
      setFile(null);
      setPastedData('');
    } catch (err) {
      setError(err.message || 'Erro ao importar dados');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['GDASH_ID', 'Status', 'Nome/Razão Social', 'CNPJ/CPF', 'Número do Cliente', 'Enviar Email', 'Usina', 'Negócio', 'Email', 'Telefone', 'Senha para desbloqueio de faturas'];
    const csv = headers.join('\t');
    const blob = new Blob([csv], { type: 'text/tab-separated-values' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_subscriptions.tsv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold">Importar Clientes</h1>
              <p className="text-xs text-slate-400">Importe clientes via CSV</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl">
          {!result ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Importar Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Formato:</strong> TAB-separated (colar diretamente do Excel/planilha)
                    </p>
                  </div>

                  <Tabs defaultValue="paste" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="paste">Colar Dados</TabsTrigger>
                      <TabsTrigger value="file">Upload Arquivo</TabsTrigger>
                    </TabsList>

                    <TabsContent value="paste" className="space-y-4">
                      <Textarea
                        placeholder="Cole os dados aqui (copie direto do Excel com Tab entre as colunas)"
                        value={pastedData}
                        onChange={(e) => {
                          setPastedData(e.target.value);
                          setError(null);
                        }}
                        className="h-48 font-mono text-xs"
                      />
                      {error && (
                        <Alert className="border-red-200 bg-red-50">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-800">{error}</AlertDescription>
                        </Alert>
                      )}
                      <Button
                        onClick={() => handleImport('paste')}
                        disabled={!pastedData.trim() || loading}
                        className="w-full bg-slate-900 hover:bg-slate-800"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Importando...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Importar Dados
                          </>
                        )}
                      </Button>
                    </TabsContent>

                    <TabsContent value="file" className="space-y-4">
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition">
                        <input
                          type="file"
                          accept=".csv,.tsv,.txt"
                          onChange={handleFileChange}
                          className="hidden"
                          id="file-input"
                        />
                        <label htmlFor="file-input" className="cursor-pointer">
                          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                          <p className="text-slate-900 font-medium">
                            {file ? file.name : 'Clique para selecionar arquivo'}
                          </p>
                          <p className="text-sm text-slate-500">ou arraste aqui</p>
                        </label>
                      </div>
                      {error && (
                        <Alert className="border-red-200 bg-red-50">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-800">{error}</AlertDescription>
                        </Alert>
                      )}
                      <div className="flex gap-3">
                        <Button
                          onClick={downloadTemplate}
                          variant="outline"
                          className="flex-1"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Template
                        </Button>
                        <Button
                          onClick={() => handleImport('file')}
                          disabled={!file || loading}
                          className="flex-1 bg-slate-900 hover:bg-slate-800"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Importando...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Importar
                            </>
                          )}
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Card className="border-0 shadow-sm border-green-200 bg-green-50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-green-900 mb-2">Importação concluída!</h3>
                      <div className="space-y-1 text-sm text-green-800">
                        <p>✓ <strong>{result.summary.created}</strong> clientes criados</p>
                        <p>✓ <strong>{result.summary.updated}</strong> clientes atualizados</p>
                        {result.summary.errors > 0 && (
                          <p className="text-orange-700">⚠ <strong>{result.summary.errors}</strong> erros</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {result.results.created.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm">Clientes Criados ({result.results.created.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.results.created.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="text-sm text-slate-700 p-2 bg-slate-50 rounded">
                          {item.name} ({item.email})
                        </div>
                      ))}
                      {result.results.created.length > 5 && (
                        <div className="text-sm text-slate-500">+ {result.results.created.length - 5} mais</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {result.results.updated.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm">Clientes Atualizados ({result.results.updated.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.results.updated.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="text-sm text-slate-700 p-2 bg-slate-50 rounded">
                          {item.name} ({item.email})
                        </div>
                      ))}
                      {result.results.updated.length > 5 && (
                        <div className="text-sm text-slate-500">+ {result.results.updated.length - 5} mais</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {result.results.errors.length > 0 && (
                <Card className="border-0 shadow-sm border-orange-200 bg-orange-50">
                  <CardHeader>
                    <CardTitle className="text-sm text-orange-900">Erros ({result.results.errors.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.results.errors.map((err, idx) => (
                        <div key={idx} className="text-xs text-orange-800 p-2 bg-white rounded border border-orange-200">
                          <strong>Linha {err.row}:</strong> {err.error}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={() => {
                  setResult(null);
                  setFile(null);
                }}
                className="w-full bg-slate-900 hover:bg-slate-800"
              >
                Importar outro arquivo
              </Button>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}