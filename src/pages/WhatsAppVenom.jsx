import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageCircle, QrCode, Phone, Send, CheckCircle, XCircle, ArrowLeft, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function WhatsAppVenom() {
  const queryClient = useQueryClient();
  const [messageData, setMessageData] = useState({
    phone_number: '',
    message: ''
  });

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['venom-status'],
    queryFn: async () => {
      const res = await base44.functions.invoke('venomConnect', { action: 'status' });
      return res.data;
    },
    refetchInterval: (data) => {
      if (data?.status === 'connected' || data?.qrCode) {
        return 5000;
      }
      return false;
    },
    retry: false
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['whatsapp-messages'],
    queryFn: () => base44.entities.WhatsAppMessage.list('-created_date', 50)
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('venomConnect', { action: 'connect' });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Iniciando conexão...');
      setTimeout(() => refetchStatus(), 2000);
    },
    onError: (error) => {
      toast.error('Erro: ' + error.message);
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('venomConnect', { action: 'disconnect' });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Desconectado');
      refetchStatus();
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      const res = await base44.functions.invoke('venomConnect', {
        action: 'send',
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
      toast.error('Erro: ' + error.message);
    }
  });

  const statusColors = {
    connected: 'bg-green-100 text-green-800',
    disconnected: 'bg-red-100 text-red-800',
    connecting: 'bg-yellow-100 text-yellow-800',
    qrReadSuccess: 'bg-blue-100 text-blue-800'
  };

  const statusLabels = {
    connected: 'Conectado',
    disconnected: 'Desconectado',
    connecting: 'Conectando...',
    qrReadSuccess: 'QR Code lido'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
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
                  <h1 className="text-2xl font-bold">WhatsApp Venom Bot</h1>
                  <p className="text-sm text-white/80">Integração via Venom (Node.js)</p>
                </div>
              </div>
            </div>
            {status?.status && (
              <Badge className={statusColors[status.status] || 'bg-slate-100 text-slate-800'}>
                {statusLabels[status.status] || status.status}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <AlertDescription className="text-yellow-900">
            <strong>⚠️ Venom usa armazenamento de sessão local</strong>
            <p className="mt-1 text-sm">A sessão do WhatsApp fica salva no servidor onde a função roda. Ideal para ambiente Deno Deploy ou VPS próprio.</p>
          </AlertDescription>
        </Alert>

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
                {status?.status === 'connected' ? (
                  <>
                    <div className="p-4 bg-green-50 rounded-xl text-center">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                      <p className="font-semibold text-green-900">Conectado</p>
                      {status.phoneNumber && (
                        <p className="text-sm text-green-700 mt-1">{status.phoneNumber}</p>
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
                ) : status?.qrCode ? (
                  <>
                    <div className="p-4 bg-yellow-50 rounded-xl text-center">
                      <QrCode className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                      <p className="font-semibold text-yellow-900 mb-3">Escaneie o QR Code</p>
                      <div className="bg-white p-4 rounded-lg">
                        <img 
                          src={status.qrCode}
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
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      onClick={() => connectMutation.mutate()}
                      disabled={connectMutation.isPending}
                    >
                      {connectMutation.isPending ? 'Conectando...' : 'Conectar WhatsApp'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {status?.status === 'connected' && (
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
                    className="w-full bg-purple-600 hover:bg-purple-700"
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
                          ? 'bg-purple-50 border-purple-200 ml-8'
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
                          msg.status === 'sent' || msg.status === 'delivered' ? 'bg-green-100 text-green-800' :
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
      </main>
    </div>
  );
}