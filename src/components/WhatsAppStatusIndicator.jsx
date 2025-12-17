import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageCircle, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

export default function WhatsAppStatusIndicator() {
  const [lastStatus, setLastStatus] = useState(null);
  const queryClient = useQueryClient();

  // Buscar configuração ativa
  const { data: configs } = useQuery({
    queryKey: ['evolution-config'],
    queryFn: () => base44.entities.EvolutionConfig.filter({ is_active: true })
  });

  const config = configs?.[0];

  // Verificar status da API
  const { data: status, error } = useQuery({
    queryKey: ['evolution-status-monitor', config?.api_url, config?.instance_name],
    queryFn: async () => {
      if (!config?.api_url || !config?.instance_name) return null;
      
      const res = await base44.functions.invoke('evolutionAPI', {
        action: 'status',
        apiUrl: config.api_url,
        apiKey: config.api_key,
        instanceName: config.instance_name
      });
      return res.data;
    },
    enabled: !!config?.api_url && !!config?.instance_name,
    refetchInterval: 10000, // Verificar a cada 10 segundos
    retry: 2
  });

  // Mutation para criar log
  const createLog = useMutation({
    mutationFn: (logData) => base44.entities.WhatsAppConnectionLog.create(logData)
  });

  // Monitorar mudanças de status
  useEffect(() => {
    if (!config) return;

    const currentStatus = status?.state || (error ? 'error' : null);
    
    // Se mudou o status, registrar log
    if (currentStatus && currentStatus !== lastStatus) {
      const logData = {
        status: currentStatus === 'open' ? 'connected' : currentStatus === 'error' ? 'error' : 'disconnected',
        event_type: currentStatus === 'open' ? 'connection_success' : 
                   currentStatus === 'error' ? 'error' : 
                   currentStatus === 'close' ? 'disconnected' : 'connection_failed',
        message: currentStatus === 'open' ? 'WhatsApp conectado com sucesso' :
                currentStatus === 'error' ? 'Erro ao conectar com Evolution API' :
                currentStatus === 'close' ? 'WhatsApp desconectado' :
                'Falha na conexão',
        error_details: error?.message || status?.error || '',
        instance_name: config.instance_name
      };

      createLog.mutate(logData);

      // Exibir alerta se desconectou ou deu erro
      if (currentStatus !== 'open' && lastStatus === 'open') {
        toast.error('⚠️ WhatsApp desconectado!');
      } else if (currentStatus === 'error') {
        toast.error('❌ Erro na conexão com Evolution API');
      }

      setLastStatus(currentStatus);
    }
  }, [status, error, lastStatus, config]);

  if (!config) return null;

  const connectionStatus = status?.state || (error ? 'error' : 'checking');

  return (
    <div className="flex items-center gap-2">
      {connectionStatus === 'open' ? (
        <Badge className="bg-green-100 text-green-800 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          WhatsApp Online
        </Badge>
      ) : connectionStatus === 'error' || error ? (
        <Badge className="bg-red-100 text-red-800 flex items-center gap-2">
          <WifiOff className="w-3 h-3" />
          API Offline
        </Badge>
      ) : connectionStatus === 'close' ? (
        <Badge className="bg-slate-100 text-slate-800 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-slate-400"></span>
          WhatsApp Offline
        </Badge>
      ) : (
        <Badge className="bg-blue-100 text-blue-800 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
          Verificando...
        </Badge>
      )}
    </div>
  );
}