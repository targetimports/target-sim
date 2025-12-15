import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function WhatsAppStatusIndicator() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkHealth();
    
    // Verifica a cada 30 segundos
    const interval = setInterval(checkHealth, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const res = await base44.functions.invoke('whatsappMonitor', { action: 'get_health' });
      setHealth(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error checking WhatsApp health:', error);
      setLoading(false);
    }
  };

  if (loading || !health) {
    return (
      <Badge variant="outline" className="gap-2">
        <MessageCircle className="w-3 h-3" />
        <span className="text-xs">Verificando...</span>
      </Badge>
    );
  }

  const statusConfig = {
    connected: {
      icon: Wifi,
      color: 'bg-green-100 text-green-800 border-green-300',
      label: 'WhatsApp Online',
      description: 'Conectado e funcionando'
    },
    qr_code: {
      icon: MessageCircle,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      label: 'Aguardando QR',
      description: 'Escaneie o QR code para conectar'
    },
    connecting: {
      icon: MessageCircle,
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      label: 'Conectando',
      description: 'Estabelecendo conexão...'
    },
    disconnected: {
      icon: WifiOff,
      color: 'bg-red-100 text-red-800 border-red-300',
      label: 'WhatsApp Offline',
      description: 'Não conectado'
    }
  };

  const config = statusConfig[health.status] || statusConfig.disconnected;
  const Icon = config.icon;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge className={`gap-2 cursor-pointer ${config.color}`}>
          <Icon className="w-3 h-3" />
          <span className="text-xs">{config.label}</span>
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <span className="font-semibold">{config.label}</span>
          </div>
          <p className="text-sm text-slate-600">{config.description}</p>
          
          {health.phone_number && (
            <div className="text-xs text-slate-500 pt-2 border-t">
              <p>Número: {health.phone_number}</p>
            </div>
          )}
          
          {health.uptime !== null && health.connected && (
            <div className="text-xs text-slate-500">
              <p>Online há: {health.uptime} minutos</p>
            </div>
          )}
          
          {!health.connected && health.last_connection && (
            <div className="text-xs text-slate-500">
              <p>Última conexão: {new Date(health.last_connection).toLocaleString('pt-BR')}</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}