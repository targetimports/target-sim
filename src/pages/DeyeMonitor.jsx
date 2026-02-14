import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, Loader2, Cloud, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function DeyeMonitor() {
  const queryClient = useQueryClient();
  const [syncInProgress, setSyncInProgress] = useState(false);

  // Buscar estações
  const { data: stations = [] } = useQuery({
    queryKey: ['deye-stations'],
    queryFn: () => base44.entities.DeyeStation.list('-lastSync', 100),
    refetchInterval: 30000 // Recarregar a cada 30s
  });

  // Buscar dispositivos
  const { data: devices = [] } = useQuery({
    queryKey: ['deye-devices'],
    queryFn: () => base44.entities.DeyeDevice.list('-lastSync', 100),
    refetchInterval: 30000
  });

  // Buscar alertas ativos
  const { data: alerts = [] } = useQuery({
    queryKey: ['deye-alerts'],
    queryFn: () => base44.entities.DeyeAlert.filter({ status: 'active' }, '-occurredAt', 50),
    refetchInterval: 60000
  });

  // Buscar logs de sincronização
  const { data: syncLogs = [] } = useQuery({
    queryKey: ['deye-sync-logs'],
    queryFn: () => base44.entities.DeyeSyncLog.list('-startedAt', 20)
  });

  // Buscar telemetria
  const { data: telemetry = [] } = useQuery({
    queryKey: ['deye-telemetry'],
    queryFn: () => base44.entities.DeyeTelemetry.list('-timestamp', 100)
  });

  // Mutações para sincronização
  const syncStations = useMutation({
    mutationFn: () => base44.functions.invoke('deye_syncStations'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deye-stations'] });
      queryClient.invalidateQueries({ queryKey: ['deye-sync-logs'] });
      toast.success('Estações sincronizadas!');
    },
    onError: (error) => {
      toast.error('Erro ao sincronizar estações: ' + error.message);
    }
  });

  const syncDevices = useMutation({
    mutationFn: () => base44.functions.invoke('deye_syncDevices'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deye-devices'] });
      queryClient.invalidateQueries({ queryKey: ['deye-sync-logs'] });
      toast.success('Dispositivos sincronizados!');
    },
    onError: (error) => {
      toast.error('Erro ao sincronizar dispositivos: ' + error.message);
    }
  });

  const syncTelemetry = useMutation({
    mutationFn: () => base44.functions.invoke('deye_syncTelemetry', { hoursBack: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deye-telemetry'] });
      queryClient.invalidateQueries({ queryKey: ['deye-sync-logs'] });
      toast.success('Telemetria sincronizada!');
    },
    onError: (error) => {
      toast.error('Erro ao sincronizar telemetria: ' + error.message);
    }
  });

  const syncAlerts = useMutation({
    mutationFn: () => base44.functions.invoke('deye_syncAlerts', { hoursBack: 24 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deye-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['deye-sync-logs'] });
      toast.success('Alertas sincronizados!');
    },
    onError: (error) => {
      toast.error('Erro ao sincronizar alertas: ' + error.message);
    }
  });

  const handleSyncAll = async () => {
    setSyncInProgress(true);
    try {
      await Promise.all([
        syncStations.mutateAsync(),
        syncDevices.mutateAsync(),
        syncTelemetry.mutateAsync(),
        syncAlerts.mutateAsync()
      ]);
    } finally {
      setSyncInProgress(false);
    }
  };

  const onlineCount = stations.filter(s => s.status === 'online').length;
  const offlineCount = stations.filter(s => s.status === 'offline').length;
  const activeAlertsCount = alerts.filter(a => a.status === 'active').length;
  const lastSyncLog = syncLogs[0];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Monitor DeyeCloud</h1>
            <p className="text-slate-600 mt-2">Acompanhe estações, dispositivos e alertas</p>
          </div>
          <Button
            onClick={handleSyncAll}
            disabled={syncInProgress}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {syncInProgress ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4 mr-2" />
                Sincronizar Tudo
              </>
            )}
          </Button>
        </div>

        {/* Última Sincronização */}
        {lastSyncLog && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">Última sincronização: {lastSyncLog.jobName}</p>
                  <p className="text-sm text-slate-600">
                    {format(new Date(lastSyncLog.startedAt), 'dd/MM/yyyy HH:mm:ss')}
                  </p>
                </div>
                <div className="text-right">
                  <Badge className={
                    lastSyncLog.status === 'success' ? 'bg-emerald-100 text-emerald-800' :
                    lastSyncLog.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {lastSyncLog.status}
                  </Badge>
                  <p className="text-xs text-slate-500 mt-2">
                    {lastSyncLog.durationSeconds}s
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cards de Resumo */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-600">Estações Online</p>
              <p className="text-3xl font-bold text-emerald-600">{onlineCount}</p>
              <p className="text-xs text-slate-500 mt-1">de {stations.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-600">Estações Offline</p>
              <p className="text-3xl font-bold text-red-600">{offlineCount}</p>
              <p className="text-xs text-slate-500 mt-1">de {stations.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-600">Dispositivos</p>
              <p className="text-3xl font-bold text-slate-900">{devices.length}</p>
              <p className="text-xs text-slate-500 mt-1">total</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-600">Alertas Ativos</p>
              <p className={`text-3xl font-bold ${activeAlertsCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {activeAlertsCount}
              </p>
              <p className="text-xs text-slate-500 mt-1">alertas abertos</p>
            </CardContent>
          </Card>
        </div>

        {/* Abas */}
        <Tabs defaultValue="stations" className="space-y-6">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="stations">Estações ({stations.length})</TabsTrigger>
            <TabsTrigger value="devices">Dispositivos ({devices.length})</TabsTrigger>
            <TabsTrigger value="alerts">Alertas ({activeAlertsCount})</TabsTrigger>
            <TabsTrigger value="telemetry">Telemetria</TabsTrigger>
          </TabsList>

          {/* Estações */}
          <TabsContent value="stations">
            <Button onClick={() => syncStations.mutate()} variant="outline" className="mb-4">
              {syncStations.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                'Sincronizar Estações'
              )}
            </Button>
            <div className="grid gap-4">
              {stations.map((station) => (
                <Card key={station.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{station.stationName}</p>
                        <p className="text-sm text-slate-600">{station.alias}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {station.location}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={
                          station.status === 'online' ? 'bg-emerald-100 text-emerald-800' :
                          station.status === 'offline' ? 'bg-red-100 text-red-800' :
                          'bg-slate-100 text-slate-800'
                        }>
                          {station.status}
                        </Badge>
                        <p className="text-sm font-semibold text-slate-900 mt-2">
                          {station.capacity} kW
                        </p>
                        <p className="text-xs text-slate-500">
                          {station.deviceCount} dispositivo(s)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Dispositivos */}
          <TabsContent value="devices">
            <Button onClick={() => syncDevices.mutate()} variant="outline" className="mb-4">
              {syncDevices.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                'Sincronizar Dispositivos'
              )}
            </Button>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.map((device) => (
                <Card key={device.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{device.deviceName}</p>
                        <p className="text-xs text-slate-600">{device.model}</p>
                        <p className="text-xs text-slate-500 mt-1">SN: {device.serialNumber}</p>
                      </div>
                      <Badge className={
                        device.status === 'online' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {device.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Alertas */}
          <TabsContent value="alerts">
            <Button onClick={() => syncAlerts.mutate()} variant="outline" className="mb-4">
              {syncAlerts.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                'Sincronizar Alertas'
              )}
            </Button>
            <div className="grid gap-4">
              {alerts.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                    <p className="font-semibold text-slate-900">Nenhum alerta ativo</p>
                    <p className="text-sm text-slate-600">Seu sistema está operando normalmente.</p>
                  </CardContent>
                </Card>
              ) : (
                alerts.map((alert) => (
                  <Card key={alert.id} className="border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{alert.message}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            Código: {alert.alertCode}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {format(new Date(alert.occurredAt), 'dd/MM/yyyy HH:mm:ss')}
                          </p>
                        </div>
                        <Badge className={
                          alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }>
                          {alert.severity}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Telemetria */}
          <TabsContent value="telemetry">
            <Button onClick={() => syncTelemetry.mutate()} variant="outline" className="mb-4">
              {syncTelemetry.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                'Sincronizar Telemetria'
              )}
            </Button>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Estação</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Timestamp</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Potência (W)</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Energia Dia (kWh)</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Total (kWh)</th>
                  </tr>
                </thead>
                <tbody>
                  {telemetry.map((tel) => {
                    const station = stations.find(s => s.stationId === tel.stationId);
                    return (
                      <tr key={tel.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">{station?.stationName || tel.stationId}</td>
                        <td className="py-3 px-4 text-xs">
                          {format(new Date(tel.timestamp), 'dd/MM HH:mm')}
                        </td>
                        <td className="py-3 px-4 font-semibold">{tel.power?.toFixed(0) || '-'}</td>
                        <td className="py-3 px-4">{tel.dayEnergy?.toFixed(2) || '-'}</td>
                        <td className="py-3 px-4">{tel.totalEnergy?.toFixed(2) || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}