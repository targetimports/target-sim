import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

// URLs base por região - baseado na documentação oficial
const DEYE_API_BASES = {
  'EU': 'https://eu1-developer.deyecloud.com',
  'US': 'https://us1-developer.deyecloud.com',
  'AMEA': 'https://amea1-developer.deyecloud.com'
};

// Validar que a região está configurada corretamente
const DEFAULT_REGION = 'US';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const { action, integration_id, power_plant_id, start_time, end_time } = body;

    // Buscar configuração - pode ser DeyeIntegration ou DeyeSettings
    let config;
    let configType;
    let integration;
    
    try {
      if (integration_id) {
        const integrations = await base44.asServiceRole.entities.DeyeIntegration.filter({
          id: integration_id
        });
        integration = integrations[0];
        config = integration;
        configType = 'integration';
      } else if (power_plant_id) {
        const integrations = await base44.asServiceRole.entities.DeyeIntegration.filter({
          power_plant_id,
          is_active: true
        });
        integration = integrations[0];
        config = integration;
        configType = 'integration';
      } else {
        // Tentar usar DeyeSettings como fallback
        const settings = await base44.asServiceRole.entities.DeyeSettings.list();
        if (settings && settings.length > 0) {
          config = settings[0];
          configType = 'settings';
        }
      }

      if (!config) {
        return Response.json({
          status: 'error',
          message: 'Configuração Deye não encontrada'
        }, { status: 404 });
      }
    } catch (error) {
      return Response.json({
        status: 'error',
        message: `Erro ao buscar configuração: ${error.message}`
      }, { status: 400 });
    }

    // Obter token de autenticação
    let authToken;
    const getAuthToken = async () => {
      let tokenUrl;
      let tokenBody;
      let baseUrl = DEYE_API_BASES[config.region] || DEYE_API_BASES[DEFAULT_REGION];
      
      if (configType === 'integration') {
        // Usar método de integração (app_id + app_secret + timestamp)
        const timestamp = Date.now();
        const tokenParams = {
          appId: config.app_id,
          timestamp
        };

        const sortedKeys = Object.keys(tokenParams).sort();
        const signString = sortedKeys.map(key => `${key}=${tokenParams[key]}`).join('&');
        
        const signature = createHash('sha256')
          .update(signString + config.app_secret)
          .digest('hex');

        const url = new URL(`${baseUrl}/v1.0/account/token`);
        Object.keys(tokenParams).forEach(key => url.searchParams.append(key, tokenParams[key]));
        url.searchParams.append('sign', signature);
        tokenUrl = url.toString();
        tokenBody = JSON.stringify({});
      } else {
        // Usar método de settings (email + password SHA-256)
        const passwordHash = createHash('sha256')
          .update(config.password)
          .digest('hex');

        const url = new URL(`${baseUrl}/v1.0/account/token`);
        url.searchParams.append('appId', config.appId);
        tokenUrl = url.toString();
        
        tokenBody = JSON.stringify({
          appSecret: config.appSecret,
          email: config.email,
          password: passwordHash,
          ...(config.companyId && { companyId: config.companyId })
        });
      }

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: tokenBody
      });
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Resposta inválida ao obter token (status ${response.status}): ${text.substring(0, 200)}`);
      }
      
      // Aceitar sucesso com accessToken presente
      if (data.data?.accessToken) {
        return data.data.accessToken;
      }
      throw new Error(`Falha ao obter token: ${data.msg || data.status || JSON.stringify(data)}`);
    };

    // Obter token uma vez
    try {
      authToken = await getAuthToken();
    } catch (error) {
      return Response.json({
        status: 'error',
        message: error.message
      }, { status: 401 });
    }

    // Função auxiliar para fazer requisições à API Deye com token
    const callDeyeAPI = async (endpoint, params = {}) => {
      try {
        const baseUrl = DEYE_API_BASES[config.region] || DEYE_API_BASES[DEFAULT_REGION];
        const url = new URL(`${baseUrl}${endpoint}`);
        
        // Adicionar parâmetros
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        
        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(params)
        });
        
        const text = await response.text();
        
        // Verificar se é JSON válido
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(`API Deye retornou resposta inválida (status ${response.status}): ${text.substring(0, 200)}`);
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
        const result = await callDeyeAPI('/v1.0/station/history', {
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
        const result = await callDeyeAPI('/v1.0/station/history/power', {
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
          const infoResult = await callDeyeAPI('/v1.0/station/latest', {
            stationId: integration.station_id
          });
          results.station_info = infoResult.data;

          // Dados em tempo real
          const realtimeResult = await callDeyeAPI('/v1.0/station/latest', {
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