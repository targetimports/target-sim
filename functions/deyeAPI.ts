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
          console.log('[START] 🚀 deyeAPI function iniciada');
          const base44 = createClientFromRequest(req);

          console.log('[AUTH] Verificando autenticação...');
          const user = await base44.auth.me();
          if (!user) {
            console.log('[AUTH] ❌ Usuário NÃO autenticado');
            return Response.json({ status: 'error', message: 'Não autenticado' }, { status: 401 });
          }
          console.log('[AUTH] ✅ Usuário autenticado:', user.email);

          const body = await req.json();
          console.log('[BODY] Body recebido:', JSON.stringify(body).substring(0, 200));

          const { action, integration_id, power_plant_id, start_time, end_time, manual_token, includeBusinessContext } = body;
          console.log('[PARAMS] action:', action, 'integration_id:', integration_id, 'power_plant_id:', power_plant_id);

    // Sempre buscar DeyeSettings para credenciais de autenticação
    let config; // credenciais (sempre DeyeSettings)
    let configType = 'settings';
    let integration; // DeyeIntegration (se aplicável)

    console.log('[INIT] Buscando DeyeSettings...');
    const settingsList = await base44.asServiceRole.entities.DeyeSettings.list();
    if (!settingsList || settingsList.length === 0) {
      return Response.json({ status: 'error', message: 'Configuração Deye Settings não encontrada' }, { status: 404 });
    }
    const rawSettings = settingsList[0];
    config = rawSettings.data ?? rawSettings;

    console.log('[INIT] config.region:', config.region);
    console.log('[INIT] config.appId:', config.appId);
    console.log('[INIT] config.appSecret:', config.appSecret ? '✓' : '❌');
    console.log('[INIT] config.email:', config.email);
    console.log('[INIT] config.password:', config.password ? '✓' : '❌');

    const required = ['appId', 'appSecret', 'email', 'password'];
    const missing = required.filter(k => !String(config?.[k] ?? '').trim());
    if (missing.length > 0) {
      return Response.json({ status: 'error', message: `Config Deye incompleta: faltando ${missing.join(', ')}` }, { status: 400 });
    }

    // Para ações que precisam de integração específica, buscá-la separadamente
    if (action !== 'list_stations') {
      try {
        if (integration_id) {
          const integrations = await base44.asServiceRole.entities.DeyeIntegration.filter({ id: integration_id });
          integration = integrations[0];
        } else if (power_plant_id) {
          const integrations = await base44.asServiceRole.entities.DeyeIntegration.filter({ power_plant_id, is_active: true });
          integration = integrations[0];
        }

        if (!integration && action !== 'list_stations') {
          return Response.json({ status: 'error', message: 'Integração Deye não encontrada' }, { status: 404 });
        }
      } catch (error) {
        return Response.json({ status: 'error', message: `Erro ao buscar integração: ${error.message}` }, { status: 400 });
      }
    }

    // Obter token de autenticação OpenAPI
    let authToken;
    const getAuthToken = async (forceCompanyId = null) => {
      // NUNCA usar manual_token - sempre usar o fluxo OpenAPI correto
      console.log('[AUTH] 🔐 Obtendo token OpenAPI...');
      console.log('[AUTH] forceCompanyId:', forceCompanyId);

      // Validar credenciais
      console.log('[AUTH] Validando credenciais:');
      console.log('[AUTH]   config.appId (tipo:', typeof config.appId, '):', config.appId);
      console.log('[AUTH]   config.appSecret (tipo:', typeof config.appSecret, '):', config.appSecret ? '✓ presente' : '❌ FALTANDO');
      console.log('[AUTH]   config.email:', config.email);
      console.log('[AUTH]   config.password:', config.password ? '✓ presente' : '❌ FALTANDO');

      let baseUrl = DEYE_API_BASES[config.region] || DEYE_API_BASES[DEFAULT_REGION];
      console.log('[AUTH] baseUrl:', baseUrl);

      // Método de settings (email + password SHA-256) - é o padrão
      console.log('[AUTH] Verificando IF (appId && appSecret && email && password):', !!(config.appId && config.appSecret && config.email && config.password));
      if (config.appId && config.appSecret && config.email && config.password) {
        const passwordHash = createHash('sha256')
          .update(config.password)
          .digest('hex');

        let companyId = forceCompanyId || config.companyId;

        // ✅ appId vai na QUERY, resto no BODY
        const tokenUrl = `${baseUrl}/v1.0/account/token?appId=${encodeURIComponent(config.appId)}`;
        const tokenBody = {
          appSecret: config.appSecret,
          email: config.email,
          password: passwordHash,
          ...(companyId && { companyId: companyId })
        };

        console.log('[AUTH] 📡 POST', tokenUrl);
        console.log('[AUTH] appId:', config.appId);
        console.log('[AUTH] email:', config.email);
        console.log('[AUTH] Body (sem senha):', JSON.stringify({ appSecret: '***', email: config.email, companyId }));

        const response = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(tokenBody)
        });

        const text = await response.text();
        console.log('[AUTH] Status:', response.status);
        console.log('[AUTH] Response:', text.substring(0, 500));

        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(`❌ JSON parse error (status ${response.status}): ${text.substring(0, 200)}`);
        }

        // Aceitar sucesso com accessToken presente
        const token = data.data?.accessToken || data.accessToken;
        if (token) {
          console.log('[AUTH] ✅ Token obtido:', token.substring(0, 50) + '...');
          return token;
        }

        // Erro
        throw new Error(`❌ Token failed (code: ${data.code || data.status}, msg: ${data.msg || 'unknown'})`);
      } else {
        throw new Error('❌ Credenciais incompletas (appId, appSecret, email, password)');
      }
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
        
        // Deye retorna orgInfoList com a lista de empresas
        // Estrutura: { orgInfoList: [{companyId, companyName, roleName}] }
        const companies = data.orgInfoList || data.data?.orgInfoList || data.data?.companyList || data.companyList || data.data?.companies || [];
        
        console.log('[ACCOUNT] Companies raw:', JSON.stringify(companies).substring(0, 500));
        
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

    // Obter token OpenAPI inicial
    try {
      console.log('[INIT] 🚀 Obtendo token inicial (contexto pessoal)...');
      authToken = await getAuthToken();
      console.log('[INIT] ✅ Token obtido com sucesso');
    } catch (error) {
      console.log('[INIT] ❌ Erro ao obter token:', error.message);
      return Response.json({
        status: 'error',
        message: error.message
      }, { status: 401 });
    }

    // Função auxiliar para fazer requisições à API Deye com token
    const callDeyeAPI = async (endpoint, params = {}) => {
      try {
        const baseUrl = DEYE_API_BASES[config.region] || DEYE_API_BASES[DEFAULT_REGION];
        const url = `${baseUrl}${endpoint}`;

        console.log('[API] 📡 POST', url);
        console.log('[API] Body:', JSON.stringify(params).substring(0, 200));
        console.log('[API] Token:', authToken.substring(0, 50) + '...');

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `bearer ${authToken}`
          },
          body: JSON.stringify(params)
        });

        const text = await response.text();
        console.log('[API] Status:', response.status);
        console.log('[API] Response:', text.substring(0, 500));

        // Verificar se é JSON válido
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(`Invalid JSON (status ${response.status}): ${text.substring(0, 200)}`);
        }

        if (response.status !== 200) {
          const errorMsg = data.msg || data.message || JSON.stringify(data);
          throw new Error(`HTTP ${response.status}: ${errorMsg}`);
        }

        return data;
      } catch (error) {
        console.log('[API] ❌ Error:', error.message);
        throw error;
      }
    };

    switch (action) {
          case 'list_stations': {
                try {
                  console.log('[LIST] ⚙️ list_stations - includeBusinessContext:', includeBusinessContext);

                  // Função para buscar TODAS as páginas de estações
                  const fetchAllStations = async () => {
                    const PAGE_SIZE = 100;
                    let page = 1;
                    let allStations = [];
                    let total = null;

                    while (true) {
                      const result = await callDeyeAPI('/v1.0/station/list', { page, size: PAGE_SIZE });
                      const list = result.stationList || [];
                      allStations = allStations.concat(list);

                      if (total === null) total = result.total || 0;
                      console.log(`[LIST] Página ${page}: +${list.length} estações (${allStations.length}/${total})`);

                      if (list.length < PAGE_SIZE || allStations.length >= total) break;
                      page++;
                    }
                    return allStations;
                  };

                  // Listar no contexto pessoal
                  console.log('[LIST] 1️⃣ Listando estações (contexto pessoal)...');
                  let allStations = await fetchAllStations();
                  console.log(`[LIST] ✅ Personal: ${allStations.length} estações`);

                  // Se achou estações E não quer forçar Business context, retorna
                  if (allStations.length > 0 && !includeBusinessContext) {
                    return Response.json({
                      status: 'success',
                      total: allStations.length,
                      stations: allStations,
                      context: 'personal'
                    });
                  }

              // Fallback: tentar Business context (descobrir empresas)
              console.log('[LIST] 2️⃣ Tentando descobrir empresas (Business context)...');
              const companies = await getAccountInfo();

              let businessStations = [];

              if (companies && companies.length > 0) {
                console.log(`[LIST] 🏢 Encontradas ${companies.length} empresas`);

                // Tentar cada empresa
                for (const company of companies) {
                  console.log(`[LIST] 🔍 Testando empresa: ${company.companyId} (${company.companyName})`);
                  try {
                    // Regenerar token com companyId
                    authToken = await getAuthToken(company.companyId);

                    const companyStations = await fetchAllStations();

                    if (companyStations.length > 0) {
                      businessStations = businessStations.concat(companyStations);
                      console.log(`[LIST] ✅ Empresa ${company.companyId}: +${companyStations.length}`);
                    } else {
                      console.log(`[LIST] - Empresa ${company.companyId}: 0 estações`);
                    }
                  } catch (err) {
                    console.log(`[LIST] ⚠️ Erro na empresa ${company.companyId}:`, err.message);
                  }
                }
              } else {
                console.log('[LIST] ⚠️ Nenhuma empresa encontrada no Business context');
              }

              const totalStations = allStations.concat(businessStations);
              console.log(`[LIST] 📊 Total: ${allStations.length} pessoal + ${businessStations.length} business = ${totalStations.length}`);

              if (totalStations.length > 0) {
                return Response.json({
                  status: 'success',
                  total: totalStations.length,
                  stations: totalStations,
                  context: allStations.length > 0 && businessStations.length > 0 ? 'both' : (businessStations.length > 0 ? 'business' : 'personal')
                });
              }

              return Response.json({
                status: 'error',
                message: 'Nenhuma estação encontrada'
              }, { status: 404 });
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
              // Usar token business context (companyId configurado)
              if (config.companyId) {
                console.log('[TEST] Regenerando token com companyId:', config.companyId);
                authToken = await getAuthToken(config.companyId);
              }

              const stationId = String(integration?.station_id || '');
              console.log('[TEST] Buscando station_id:', stationId);

              // Buscar apenas primeira página para confirmar conexão
              const listResult = await callDeyeAPI('/v1.0/station/list', { page: 1, size: 100 });
              const list = listResult.stationList || [];
              const foundStation = stationId ? list.find(s => String(s.stationId) === stationId) : null;

              console.log('[TEST] Total na página 1:', list.length, '| Encontrou:', !!foundStation);

              const isSuccess = true; // token funcionou = conexão ok
              const warnMsg = stationId && !foundStation ? ` (Station ${stationId} não na pág 1, mas conexão OK)` : '';

              if (integration) {
                await base44.asServiceRole.entities.DeyeIntegration.update(integration.id, {
                  sync_status: 'success',
                  error_message: null,
                  last_sync: new Date().toISOString(),
                  ...(foundStation && { last_data: foundStation })
                });
              }

              return Response.json({
                status: 'success',
                message: `Conexão testada com sucesso${warnMsg}`,
                data: foundStation || null,
                debug: { total: listResult.total, page1Count: list.length, stationId, foundStation: !!foundStation }
              });
        } catch (error) {
          console.log('[TEST] Erro:', error.message);

          if (integration) {
            await base44.asServiceRole.entities.DeyeIntegration.update(integration.id, {
              sync_status: 'error',
              error_message: error.message,
              last_sync: new Date().toISOString()
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