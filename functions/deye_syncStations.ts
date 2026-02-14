import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const startTime = new Date();
    let syncLog = {
      jobName: 'syncStations',
      startedAt: startTime.toISOString(),
      status: 'failed',
      stationsSynced: 0,
      errorMessage: ''
    };

    try {
      // Buscar estações via API
      const listRes = await base44.functions.invoke('deye_request', {
        path: '/station/list',
        method: 'GET'
      });

      if (!listRes.data.ok || !listRes.data.data?.data?.list) {
        throw new Error(`Erro ao buscar estações: ${listRes.data.data?.msg || 'desconhecido'}`);
      }

      const stations = listRes.data.data.list || [];
      let synced = 0;

      // Upsert cada estação
      for (const station of stations) {
        const existing = await base44.asServiceRole.entities.DeyeStation.filter({
          stationId: station.stationId
        });

        const stationData = {
          stationId: station.stationId,
          stationName: station.stationName,
          alias: station.alias,
          capacity: station.capacity,
          location: station.location,
          latitude: station.latitude,
          longitude: station.longitude,
          status: station.status === '1' ? 'online' : 'offline',
          deviceCount: station.deviceCount || 0,
          lastSync: new Date().toISOString(),
          rawData: station
        };

        if (existing && existing.length > 0) {
          await base44.asServiceRole.entities.DeyeStation.update(existing[0].id, stationData);
        } else {
          await base44.asServiceRole.entities.DeyeStation.create(stationData);
        }
        synced++;
      }

      const finishTime = new Date();
      syncLog = {
        jobName: 'syncStations',
        startedAt: startTime.toISOString(),
        finishedAt: finishTime.toISOString(),
        status: 'success',
        stationsSynced: synced,
        durationSeconds: Math.round((finishTime - startTime) / 1000)
      };

    } catch (error) {
      const finishTime = new Date();
      syncLog.finishedAt = finishTime.toISOString();
      syncLog.status = 'failed';
      syncLog.errorMessage = error.message;
      syncLog.durationSeconds = Math.round((finishTime - startTime) / 1000);
    }

    // Salvar log
    await base44.asServiceRole.entities.DeyeSyncLog.create(syncLog);

    return Response.json(syncLog);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});