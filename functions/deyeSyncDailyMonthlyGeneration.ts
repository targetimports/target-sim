import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all active Deye integrations
    const integrations = await base44.asServiceRole.entities.DeyeIntegration.filter({
      is_active: true
    });

    if (!integrations || integrations.length === 0) {
      return Response.json({
        status: 'success',
        message: 'Nenhuma integração ativa para sincronizar',
        synced: 0
      });
    }

    let syncedCount = 0;
    const results = [];

    // Sync each active integration
    for (const integration of integrations) {
      try {
        const response = await base44.asServiceRole.functions.invoke('deyeAPI', {
          action: 'sync_all',
          integration_id: integration.id
        });

        results.push({
          integration_id: integration.id,
          power_plant_id: integration.power_plant_id,
          status: response.data?.status || 'unknown',
          message: response.data?.message || ''
        });

        if (response.data?.status === 'success') {
          syncedCount++;
        }
      } catch (error) {
        results.push({
          integration_id: integration.id,
          power_plant_id: integration.power_plant_id,
          status: 'error',
          message: error.message
        });
      }
    }

    return Response.json({
      status: 'success',
      message: `Sincronização diária concluída: ${syncedCount}/${integrations.length} integrações`,
      synced: syncedCount,
      total: integrations.length,
      results
    });
  } catch (error) {
    return Response.json({
      status: 'error',
      message: error.message
    }, { status: 500 });
  }
});