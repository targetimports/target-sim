import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Wand2, Copy, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AIMessageDrafter({ onMessageGenerated }) {
  const [prompt, setPrompt] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draftType, setDraftType] = useState('custom');

  const templates = {
    welcome: 'Mensagem de boas-vindas para novo cliente',
    followup: 'Mensagem de acompanhamento pós-venda',
    payment: 'Lembrete de pagamento pendente',
    promo: 'Divulgação de promoção especial'
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Digite um prompt ou selecione um template');
      return;
    }

    setLoading(true);
    try {
      const res = await base44.functions.invoke('whatsappAIDraft', {
        action: 'draft_message',
        prompt: draftType === 'custom' ? prompt : templates[draftType],
        context: draftType !== 'custom' ? prompt : null
      });

      setGeneratedMessage(res.data.message);
      if (onMessageGenerated) {
        onMessageGenerated(res.data.message);
      }
      toast.success('Mensagem gerada com IA!');
    } catch (error) {
      toast.error('Erro ao gerar mensagem');
    } finally {
      setLoading(false);
    }
  };

  const handleEnhance = async () => {
    if (!prompt.trim()) {
      toast.error('Digite uma mensagem para melhorar');
      return;
    }

    setLoading(true);
    try {
      const res = await base44.functions.invoke('whatsappAIDraft', {
        action: 'enhance_message',
        prompt
      });

      setGeneratedMessage(res.data.message);
      if (onMessageGenerated) {
        onMessageGenerated(res.data.message);
      }
      toast.success('Mensagem melhorada!');
    } catch (error) {
      toast.error('Erro ao melhorar mensagem');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    toast.success('Mensagem copiada!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Rascunho com IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Tipo de mensagem</Label>
          <Select value={draftType} onValueChange={setDraftType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Personalizada</SelectItem>
              <SelectItem value="welcome">Boas-vindas</SelectItem>
              <SelectItem value="followup">Acompanhamento</SelectItem>
              <SelectItem value="payment">Lembrete de Pagamento</SelectItem>
              <SelectItem value="promo">Promoção</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>{draftType === 'custom' ? 'Descreva a mensagem' : 'Contexto adicional (opcional)'}</Label>
          <Textarea
            placeholder={draftType === 'custom' 
              ? "Ex: Mensagem para cliente interessado em nosso plano de energia solar..."
              : "Ex: Nome do cliente, valor da conta, etc..."
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-2">
          <Button 
            className="flex-1 bg-purple-600 hover:bg-purple-700" 
            onClick={handleGenerate}
            disabled={loading}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {loading ? 'Gerando...' : 'Gerar com IA'}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleEnhance}
            disabled={loading}
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Melhorar
          </Button>
        </div>

        {generatedMessage && (
          <div className="p-4 bg-purple-50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-purple-900">Mensagem Gerada</Label>
              <Button size="sm" variant="ghost" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-sm text-slate-700">{generatedMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}