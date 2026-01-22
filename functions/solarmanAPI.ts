import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SOLARMAN_API_URL = 'https://globalapi.solarmanpv.com';

async function getSolarmanToken(appId, appSecret) {
  const response = await fetch(`${SOLARMAN_API_URL}/account/v1.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      appId: appId,
      appSecret: appSecret,
      grantType: 'client_credentials'
    })
  });

  if (!response.ok) {
    throw new Error(`Erro ao obter token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function getStationRealTimeData(accessToken, stationId) {
  const response = await fetch(`${SOLARMAN_API_URL}/station/v1.0/realTime`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      stationId: stationId
    })
  });

  if (!response.ok) {
    throw new Error(`Erro ao obter dados: ${response.statusText}`);
  }

  return await response.json();
}

async function getStationList(accessToken) {
  const response = await fetch(`${SOLARMAN_API_URL}/station/v1.0/list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      page: 1,
      size: 100
    })
  });

  if (!response.ok) {
    throw new Error(`Erro ao listar estações: ${response.statusText}`);
  }

  return await response.json();
}

async function getDeviceList(accessToken, stationId) {
  const response = await fetch(`${SOLARMAN_API_URL}/station/v1.0/device`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      stationId: stationId
    })
  });

  if (!response.ok) {
    throw new Error(`Erro ao listar dispositivos: ${response.statusText}`);
  }

  return await response.json();
}

async function getStationAlerts(accessToken, stationId) {
  const response = await fetch(`${SOLARMAN_API_URL}/station/v1.0/alerts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      stationId: stationId,
      page: 1,
      size: 20
    })
  });

  if (!response.ok) {
    throw new Error(`Erro ao obter alertas: ${response.statusText}`);
  }

  return await response.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { action, appId, appSecret, stationId, integrationId } = await req.json();

    let accessToken;
    if (appId && appSecret) {
      accessToken = await getSolarmanToken(appId, appSecret);
    }

    switch (action) {
      case 'test_connection':
        const stations = await getStationList(accessToken);
        return Response.json({ 
          success: true, 
          message: 'Conexão bem-sucedida!',
          stations: stations.stationList || []
        });

      case 'get_realtime_data':
        const realtimeData = await getStationRealTimeData(accessToken, stationId);
        
        if (integrationId) {
          await base44.asServiceRole.entities.SolarmanIntegration.update(integrationId, {
            last_sync: new Date().toISOString(),
            last_data: realtimeData,
            sync_status: 'success',
            error_message: null
          });
        }
        
        return Response.json({ 
          success: true, 
          data: realtimeData 
        });

      case 'get_devices':
        const devices = await getDeviceList(accessToken, stationId);
        return Response.json({ 
          success: true, 
          devices: devices.deviceList || []
        });

      case 'get_alerts':
        const alerts = await getStationAlerts(accessToken, stationId);
        return Response.json({ 
          success: true, 
          alerts: alerts.alarmList || []
        });

      case 'list_stations':
        const allStations = await getStationList(accessToken);
        return Response.json({ 
          success: true, 
          stations: allStations.stationList || []
        });

      default:
        return Response.json({ error: 'Ação inválida' }, { status: 400 });
    }

  } catch (error) {
    console.error('Erro na API Solarman:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});