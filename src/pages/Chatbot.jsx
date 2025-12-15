import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Bot, User, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';

export default function Chatbot() {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const [message, setMessage] = useState('');
  const [sessionId] = useState(() => `session_${Date.now()}`);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['chat-messages', sessionId],
    queryFn: () => base44.entities.ChatMessage.filter({ session_id: sessionId }, 'created_date', 100),
    enabled: !!user
  });

  const sendMessage = useMutation({
    mutationFn: async (msg) => {
      // Send user message
      await base44.entities.ChatMessage.create({
        session_id: sessionId,
        user_email: user.email,
        message: msg,
        sender: 'user'
      });

      // Simulate bot response with InvokeLLM
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um assistente virtual de uma empresa de energia solar. Responda de forma amigável e útil. Pergunta do cliente: ${msg}`,
        add_context_from_internet: false
      });

      // Send bot response
      await base44.entities.ChatMessage.create({
        session_id: sessionId,
        user_email: user.email,
        message: response,
        sender: 'bot',
        confidence: 0.9
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chat-messages']);
      setMessage('');
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessage.mutate(message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('CustomerDashboard')}>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-amber-400" />
              <div>
                <h1 className="text-2xl font-bold">Assistente Virtual</h1>
                <p className="text-amber-400 text-sm">Atendimento 24/7 automatizado</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="border-0 shadow-sm max-w-4xl mx-auto">
          <CardHeader className="border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <CardTitle>Assistente EnergiaSolar</CardTitle>
                <Badge className="bg-green-100 text-green-800 text-xs">Online</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[500px] overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <Bot className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 mb-2">Olá! Como posso ajudar você hoje?</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {['Ver minha conta', 'Consultar economia', 'Tirar dúvidas'].map((suggestion) => (
                      <Button
                        key={suggestion}
                        size="sm"
                        variant="outline"
                        onClick={() => sendMessage.mutate(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.sender === 'user' ? 'bg-blue-100' : 'bg-amber-100'
                  }`}>
                    {msg.sender === 'user' ? (
                      <User className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Bot className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                  <div className={`max-w-[70%] ${msg.sender === 'user' ? 'items-end' : ''}`}>
                    <div className={`p-3 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-900'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 px-2">
                      {format(new Date(msg.created_date), 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))}

              {sendMessage.isPending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="bg-slate-100 p-3 rounded-2xl">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-slate-200 p-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  disabled={sendMessage.isPending}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={!message.trim() || sendMessage.isPending}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}