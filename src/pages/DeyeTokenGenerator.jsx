import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check } from 'lucide-react';

export default function DeyeTokenGenerator() {
  const [region, setRegion] = useState('US');
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyId, setCompanyId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const baseURLs = {
    'EU': 'https://eu1-developer.deyecloud.com/v1.0',
    'US': 'https://us1-developer.deyecloud.com/v1.0',
    'AMEA': 'https://us1-developer.deyecloud.com/v1.0'
  };

  const handleGenerateToken = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Usar a função backend existente
      const result = await base44.functions.invoke('deye_getToken', {});
      
      if (result.data.success) {
        setResponse({
          token: result.data.token,
          expiresAt: result.data.expiresAt,
          message: 'Token gerado com sucesso!'
        });
      } else {
        setError(result.data.error || 'Erro ao gerar token');
      }
    } catch (err) {
      setError(err.message || 'Erro na requisição');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = () => {
    if (response?.token) {
      navigator.clipboard.writeText(response.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Gerador de Token DeyeCloud</h1>
        <p className="text-slate-600 mb-8">Gere tokens de acesso para a API DeyeCloud</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Configurações</CardTitle>
                <CardDescription>Os dados são carregados das configurações salvas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="block mb-2">Região</Label>
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EU">EU (Europa)</SelectItem>
                      <SelectItem value="US">US (América do Norte)</SelectItem>
                      <SelectItem value="AMEA">AMEA (Américas)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Alert>
                  <AlertDescription>
                    <strong>Base URL:</strong> {baseURLs[region]}
                  </AlertDescription>
                </Alert>

                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-sm">
                    <p className="font-semibold mb-2">Método de autenticação:</p>
                    <p className="text-xs text-slate-700">
                      A função usa as credenciais salvas em <strong>DeyeSettings</strong>:
                    </p>
                    <ul className="text-xs text-slate-700 mt-2 ml-4 space-y-1">
                      <li>• appId + appSecret (SHA-256)</li>
                      <li>• email + senha (SHA-256)</li>
                      <li>• companyId (opcional)</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <Button 
                  onClick={handleGenerateToken} 
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Gerando...' : 'Gerar Token'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Resposta */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Resultado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertDescription className="text-red-800 text-sm">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {response && (
                  <div className="space-y-3">
                    <Alert className="bg-green-50 border-green-200">
                      <AlertDescription className="text-green-800 text-sm">
                        ✓ {response.message}
                      </AlertDescription>
                    </Alert>

                    <div>
                      <Label className="text-xs text-slate-600">Token (clique para copiar)</Label>
                      <div 
                        onClick={handleCopyToken}
                        className="mt-2 p-2 bg-slate-100 rounded text-xs font-mono text-slate-700 cursor-pointer hover:bg-slate-200 transition truncate"
                        title={response.token}
                      >
                        {response.token.substring(0, 20)}...
                      </div>
                      {copied && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Copiado!
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="text-xs text-slate-600">Expira em</Label>
                      <p className="mt-1 text-sm text-slate-700">
                        {new Date(response.expiresAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Documentação */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Como usar o token</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <div>
              <h4 className="font-semibold mb-2">1. Exemplo de requisição com o token:</h4>
              <pre className="bg-slate-100 p-3 rounded overflow-x-auto text-xs">
{`POST https://us1-developer.deyecloud.com/v1.0/station/list
Authorization: bearer {seu_token_aqui}
Content-Type: application/json

{}`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">2. Endpoints úteis:</h4>
              <ul className="space-y-1 ml-4">
                <li>• <code className="bg-slate-100 px-2 py-1 rounded text-xs">POST /v1.0/station/list</code> - Lista de estações</li>
                <li>• <code className="bg-slate-100 px-2 py-1 rounded text-xs">POST /v1.0/station/latest</code> - Dados em tempo real</li>
                <li>• <code className="bg-slate-100 px-2 py-1 rounded text-xs">POST /v1.0/account/info</code> - Info da conta</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">3. Debug:</h4>
              <p className="text-xs text-slate-600">Verifique os logs da função no dashboard → Code → Functions → deye_getToken para ver os detalhes da requisição.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}