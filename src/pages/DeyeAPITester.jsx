import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, AlertTriangle, Play } from 'lucide-react';

export default function DeyeAPITester() {
  const [region, setRegion] = useState('US');
  const [token, setToken] = useState('');
  const [endpoint, setEndpoint] = useState('/station/list');
  const [method, setMethod] = useState('POST');
  const [payload, setPayload] = useState('{}');
  
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [statusCode, setStatusCode] = useState(null);
  const [error, setError] = useState(null);

  const baseURLs = {
    'EU': 'https://eu1-developer.deyecloud.com/v1.0',
    'US': 'https://us1-developer.deyecloud.com/v1.0',
    'AMEA': 'https://us1-developer.deyecloud.com/v1.0'
  };

  const commonEndpoints = [
    { label: 'Listar Estações', value: '/station/list' },
    { label: 'Info Conta', value: '/account/info' },
    { label: 'Dados em Tempo Real', value: '/station/latest' },
    { label: 'Lista de Dispositivos', value: '/device/list' },
    { label: 'Alertas', value: '/station/alertList' }
  ];

  const handleTest = async () => {
    if (!token.trim()) {
      setError('Token é obrigatório');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    setStatusCode(null);

    try {
      const url = new URL(`${baseURLs[region]}${endpoint}`);
      
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `bearer ${token}`
        }
      };

      if (method === 'POST') {
        options.body = payload;
      }

      const res = await fetch(url.toString(), options);
      setStatusCode(res.status);

      const text = await res.text();
      try {
        const json = JSON.parse(text);
        setResponse(JSON.stringify(json, null, 2));
      } catch (e) {
        setResponse(text);
      }

      if (!res.ok && res.status === 403) {
        setError('❌ 403 Forbidden - O token/appId não tem permissão para este endpoint');
      } else if (!res.ok) {
        setError(`❌ Erro ${res.status} - Verifique a resposta abaixo`);
      }
    } catch (err) {
      setError(`Erro de conexão: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = statusCode === 200 ? 'bg-green-50 border-green-200' : statusCode === 401 ? 'bg-orange-50 border-orange-200' : statusCode === 403 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Testador de API DeyeCloud</h1>
        <p className="text-slate-600 mb-8">Teste endpoints da API com seu token de acesso</p>

        <Alert className="mb-6 bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>⚠️ Segurança:</strong> Não compartilhe seu token em public. Se já compartilhou, regere um novo no DeyeCloud.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuração</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Região</Label>
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EU">EU</SelectItem>
                      <SelectItem value="US">US</SelectItem>
                      <SelectItem value="AMEA">AMEA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Token (JWT)</Label>
                  <Textarea 
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Colar seu token JWT aqui"
                    className="font-mono text-xs h-24"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Requisição</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Método</Label>
                    <Select value={method} onValueChange={setMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Endpoint</Label>
                    <Select value={endpoint} onValueChange={setEndpoint}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {commonEndpoints.map(ep => (
                          <SelectItem key={ep.value} value={ep.value}>
                            {ep.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Customizado...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {endpoint === 'custom' && (
                  <div>
                    <Label>Endpoint Customizado</Label>
                    <Input 
                      value={endpoint !== 'custom' ? endpoint : ''}
                      onChange={(e) => setEndpoint(e.target.value)}
                      placeholder="/seu/endpoint"
                    />
                  </div>
                )}

                <div>
                  <Label>Payload (JSON)</Label>
                  <Textarea 
                    value={payload}
                    onChange={(e) => setPayload(e.target.value)}
                    className="font-mono text-xs h-24"
                  />
                </div>

                <Button 
                  onClick={handleTest}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {loading ? 'Testando...' : 'Testar'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Resposta */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Resposta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertDescription className="text-red-800 text-sm">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {statusCode && (
                  <Alert className={statusColor}>
                    <AlertDescription className="text-sm font-semibold">
                      Status: {statusCode}
                    </AlertDescription>
                  </Alert>
                )}

                {response && (
                  <div>
                    <Label className="text-xs text-slate-600">Resposta JSON</Label>
                    <Textarea 
                      value={response}
                      readOnly
                      className="font-mono text-xs h-40 mt-2"
                    />
                  </div>
                )}

                {!response && !error && (
                  <p className="text-sm text-slate-500 text-center py-8">
                    Teste uma requisição para ver a resposta aqui
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Debug Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Debug Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <strong>URL da requisição:</strong>
              <pre className="bg-slate-100 p-2 rounded mt-1 text-xs overflow-x-auto">
                {method} {baseURLs[region]}{endpoint}
              </pre>
            </div>
            <div>
              <strong>Headers:</strong>
              <pre className="bg-slate-100 p-2 rounded mt-1 text-xs">
{`Authorization: bearer ${token ? token.substring(0, 20) + '...' : '[não preenchido]'}
Content-Type: application/json`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}