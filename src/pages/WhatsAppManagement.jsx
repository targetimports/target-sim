import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, QrCode, Phone, Send, CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function WhatsAppManagement() {
  const queryClient = useQueryClient();
  const [messageData, setMessageData] = useState({
    phone_number: '',
    message: ''
  });

  const { data: connectionStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const res = await base44.functions.invoke('whatsappConnect', { action: 'status' });
      return res.data;
    },
    refetchInterval: 5000 // Atualiza a cada 5 segundos
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['whatsapp-messages'],
    queryFn: () => base44.entities.WhatsAppMessage.list('-created_date', 100)
  });

  const connectMutation = useMutation({
    mutationFn: async (action) => {
      const res = await base44.functions.invoke('whatsappConnect', { action });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Ação executada com sucesso');
      refetchStatus();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao executar ação');
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      const res = await base44.functions.invoke('whatsappSendMessage', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Mensagem enviada com sucesso!');
      queryClient.invalidateQueries(['whatsapp-messages']);
      setMessageData({ phone_number: '', message: '' });
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao enviar mensagem');
    }
  });

  const handleConnect = () => {
    connectMutation.mutate('connect');
  };

  const handleDisconnect = () => {
    connectMutation.mutate('disconnect');
  };

  const handleSendMessage = () => {
    if (!messageData.phone_number || !messageData.message) {
      toast.error('Preencha todos os campos');
      return;
    }
    sendMessageMutation.mutate(messageData);
  };

  const statusColors = {
    disconnected: 'bg-slate-100 text-slate-800',
    connecting: 'bg-blue-100 text-blue-800',
    qr_code: 'bg-yellow-100 text-yellow-800',
    connected: 'bg-green-100 text-green-800'
  };

  const statusLabels = {
    disconnected: 'Desconectado',
    connecting: 'Conectando...',
    qr_code: 'Aguardando QR Code',
    connected: 'Conectado'
  };

  const messageStatusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    sent: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800',
    read: 'bg-emerald-100 text-emerald-800',
    failed: 'bg-red-100 text-red-800'
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
                  <h1 className="text-2xl font-bold">WhatsApp Business</h1>
                  <p className="text-sm text-white/80">Gestão de mensagens via Baileys</p>
                </div>
              </div>
            </div>
            <Badge className={statusColors[connectionStatus?.status] || 'bg-slate-100 text-slate-800'}>
              {statusLabels[connectionStatus?.status] || 'Desconhecido'}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Connection Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Conexão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {connectionStatus?.status === 'connected' ? (
                  <>
                    <div className="p-4 bg-green-50 rounded-xl text-center">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                      <p className="font-semibold text-green-900">Conectado</p>
                      {connectionStatus.session?.phone_number && (
                        <p className="text-sm text-green-700 mt-1">
                          {connectionStatus.session.phone_number}
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="destructive" 
                      className="w-full" 
                      onClick={handleDisconnect}
                      disabled={connectMutation.isPending}
                    >
                      Desconectar
                    </Button>
                  </>
                ) : connectionStatus?.status === 'qr_code' || connectionStatus?.status === 'connecting' ? (
                  <>
                    <div className="p-4 bg-yellow-50 rounded-xl text-center">
                      <QrCode className="w-12 h-12 text-yellow-600 mx-auto mb-2" />
                      <p className="font-semibold text-yellow-900 mb-3">
                        {connectionStatus?.qr_code ? 'Escaneie o QR Code' : 'Gerando QR Code...'}
                      </p>
                      {connectionStatus?.qr_code ? (
                        <>
                          <img 
                            src={connectionStatus.qr_code} 
                            alt="QR Code" 
                            className="mx-auto border-4 border-white shadow-lg rounded-lg max-w-[280px]"
                          />
                          <p className="text-xs text-slate-500 mt-3">
                            Abra o WhatsApp no celular e escaneie este código
                          </p>
                        </>
                      ) : connectionStatus?.session?.qr_code ? (
                        <>
                          <img 
                            src={connectionStatus.session.qr_code} 
                            alt="QR Code" 
                            className="mx-auto border-4 border-white shadow-lg rounded-lg max-w-[280px]"
                          />
                          <p className="text-xs text-slate-500 mt-3">
                            Abra o WhatsApp no celular e escaneie este código
                          </p>
                        </>
                      ) : (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleDisconnect}
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-slate-50 rounded-xl text-center">
                      <XCircle className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                      <p className="font-semibold text-slate-900">Desconectado</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Conecte sua conta do WhatsApp
                      </p>
                    </div>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700" 
                      onClick={handleConnect}
                      disabled={connectMutation.isPending}
                    >
                      {connectMutation.isPending ? 'Conectando...' : 'Conectar WhatsApp'}
                    </Button>
                  </>
                )}

                {connectionStatus?.session?.last_connection && (
                  <p className="text-xs text-slate-500 text-center">
                    Última conexão: {format(new Date(connectionStatus.session.last_connection), 'dd/MM/yyyy HH:mm')}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Send Message Panel */}
            {connectionStatus?.status === 'connected' && (
              <Card className="border-0 shadow-sm">
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
                    <p className="text-xs text-slate-500 mt-1">Ex: 5511999999999</p>
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
                    onClick={handleSendMessage}
                    disabled={sendMessageMutation.isPending}
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
            <Card className="border-0 shadow-sm">
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
                            {msg.direction === 'outbound' ? 'Enviado para' : 'Recebido de'}: {msg.phone_number}
                          </p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(msg.created_date), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                        <Badge className={messageStatusColors[msg.status]}>
                          {msg.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700">{msg.message}</p>
                      {msg.error_message && (
                        <p className="text-xs text-red-600 mt-2">Erro: {msg.error_message}</p>
                      )}
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