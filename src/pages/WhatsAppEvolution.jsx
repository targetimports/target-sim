import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageCircle, QrCode, Phone, Send, CheckCircle, XCircle, ArrowLeft, Settings } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function WhatsAppEvolution() {
  const queryClient = useQueryClient();
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [instanceName, setInstanceName] = useState('targetsim');
  const [showConfig, setShowConfig] = useState(false);
  const [messageData, setMessageData] = useState({
    phone_number: '',
    message: ''
  });

  useEffect(() => {
    const savedConfig = localStorage.getItem('evolution_config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      setApiUrl(config.apiUrl || '');
      setApiKey(config.apiKey || '');
      setInstanceName(config.instanceName || 'targetsim');
    } else {
      setShowConfig(true);
    }
  }, []);

  const saveConfig = () => {
    localStorage.setItem('evolution_config', JSON.stringify({
      apiUrl,
      apiKey,
      instanceName
    }));
    setShowConfig(false);
    toast.success('Configuração salva');
    refetchStatus();
  };

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['evolution-status'],
    queryFn: async () => {
      const res = await base44.functions.invoke('evolutionAPI', {
        action: 'status',
        apiUrl,
        apiKey,
        instanceName
      });
      return res.data;
    },
    enabled: !!apiUrl && !!apiKey,
    refetchInterval: 5000
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['whatsapp-messages'],
    queryFn: () => base44.entities.WhatsAppMessage.list('-created_date', 50)
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('evolutionAPI', {
        action: 'connect',
        apiUrl,
        apiKey,
        instanceName
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Conectando...');
      setTimeout(() => refetchStatus(), 2000);
    },
    onError: (error) => {
      toast.error('Erro ao conectar: ' + error.message);
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('evolutionAPI', {
        action: 'disconnect',
        apiUrl,
        apiKey,
        instanceName
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Desconectado');
      refetchStatus();
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      const res = await base44.functions.invoke('evolutionAPI', {
        action: 'send',
        apiUrl,
        apiKey,
        instanceName,
        phone: data.phone_number,
        message: data.message
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Mensagem enviada!');
      queryClient.invalidateQueries(['whatsapp-messages']);
      setMessageData({ phone_number: '', message: '' });
    },
    onError: (error) => {
      toast.error('Erro ao enviar: ' + error.message);
    }
  });

  const statusColors = {
    open: 'bg-green-100 text-green-800',
    close: 'bg-red-100 text-red-800',
    connecting: 'bg-yellow-100 text-yellow-800'
  };

  const statusLabels = {
    open: 'Conectado',
    close: 'Desconectado',
    connecting: 'Conectando...'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <MessageCircle className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">WhatsApp Evolution API</h1>
                  <p className="text-sm text-white/80">Conexão profissional e estável</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {status?.state && (
                <Badge className={statusColors[status.state] || 'bg-slate-100 text-slate-800'}>
                  {statusLabels[status.state] || status.state}
                </Badge>
              )}
              <Button 
                variant="outline" 
                size="icon"
                className="text-white border-white/30 hover:bg-white/10"
                onClick={() => setShowConfig(!showConfig)}
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {showConfig && (
          <Card className="mb-6 border-2 border-blue-200">
            <CardHeader>
              <CardTitle>⚙️ Configuração Evolution API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  <div className="space-y-3">
                    <div>
                      <strong>🚀 Instale Evolution API no seu servidor:</strong>
                      <div className="mt-2 p-3 bg-slate-900 text-white rounded-lg text-sm font-mono">
                        docker run -d --name evolution-api \<br/>
                        &nbsp;&nbsp;-p 8080:8080 \<br/>
                        &nbsp;&nbsp;atendai/evolution-api:latest
                      </div>
                    </div>
                    <div>
                      <strong>📖 Documentação completa:</strong>
                      <a href="https://doc.evolution-api.com" target="_blank" rel="noopener" className="text-blue-600 hover:underline ml-2">
                        doc.evolution-api.com
                      </a>
                    </div>
                    <div>
                      <strong>💡 Depois de instalar:</strong>
                      <ul className="list-disc ml-4 mt-1 space-y-1">
                        <li>URL será: <code className="bg-slate-100 px-1 rounded">http://IP-DO-SEU-SERVIDOR:8080</code></li>
                        <li>API Key é opcional (deixe vazio para começar)</li>
                        <li>Nome da instância: escolha qualquer nome (ex: "targetsim")</li>
                      </ul>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <div>
                <Label>URL da Evolution API *</Label>
                <Input
                  placeholder="http://localhost:8080"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                />
              </div>

              <div>
                <Label>API Key (opcional)</Label>
                <Input
                  placeholder="sua-api-key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>

              <div>
                <Label>Nome da Instância</Label>
                <Input
                  placeholder="targetsim"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                />
              </div>

              <Button onClick={saveConfig} className="w-full bg-blue-600 hover:bg-blue-700">
                Salvar Configuração
              </Button>
            </CardContent>
          </Card>
        )}

        {!apiUrl && !showConfig && (
          <Alert className="mb-6">
            <AlertDescription>
              Configure a Evolution API primeiro clicando no ícone ⚙️
            </AlertDescription>
          </Alert>
        )}

        {apiUrl && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Connection Panel */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Conexão
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {status?.state === 'open' ? (
                    <>
                      <div className="p-4 bg-green-50 rounded-xl text-center">
                        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                        <p className="font-semibold text-green-900">Conectado</p>
                        {status.instance?.owner && (
                          <p className="text-sm text-green-700 mt-1">{status.instance.owner}</p>
                        )}
                      </div>
                      <Button 
                        variant="destructive" 
                        className="w-full"
                        onClick={() => disconnectMutation.mutate()}
                        disabled={disconnectMutation.isPending}
                      >
                        Desconectar
                      </Button>
                    </>
                  ) : status?.state === 'close' ? (
                    <>
                      {status.qrcode?.base64 ? (
                        <>
                          <div className="p-4 bg-yellow-50 rounded-xl text-center">
                            <QrCode className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                            <p className="font-semibold text-yellow-900 mb-3">Escaneie o QR Code</p>
                            <div className="bg-white p-4 rounded-lg">
                              <img 
                                src={status.qrcode.base64}
                                alt="QR Code"
                                className="w-full max-w-[280px] mx-auto"
                              />
                            </div>
                            <p className="text-xs text-yellow-700 mt-3">
                              WhatsApp → Menu → Aparelhos Conectados
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => refetchStatus()}
                          >
                            Atualizar Status
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="p-4 bg-slate-50 rounded-xl text-center">
                            <XCircle className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                            <p className="font-semibold text-slate-900">Desconectado</p>
                          </div>
                          <Button 
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() => connectMutation.mutate()}
                            disabled={connectMutation.isPending}
                          >
                            {connectMutation.isPending ? 'Conectando...' : 'Conectar WhatsApp'}
                          </Button>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="p-4 bg-blue-50 rounded-xl text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="font-semibold text-blue-900">Verificando status...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {status?.state === 'open' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="w-5 h-5" />
                      Enviar Mensagem
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Número (com DDI)</Label>
                      <Input
                        placeholder="5511999999999"
                        value={messageData.phone_number}
                        onChange={(e) => setMessageData(prev => ({ ...prev, phone_number: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Mensagem</Label>
                      <Textarea
                        placeholder="Digite sua mensagem..."
                        value={messageData.message}
                        onChange={(e) => setMessageData(prev => ({ ...prev, message: e.target.value }))}
                        rows={4}
                      />
                    </div>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => sendMessageMutation.mutate(messageData)}
                      disabled={sendMessageMutation.isPending || !messageData.phone_number || !messageData.message}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {sendMessageMutation.isPending ? 'Enviando...' : 'Enviar'}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Messages History */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Mensagens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div 
                        key={msg.id}
                        className={`p-4 rounded-xl border ${
                          msg.direction === 'outbound'
                            ? 'bg-green-50 border-green-200 ml-8'
                            : 'bg-slate-50 border-slate-200 mr-8'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">
                              {msg.direction === 'outbound' ? 'Para' : 'De'}: {msg.phone_number}
                            </p>
                            <p className="text-xs text-slate-500">
                              {format(new Date(msg.created_date), 'dd/MM/yyyy HH:mm')}
                            </p>
                          </div>
                          <Badge className={
                            msg.status === 'sent' ? 'bg-green-100 text-green-800' :
                            msg.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {msg.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-700">{msg.message}</p>
                      </div>
                    ))}

                    {messages.length === 0 && (
                      <div className="text-center py-12">
                        <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">Nenhuma mensagem ainda</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}