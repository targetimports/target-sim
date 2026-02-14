import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { hoursBack = 1 } = body;

    const startTime = new Date();
    let syncLog = {
      jobName: 'syncTelemetry',
      startedAt: startTime.toISOString(),
      status: 'failed',
      telemetrySynced: 0,
      errorMessage: ''
    };

    try {
      // Timestamp em segundos (10 dígitos)
      const beginTime = Math.floor((Date.now() - hoursBack * 60 * 60 * 1000) / 1000);
      const endTime = Math.floor(Date.now() / 1000);

      const stations = await base44.asServiceRole.entities.DeyeStation.list();
      let synced = 0;

      for (const station of stations) {
        // Buscar dados de telemetria
        const telRes = await base44.functions.invoke('deye_request', {
          path: `/station/${station.stationId}/realtime`,
          method: 'GET'
        });

        if (!telRes.data.ok) {
          continue;
        }

        const telData = telRes.data.data?.data;
        if (telData && telData.dataTimestamp) {
          // Verificar se já existe
          const existing = await base44.asServiceRole.entities.DeyeTelemetry.filter({
            stationId: station.stationId,
            timestamp: new Date(telData.dataTimestamp * 1000).toISOString()
          });

          const telemetryRecord = {
            stationId: station.stationId,
            timestamp: new Date(telData.dataTimestamp * 1000).toISOString(),
            totalEnergy: telData.totalEnergy,
            dayEnergy: telData.dayEnergy,
            power: telData.power,
            voltage: telData.voltage,
            current: telData.current,
            frequency: telData.frequency,
            temperature: telData.temperature,
            efficiency: telData.efficiency,
            rawData: telData
          };

          if (!existing || existing.length === 0) {
            await base44.asServiceRole.entities.DeyeTelemetry.create(telemetryRecord);
            synced++;
          }
        }
      }

      const finishTime = new Date();
      syncLog = {
        jobName: 'syncTelemetry',
        startedAt: startTime.toISOString(),
        finishedAt: finishTime.toISOString(),
        status: 'success',
        telemetrySynced: synced,
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