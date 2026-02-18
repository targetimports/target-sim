import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

// URLs base por região - baseado na documentação oficial
// AMEA (Américas) = US1, EU = EU1
const DEYE_API_BASES = {
  'EU': 'https://eu1-developer.deyecloud.com',
  'US': 'https://us1-developer.deyecloud.com',
  'AMEA': 'https://us1-developer.deyecloud.com' // AMEA = Américas = US1
};

// Validar que a região está configurada corretamente
const DEFAULT_REGION = 'US';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const { action, integration_id, power_plant_id, start_time, end_time, manual_token, includeBusinessContext } = body;

    // Buscar configuração - pode ser DeyeIntegration ou DeyeSettings
    let config;
    let configType;
    let integration;
    
    // Para list_stations, buscar settings (não precisa manual_token)
        if (action === 'list_stations') {
          const settings = await base44.asServiceRole.entities.DeyeSettings.list();
          if (!settings || settings.length === 0) {
            console.log('[INIT] ❌ DeyeSettings não encontrada');
            return Response.json({
              status: 'error',
              message: 'Configuração Deye Settings não encontrada'
            }, { status: 404 });
          }
          config = settings[0];
          configType = 'settings';
          console.log('[INIT] ✅ DeyeSettings carregada - region:', config.region);
        } else {
      // Para outras ações, buscar integração específica
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
    }

    // Obter token de autenticação OpenAPI
    let authToken;
    const getAuthToken = async (forceCompanyId = null) => {
      // NUNCA usar manual_token - sempre usar o fluxo OpenAPI correto
      console.log('[AUTH] 🔐 Obtendo token OpenAPI...');
      console.log('[AUTH] forceCompanyId:', forceCompanyId);

      let baseUrl = DEYE_API_BASES[config.region] || DEYE_API_BASES[DEFAULT_REGION];
      let tokenUrl;
      let tokenBody = {};

      // SEMPRE usar integração se disponível (prioridade)
      const isIntegration = configType === 'integration' && config.app_id && config.app_secret;

      if (isIntegration) {
        // Usar método de integração (app_id + app_secret + timestamp)
        const timestamp = Date.now();

        // Construir string para assinatura: appId=XXX&timestamp=YYYZappSecret
        const signString = `appId=${config.app_id}&timestamp=${timestamp}${config.app_secret}`;

        const signature = createHash('sha256')
          .update(signString)
          .digest('hex');

        tokenUrl = `${baseUrl}/v1.0/account/token?appId=${config.app_id}&timestamp=${timestamp}&sign=${signature}`;
        tokenBody = {};

        console.log('[DEBUG] Integration auth - appId:', config.app_id, 'stationId:', config.station_id);
      } else if (config.appId && config.appSecret && config.email && config.password) {
        // Usar método de settings (email + password SHA-256)
        const passwordHash = createHash('sha256')
          .update(config.password)
          .digest('hex');

        tokenUrl = `${baseUrl}/v1.0/account/token`;

        // Usar companyId forçado ou config.companyId ou tentar descobrir
        let companyId = forceCompanyId || config.companyId;
        
        tokenBody = {
          appId: config.appId,
          appSecret: config.appSecret,
          email: config.email,
          password: passwordHash,
          ...(companyId && { companyId: companyId })
        };

        console.log('[DEBUG] Settings auth - appId:', config.appId, 'email:', config.email, 'companyId:', companyId);
      } else {
        throw new Error('Credenciais Deye não configuradas corretamente');
      }

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tokenBody)
      });

      const text = await response.text();
      console.log('[DEBUG] Token response status:', response.status, 'body:', text.substring(0, 300));

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Resposta inválida ao obter token (status ${response.status}): ${text.substring(0, 200)}`);
      }

      // Aceitar sucesso com accessToken presente (pode estar em data.data ou data.accessToken)
      if (data.data?.accessToken) {
        return data.data.accessToken;
      }
      if (data.accessToken) {
        return data.accessToken;
      }
      
      // Se chegou aqui, é erro
      throw new Error(`Falha ao obter token (código: ${data.code || data.status}, msg: ${data.msg || 'desconhecido'}). Resposta completa: ${text.substring(0, 300)}`);
    };

    // Obter companyIds disponíveis
    const getAccountInfo = async () => {
      try {
        const baseUrl = DEYE_API_BASES[config.region] || DEYE_API_BASES[DEFAULT_REGION];
        
        // Primeiro, obter token pessoal (sem companyId)
        let personalToken = await getAuthToken(null);
        
        console.log('[ACCOUNT] Chamando /account/info...');
        const response = await fetch(`${baseUrl}/v1.0/account/info`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${personalToken}`
          },
          body: JSON.stringify({})
        });

        const text = await response.text();
        console.log('[ACCOUNT] Response status:', response.status, 'body:', text.substring(0, 500));

        let data = JSON.parse(text);
        console.log('[ACCOUNT] Parsed data:', JSON.stringify(data).substring(0, 1000));
        console.log('[ACCOUNT] data.data:', JSON.stringify(data.data).substring(0, 500));
        console.log('[ACCOUNT] data.companyList:', JSON.stringify(data.companyList).substring(0, 500));
        
        // Deye retorna em data.data ou diretamente em data
        const accountInfo = data.data || data;
        console.log('[ACCOUNT] accountInfo:', JSON.stringify(accountInfo).substring(0, 500));
        
        const companies = accountInfo.companyList || accountInfo.companies || [];
        
        console.log('[ACCOUNT] Companies encontradas:', companies.length);
        console.log('[ACCOUNT] Companies array:', JSON.stringify(companies).substring(0, 500));
        
        if (companies.length > 0) {
          console.log('[ACCOUNT] ✅ Encontradas', companies.length, 'empresas:', companies.map(c => c.companyId || c.id).join(', '));
          return companies;
        } else {
          console.log('[ACCOUNT] ⚠️ Nenhuma empresa, contexto pessoal apenas');
          return [];
        }
      } catch (error) {
        console.error('[ACCOUNT] ❌ Erro:', error.message);
        return [];
      }
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

        console.log('[DEBUG] callDeyeAPI URL:', url.toString());
        console.log('[DEBUG] callDeyeAPI params:', JSON.stringify(params));
        console.log('[DEBUG] callDeyeAPI token:', authToken.substring(0, 50) + '...');

        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(params)
        });

        const text = await response.text();

        console.log('[DEBUG] callDeyeAPI response status:', response.status);
        console.log('[DEBUG] callDeyeAPI response text:', text.substring(0, 500));

        // Verificar se é JSON válido
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.log('[DEBUG] JSON parse error:', e.message, 'text:', text.substring(0, 300));
          throw new Error(`API Deye retornou resposta inválida (status ${response.status}): ${text.substring(0, 200)}`);
        }

        console.log('[DEBUG] Parsed data:', JSON.stringify(data).substring(0, 300));

        // Sempre retornar a resposta - o caller verifica se foi sucesso
        return data;
      } catch (error) {
        console.log('[DEBUG] callDeyeAPI error:', error.message);
        throw new Error(`Erro ao chamar API Deye em ${endpoint}: ${error.message}`);
      }
    };

    switch (action) {
          case 'list_stations': {
                // Listar todas as estações com paginação
                try {
                  console.log('[LIST] ⚙️ Iniciando list_stations...');
                  console.log('[LIST] authToken:', authToken.substring(0, 50) + '...');
                  console.log('[LIST] includeBusinessContext:', includeBusinessContext);

                  // Primeira tentativa: listar no contexto atual (pessoal)
                  console.log('[LIST] 1️⃣ Tentando listar estações no contexto pessoal...');
                  let allStations = [];
                  const pageSize = 100;

                  for (let page = 1; page <= 20; page++) {
                    console.log(`[LIST] Chamando callDeyeAPI para página ${page}...`);
                    const result = await callDeyeAPI('/v1.0/station/list', {
                      page: page,
                      size: pageSize
                    });

                    console.log(`[LIST] Resposta página ${page}:`, JSON.stringify(result).substring(0, 300));

                    if (result.success === true && result.stationList && result.stationList.length > 0) {
                      allStations = allStations.concat(result.stationList);
                      console.log(`[LIST] ✓ Página ${page}: +${result.stationList.length}. Total: ${allStations.length}`);
                      if (result.stationList.length < pageSize) break;
                    } else {
                      console.log(`[LIST] - Página ${page}: sem estações ou erro`);
                      break;
                    }
                  }

              // Se achou estações E não quer forçar Business context, retorna
              if (allStations.length > 0 && !includeBusinessContext) {
                console.log(`[LIST] ✅ Encontradas ${allStations.length} estações no contexto pessoal`);
                return Response.json({
                  status: 'success',
                  total: allStations.length,
                  stations: allStations,
                  context: 'personal'
                });
              }

              // Tentar descobrir empresas (Business context)
              console.log('[LIST] 2️⃣ Descobrindo empresas (Business context)...');
              const companies = await getAccountInfo();

              if (companies && companies.length > 0) {
                console.log(`[LIST] 🏢 Encontradas ${companies.length} empresas:`, companies.map(c => c.companyId).join(', '));

                let businessStations = [];
                let successCompany = null;

                // Tentar cada empresa
                for (const company of companies) {
                  console.log(`[LIST] 🔍 Tentando empresa: ${company.companyId} (${company.companyName})`);

                  // Regenerar token com companyId
                  authToken = await getAuthToken(company.companyId);

                  let companyStations = [];
                  for (let page = 1; page <= 20; page++) {
                    const result = await callDeyeAPI('/v1.0/station/list', {
                      page: page,
                      size: pageSize
                    });

                    if (result.success === true && result.stationList && result.stationList.length > 0) {
                      companyStations = companyStations.concat(result.stationList);
                      console.log(`[LIST] ✓ Empresa ${company.companyId}, página ${page}: +${result.stationList.length}. Total acumulado: ${companyStations.length}`);
                      if (result.stationList.length < pageSize) break;
                    } else {
                      console.log(`[LIST] - Empresa ${company.companyId}: Nenhuma estação na página ${page}`);
                      break;
                    }
                  }

                  if (companyStations.length > 0) {
                    console.log(`[LIST] ✅ Empresa ${company.companyId} tem ${companyStations.length} estações`);
                    businessStations = businessStations.concat(companyStations);
                    if (!successCompany) successCompany = company.companyId;
                  }
                }

                // Consolidar pessoal + business
                let consolidatedStations = allStations.concat(businessStations);
                console.log(`[LIST] 📊 Consolidado: ${allStations.length} pessoal + ${businessStations.length} business = ${consolidatedStations.length} total`);

                if (consolidatedStations.length > 0) {
                  return Response.json({
                    status: 'success',
                    total: consolidatedStations.length,
                    stations: consolidatedStations,
                    context: allStations.length > 0 && businessStations.length > 0 ? 'both' : (businessStations.length > 0 ? 'business' : 'personal'),
                    breakdown: {
                      personal: allStations.length,
                      business: businessStations.length,
                      successCompanies: companies.filter(c => businessStations.some(s => true)).map(c => c.companyId)
                    }
                  });
                }

                return Response.json({
                  status: 'error',
                  message: 'Nenhuma estação encontrada em nenhuma das empresas',
                  companies: companies.map(c => ({id: c.companyId, name: c.companyName}))
                }, { status: 400 });
              }

              return Response.json({
                status: 'error',
                message: 'Nenhuma estação encontrada e nenhuma empresa configurada'
              }, { status: 400 });
            } catch (error) {
              console.error('[LIST] Erro:', error);
              return Response.json({
                status: 'error',
                message: error.message
              }, { status: 400 });
            }
          }

          case 'get_station_by_id': {
            // Buscar estação específica por ID
            try {
              const result = await callDeyeAPI('/v1.0/station/latest', {
                stationId: integration.station_id
              });

              if (result.success === true) {
                return Response.json({
                  status: 'success',
                  data: result
                });
              } else {
                throw new Error(result.msg || 'Estação não encontrada');
              }
            } catch (error) {
              return Response.json({
                status: 'error',
                message: error.message
              }, { status: 400 });
            }
          }

          case 'test_connection': {
            try {
              // Testar conexão buscando estação específica
              const result = await callDeyeAPI('/v1.0/station/latest', {
                stationId: integration.station_id
              });

          console.log('[TEST] Result completo:', JSON.stringify(result));

          // API Deye retorna success: true para sucesso
          const isSuccess = result.success === true;
          const errorMessage = !isSuccess ? (result.msg || result.message || `Código: ${result.code}`) : null;

          console.log('[TEST] isSuccess:', isSuccess, 'errorMessage:', errorMessage);

          // Atualizar status apenas se for uma integração (não settings)
          if (integration) {
            await base44.asServiceRole.entities.DeyeIntegration.update(integration.id, {
              sync_status: isSuccess ? 'success' : 'error',
              error_message: errorMessage,
              last_sync: new Date().toISOString()
            });
          } else if (configType === 'settings') {
            await base44.asServiceRole.entities.DeyeSettings.update(config.id, {
              lastTestStatus: isSuccess ? 'success' : 'failed',
              lastTestMessage: isSuccess ? 'Conexão testada com sucesso' : errorMessage,
              lastTestDate: new Date().toISOString()
            });
          }

          return Response.json({
            status: isSuccess ? 'success' : 'error',
            message: isSuccess ? 'Conexão testada com sucesso' : (errorMessage || 'Erro desconhecido'),
            data: isSuccess ? result : null,
            debug: { result, isSuccess }
          });
        } catch (error) {
          console.log('[TEST] Erro:', error.message);

          if (integration) {
            await base44.asServiceRole.entities.DeyeIntegration.update(integration.id, {
              sync_status: 'error',
              error_message: error.message,
              last_sync: new Date().toISOString()
            });
          } else if (configType === 'settings') {
            await base44.asServiceRole.entities.DeyeSettings.update(config.id, {
              lastTestStatus: 'failed',
              lastTestMessage: error.message,
              lastTestDate: new Date().toISOString()
            });
          }

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
        // Buscar geração mensal da API Deye
        try {
          const result = await callDeyeAPI('/v1.0/station/history', {
            stationId: integration.station_id,
            ...(start_time && { startTime: start_time }),
            ...(end_time && { endTime: end_time })
          });

          if (result.success === true && result.stationMonthList && result.stationMonthList.length > 0) {
            // Buscar planta para atualizar MonthlyGeneration
            const plants = await base44.asServiceRole.entities.PowerPlant.filter({
              id: integration.power_plant_id
            });

            if (plants.length > 0) {
              const plant = plants[0];
              let syncedCount = 0;

              // Processar cada mês de geração
              for (const item of result.stationMonthList) {
                try {
                  // Extrair ano-mês (Deye usa YYYY-MM)
                  const referenceMonth = item.statisticsMonth;
                  if (!referenceMonth || !/^\d{4}-\d{2}$/.test(referenceMonth)) continue;

                  // Buscar registro existente
                  const existing = await base44.asServiceRole.entities.MonthlyGeneration.filter({
                    power_plant_id: integration.power_plant_id,
                    reference_month: referenceMonth
                  });

                  // Dados do inversor vêm da Deye (em kWh)
                  const inverterGeneration = parseFloat(item.energy) || 0;

                  const genData = {
                    power_plant_id: integration.power_plant_id,
                    power_plant_name: plant.name,
                    reference_month: referenceMonth,
                    reading_date: new Date().toISOString().split('T')[0],
                    inverter_generation_kwh: inverterGeneration,
                    generated_kwh: inverterGeneration,
                    status: 'confirmed',
                    source: 'other',
                    notes: `Sincronizado via Deye Cloud API (Station: ${integration.station_id})`
                  };

                  if (existing.length > 0) {
                    await base44.asServiceRole.entities.MonthlyGeneration.update(
                      existing[0].id,
                      genData
                    );
                  } else {
                    await base44.asServiceRole.entities.MonthlyGeneration.create(genData);
                  }
                  syncedCount++;
                } catch (itemError) {
                  console.error('[SYNC] Erro ao processar:', itemError.message);
                }
              }

              // Atualizar status da integração
              await base44.asServiceRole.entities.DeyeIntegration.update(integration.id, {
                sync_status: 'success',
                last_sync: new Date().toISOString(),
                error_message: null
              });

              return Response.json({
                status: 'success',
                message: `Geração mensal sincronizada: ${syncedCount} meses`,
                synced: syncedCount,
                data: result
              });
            }
          } else {
            throw new Error(result.msg || 'Resposta inválida da Deye');
          }
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
          results.station_info = infoResult;

          // Dados em tempo real
          const realtimeResult = await callDeyeAPI('/v1.0/station/latest', {
            stationId: integration.station_id
          });
          results.realtime = realtimeResult;

          // Sincronizar geração mensal (últimos 12 meses)
          const now = new Date();
          const endMonth = now.toISOString().substring(0, 7);
          const startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
          const startMonth = startDate.toISOString().substring(0, 7);

          const historyResult = await callDeyeAPI('/v1.0/station/history', {
            stationId: integration.station_id,
            startTime: `${startMonth}-01`,
            endTime: endMonth
          });
          results.monthly_generation = historyResult;

          // Atualizar MonthlyGeneration se houver dados
          if (historyResult.success === true && historyResult.stationMonthList && historyResult.stationMonthList.length > 0) {
            const plants = await base44.asServiceRole.entities.PowerPlant.filter({
              id: integration.power_plant_id
            });

            if (plants.length > 0) {
              const plant = plants[0];
              let syncedCount = 0;

              for (const item of historyResult.stationMonthList) {
                try {
                  const referenceMonth = item.statisticsMonth;
                  if (!referenceMonth || !/^\d{4}-\d{2}$/.test(referenceMonth)) continue;

                  const existing = await base44.asServiceRole.entities.MonthlyGeneration.filter({
                    power_plant_id: integration.power_plant_id,
                    reference_month: referenceMonth
                  });

                  const inverterGeneration = parseFloat(item.energy) || 0;

                  const genData = {
                    power_plant_id: integration.power_plant_id,
                    power_plant_name: plant.name,
                    reference_month: referenceMonth,
                    reading_date: new Date().toISOString().split('T')[0],
                    inverter_generation_kwh: inverterGeneration,
                    generated_kwh: inverterGeneration,
                    status: 'confirmed',
                    source: 'other',
                    notes: `Sincronizado via Deye Cloud API (${new Date().toLocaleString('pt-BR')})`
                  };

                  if (existing.length > 0) {
                    await base44.asServiceRole.entities.MonthlyGeneration.update(
                      existing[0].id,
                      genData
                    );
                  } else {
                    await base44.asServiceRole.entities.MonthlyGeneration.create(genData);
                  }
                  syncedCount++;
                } catch (itemError) {
                  console.error('[SYNC] Erro ao processar:', itemError.message);
                }
              }

              console.log('[SYNC] Total de meses sincronizados:', syncedCount);
            }
          }

          await base44.asServiceRole.entities.DeyeIntegration.update(integration.id, {
            last_data: results,
            sync_status: 'success',
            last_sync: new Date().toISOString(),
            error_message: null
          });

          return Response.json({
            status: 'success',
            message: 'Sincronização completa',
            data: results
          });
        } catch (error) {
          console.error('[SYNC] Erro na sincronização:', error.message);
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