import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AIReplySuggestions({ incomingMessage, onSelectSuggestion }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleGetSuggestions = async () => {
    if (!incomingMessage) {
      toast.error('Nenhuma mensagem para analisar');
      return;
    }

    setLoading(true);
    try {
      const res = await base44.functions.invoke('whatsappAIDraft', {
        action: 'suggest_reply',
        incoming_message: incomingMessage
      });

      setSuggestions(res.data.suggestions || []);
      toast.success('Sugestões geradas!');
    } catch (error) {
      toast.error('Erro ao gerar sugestões');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    if (onSelectSuggestion) {
      onSelectSuggestion(suggestion);
    }
    toast.success('Sugestão selecionada');
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-600" />
          Sugestões de Resposta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {incomingMessage && (
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Mensagem recebida:</p>
            <p className="text-sm text-slate-700">{incomingMessage}</p>
          </div>
        )}

        <Button 
          className="w-full bg-yellow-600 hover:bg-yellow-700" 
          onClick={handleGetSuggestions}
          disabled={loading || !incomingMessage}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando sugestões...
            </>
          ) : (
            <>
              <Lightbulb className="w-4 h-4 mr-2" />
              Gerar Sugestões com IA
            </>
          )}
        </Button>

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Clique para usar:</Label>
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectSuggestion(suggestion)}
                className="w-full p-3 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg text-left transition-colors"
              >
                <Badge className="bg-yellow-600 text-white mb-2">Sugestão {idx + 1}</Badge>
                <p className="text-sm text-slate-700">{suggestion}</p>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}