import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { hoursBack = 24 } = body;

    const startTime = new Date();
    let syncLog = {
      jobName: 'syncAlerts',
      startedAt: startTime.toISOString(),
      status: 'failed',
      alertsSynced: 0,
      errorMessage: ''
    };

    try {
      // Timestamp em segundos (10 dígitos)
      const beginTime = Math.floor((Date.now() - hoursBack * 60 * 60 * 1000) / 1000);
      const endTime = Math.floor(Date.now() / 1000);

      const stations = await base44.asServiceRole.entities.DeyeStation.list();
      let synced = 0;

      for (const station of stations) {
        // Buscar alertas da estação
        const alertRes = await base44.functions.invoke('deye_request', {
          path: `/station/${station.stationId}/alert/list?beginTime=${beginTime}&endTime=${endTime}&pageSize=100`,
          method: 'GET'
        });

        if (!alertRes.data.ok) {
          continue;
        }

        const alerts = alertRes.data.data?.data?.list || [];

        for (const alert of alerts) {
          const existing = await base44.asServiceRole.entities.DeyeAlert.filter({
            alertId: alert.alertId
          });

          const alertData = {
            alertId: alert.alertId,
            stationId: station.stationId,
            deviceId: alert.deviceId,
            alertType: alert.alertType,
            alertCode: alert.alertCode,
            message: alert.message,
            severity: mapSeverity(alert.severity),
            status: alert.status === '1' ? 'active' : 'resolved',
            occurredAt: new Date(alert.occurredTime * 1000).toISOString(),
            resolvedAt: alert.resolvedTime ? new Date(alert.resolvedTime * 1000).toISOString() : null,
            lastSync: new Date().toISOString(),
            rawData: alert
          };

          if (existing && existing.length > 0) {
            await base44.asServiceRole.entities.DeyeAlert.update(existing[0].id, alertData);
          } else {
            await base44.asServiceRole.entities.DeyeAlert.create(alertData);
          }
          synced++;
        }
      }

      const finishTime = new Date();
      syncLog = {
        jobName: 'syncAlerts',
        startedAt: startTime.toISOString(),
        finishedAt: finishTime.toISOString(),
        status: 'success',
        alertsSynced: synced,
        durationSeconds: Math.round((finishTime - startTime) / 1000)
      };

    } catch (error) {
      const finishTime = new Date();
      syncLog.finishedAt = finishTime.toISOString();
      syncLog.status = 'failed';
      syncLog.errorMessage = error.message;
      syncLog.durationSeconds = Math.round((finishTime - startTime) / 1000);
    }

    await base44.asServiceRole.entities.DeyeSyncLog.create(syncLog);
    return Response.json(syncLog);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function mapSeverity(severityCode) {
  const map = {
    '1': 'critical',
    '2': 'high',
    '3': 'medium',
    '4': 'low',
    '5': 'info'
  };
  return map[severityCode] || 'info';
}