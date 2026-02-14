import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const startTime = new Date();
    let syncLog = {
      jobName: 'syncDevices',
      startedAt: startTime.toISOString(),
      status: 'failed',
      devicesSynced: 0,
      errorMessage: ''
    };

    try {
      // Buscar todas as estações locais
      const stations = await base44.asServiceRole.entities.DeyeStation.list();
      let synced = 0;

      for (const station of stations) {
        // Buscar dispositivos da estação
        const devRes = await base44.functions.invoke('deye_request', {
          path: `/station/${station.stationId}/device/list`,
          method: 'GET'
        });

        if (!devRes.data.ok) {
          continue; // Pular se erro
        }

        const devices = devRes.data.data?.data?.list || [];

        for (const device of devices) {
          const existing = await base44.asServiceRole.entities.DeyeDevice.filter({
            deviceId: device.deviceId
          });

          const deviceData = {
            deviceId: device.deviceId,
            stationId: station.stationId,
            deviceName: device.deviceName,
            deviceType: device.deviceType,
            model: device.model,
            serialNumber: device.serialNumber,
            status: device.status === '1' ? 'online' : 'offline',
            firmwareVersion: device.firmwareVersion,
            lastHeartbeat: device.lastHeartbeat ? new Date(device.lastHeartbeat * 1000).toISOString() : null,
            lastSync: new Date().toISOString(),
            rawData: device
          };

          if (existing && existing.length > 0) {
            await base44.asServiceRole.entities.DeyeDevice.update(existing[0].id, deviceData);
          } else {
            await base44.asServiceRole.entities.DeyeDevice.create(deviceData);
          }
          synced++;
        }
      }

      const finishTime = new Date();
      syncLog = {
        jobName: 'syncDevices',
        startedAt: startTime.toISOString(),
        finishedAt: finishTime.toISOString(),
        status: 'success',
        devicesSynced: synced,
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