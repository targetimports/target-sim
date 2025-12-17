import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function ConnectionLogs() {
  const { data: logs = [] } = useQuery({
    queryKey: ['whatsapp-connection-logs'],
    queryFn: () => base44.entities.WhatsAppConnectionLog.list('-created_date', 20)
  });

  const statusConfig = {
    connected: {
      icon: CheckCircle,
      color: 'bg-green-100 text-green-800',
      label: 'Conectado'
    },
    disconnected: {
      icon: XCircle,
      color: 'bg-slate-100 text-slate-800',
      label: 'Desconectado'
    },
    error: {
      icon: AlertCircle,
      color: 'bg-red-100 text-red-800',
      label: 'Erro'
    }
  };

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {logs.map((log) => {
        const config = statusConfig[log.status];
        const Icon = config.icon;

        return (
          <div 
            key={log.id}
            className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <div className="mt-1">
              <Icon className={`w-5 h-5 ${log.status === 'connected' ? 'text-green-600' : 
                                          log.status === 'error' ? 'text-red-600' : 
                                          'text-slate-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <Badge className={config.color}>
                  {config.label}
                </Badge>
                <span className="text-xs text-slate-500">
                  {format(new Date(log.created_date), 'dd/MM/yyyy HH:mm:ss')}
                </span>
              </div>
              <p className="text-sm text-slate-700 font-medium">{log.message}</p>
              {log.error_details && (
                <p className="text-xs text-red-600 mt-1">{log.error_details}</p>
              )}
              {log.instance_name && (
                <p className="text-xs text-slate-500 mt-1">Instância: {log.instance_name}</p>
              )}
            </div>
          </div>
        );
      })}

      {logs.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-500">Nenhum log de conexão registrado</p>
        </div>
      )}
    </div>
  );
}