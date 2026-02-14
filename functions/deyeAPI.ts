import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

const DEYE_API_BASE = 'https://eu1-developer.deyecloud.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const { action, integration_id, power_plant_id, start_time, end_time } = body;

    // Buscar configuração da integração
    let integration;
    
    try {
      if (integration_id) {
        const integrations = await base44.asServiceRole.entities.DeyeIntegration.filter({
          id: integration_id
        });
        integration = integrations[0];
      } else if (power_plant_id) {
        const integrations = await base44.asServiceRole.entities.DeyeIntegration.filter({
          power_plant_id,
          is_active: true
        });
        integration = integrations[0];
      }

      if (!integration) {
        return Response.json({
          status: 'error',
          message: 'Integração Deye não encontrada'
        }, { status: 404 });
      }
    } catch (error) {
      return Response.json({
        status: 'error',
        message: `Erro ao buscar integração: ${error.message}`
      }, { status: 400 });
    }

    // Função auxiliar para fazer requisições à API Deye
    const callDeyeAPI = async (endpoint, params = {}) => {
      try {
        const timestamp = Date.now();
        const allParams = {
          appId: integration.app_id,
          timestamp,
          ...params
        };

        // Ordenar parâmetros alfabeticamente
        const sortedKeys = Object.keys(allParams).sort();
        const signString = sortedKeys.map(key => `${key}=${allParams[key]}`).join('&');
        
        // Gerar assinatura
        const signature = createHash('sha256')
          .update(signString + integration.app_secret)
          .digest('hex');

        const url = new URL(`${DEYE_API_BASE}${endpoint}`);
        Object.keys(allParams).forEach(key => url.searchParams.append(key, allParams[key]));
        url.searchParams.append('sign', signature);

        const response = await fetch(url.toString());
        const text = await response.text();
        
        // Verificar se é JSON válido
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(`API Deye retornou HTML/texto inválido (status ${response.status}). Verifique app_id, app_secret e station_id. Resposta: ${text.substring(0, 200)}`);
        }
        
        return data;
      } catch (error) {
        throw new Error(`Erro ao chamar API Deye em ${endpoint}: ${error.message}`);
      }
    };

    switch (action) {
      case 'test_connection': {
        try {
          // Testar conexão buscando lista de estações
          const result = await callDeyeAPI('/v1.0/station/list');
          
          const isSuccess = result.code === 0;
          await base44.asServiceRole.entities.DeyeIntegration.update(integration.id, {
            sync_status: isSuccess ? 'success' : 'error',
            error_message: isSuccess ? null : result.msg,
            last_sync: new Date().toISOString()
          });

          return Response.json({
            status: isSuccess ? 'success' : 'error',
            message: result.msg || 'Conexão testada com sucesso',
            data: result.data
          });
        } catch (error) {
          await base44.asServiceRole.entities.DeyeIntegration.update(integration.id, {
            sync_status: 'error',
            error_message: error.message,
            last_sync: new Date().toISOString()
          });
          
          return Response.json({
            status: 'error',
            message: error.message
          }, { status: 400 });
        }
      }

      case 'get_station_info': {
        // Buscar informações da estação
        const result = await callDeyeAPI('/v1.0/station/latest', {
          stationId: integration.station_id
        });

        if (result.code === 0) {
          await base44.asServiceRole.entities.DeyeIntegration.update(integration.id, {
            last_data: result.data,
            sync_status: 'success',
            last_sync: new Date().toISOString()
          });
        }

        return Response.json({
          status: result.code === 0 ? 'success' : 'error',
          data: result.data
        });
      }

      case 'get_realtime_data': {
        // Buscar dados em tempo real
        const result = await callDeyeAPI('/v1.0/station/latest', {
          stationId: integration.station_id
        });

        return Response.json({
          status: result.code === 0 ? 'success' : 'error',
          data: result.data
        });
      }

      case 'get_monthly_generation': {
        // Buscar geração mensal
        const result = await callDeyeAPI('/station/energy/month', {
          stationId: integration.station_id,
          startTime: start_time,
          endTime: end_time
        });

        if (result.code === 0 && integration.auto_import_generation) {
          // Importar automaticamente para MonthlyGeneration
          const plant = await base44.asServiceRole.entities.PowerPlant.filter({
            id: integration.power_plant_id
          });

          if (plant.length > 0 && result.data?.list) {
            for (const item of result.data.list) {
              const referenceMonth = item.date; // Assumindo formato YYYY-MM
              
              // Verificar se já existe
              const existing = await base44.asServiceRole.entities.MonthlyGeneration.filter({
                power_plant_id: integration.power_plant_id,
                reference_month: referenceMonth
              });

              const genData = {
                power_plant_id: integration.power_plant_id,
                power_plant_name: plant[0].name,
                reference_month: referenceMonth,
                reading_date: new Date().toISOString().split('T')[0],
                inverter_generation_kwh: item.energy || item.generation,
                generated_kwh: item.energy || item.generation,
                status: 'confirmed',
                source: 'other',
                notes: 'Importado automaticamente via Deye Cloud API'
              };

              if (existing.length > 0) {
                await base44.asServiceRole.entities.MonthlyGeneration.update(
                  existing[0].id,
                  genData
                );
              } else {
                await base44.asServiceRole.entities.MonthlyGeneration.create(genData);
              }
            }
          }
        }

        return Response.json({
          status: result.code === 0 ? 'success' : 'error',
          data: result.data
        });
      }

      case 'get_daily_generation': {
        // Buscar geração diária
        const result = await callDeyeAPI('/station/energy/day', {
          stationId: integration.station_id,
          startTime: start_time,
          endTime: end_time
        });

        return Response.json({
          status: result.code === 0 ? 'success' : 'error',
          data: result.data
        });
      }

      case 'sync_all': {
        try {
          // Sincronizar todos os dados
          const results = {};
          
          // Info da estação
          const infoResult = await callDeyeAPI('/station/info', {
            stationId: integration.station_id
          });
          results.station_info = infoResult.data;

          // Dados em tempo real
          const realtimeResult = await callDeyeAPI('/station/realtime', {
            stationId: integration.station_id
          });
          results.realtime = realtimeResult.data;

          await base44.asServiceRole.entities.DeyeIntegration.update(integration.id, {
            last_data: results,
            sync_status: 'success',
            last_sync: new Date().toISOString()
          });

          return Response.json({
            status: 'success',
            data: results
          });
        } catch (error) {
          await base44.asServiceRole.entities.DeyeIntegration.update(integration.id, {
            sync_status: 'error',
            error_message: error.message,
            last_sync: new Date().toISOString()
          });
          
          return Response.json({
            status: 'error',
            message: error.message
          }, { status: 400 });
        }
      }

      default:
        return Response.json({
          status: 'error',
          message: 'Ação não reconhecida'
        }, { status: 400 });
    }

  } catch (error) {
    return Response.json({
      status: 'error',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});