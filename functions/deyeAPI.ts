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

    // Obter token OpenAPI inicial - usar companyId se disponível (contexto business)
      try {
        if (config.companyId) {
          console.log('[INIT] 🚀 Obtendo token inicial com companyId (contexto business):', config.companyId);
          authToken = await getAuthToken(config.companyId);
        } else {
          console.log('[INIT] 🚀 Obtendo token inicial (contexto pessoal)...');
          authToken = await getAuthToken();
        }
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

                  // 1️⃣ Buscar com token pessoal (sem companyId)
                  console.log('[LIST] 1️⃣ Listando estações (contexto pessoal)...');
                  authToken = await getAuthToken(null);
                  let personalStations = await fetchAllStations();
                  console.log(`[LIST] Pessoal: ${personalStations.length} estações`);

                  // 2️⃣ Se tem companyId, buscar também com contexto business
                  let businessStations = [];
                  if (config.companyId) {
                    console.log('[LIST] 2️⃣ Listando estações (contexto business, companyId:', config.companyId, ')...');
                    authToken = await getAuthToken(config.companyId);
                    businessStations = await fetchAllStations();
                    console.log(`[LIST] Business: ${businessStations.length} estações`);
                  }

                  // Mesclar e deduplicar
                  const seen = new Set();
                  let allStations = [...personalStations, ...businessStations].filter(s => {
                    const id = String(s.stationId || s.id);
                    if (seen.has(id)) return false;
                    seen.add(id);
                    return true;
                  });

                  console.log(`[LIST] ✅ Total após dedup: ${allStations.length} estações`);

                  if (allStations.length > 0) {
                    const ctx = personalStations.length > 0 && businessStations.length > 0 ? 'both'
                      : businessStations.length > 0 ? 'business' : 'personal';
                    return Response.json({
                      status: 'success',
                      total: allStations.length,
                      stations: allStations,
                      context: ctx
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
              console.log('[TEST] Buscando station_id diretamente:', stationId);

              // Buscar a estação diretamente pelo ID (não depende de paginação)
              let stationData = null;
              try {
                const infoResult = await callDeyeAPI('/v1.0/station/info', { stationId });
                stationData = infoResult.stationInfo || infoResult.data || infoResult;
                console.log('[TEST] ✅ Estação encontrada via /station/info');
              } catch (infoErr) {
                console.log('[TEST] /station/info falhou, tentando /station/latest:', infoErr.message);
                try {
                  const latestResult = await callDeyeAPI('/v1.0/station/latest', { stationId });
                  stationData = latestResult.data || latestResult;
                  console.log('[TEST] ✅ Estação encontrada via /station/latest');
                } catch (latestErr) {
                  console.log('[TEST] /station/latest também falhou:', latestErr.message);
                  // Mesmo sem dados da estação, se o token funcionou = conexão OK
                  stationData = null;
                }
              }

              if (integration) {
                await base44.asServiceRole.entities.DeyeIntegration.update(integration.id, {
                  sync_status: 'success',
                  error_message: null,
                  last_sync: new Date().toISOString(),
                  ...(stationData && { last_data: stationData })
                });
              }

              return Response.json({
                status: 'success',
                message: `Conexão testada com sucesso! Station ${stationId} acessível.`,
                data: stationData,
                debug: { stationId, hasData: !!stationData }
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
          // A integração tem app_id e app_secret próprios que podem ter acesso à estação
          // Tentar usar as credenciais da própria integração se disponíveis
          const integrationAppId = integration.app_id;
          const integrationAppSecret = integration.app_secret;
          
          if (integrationAppId && integrationAppSecret && integrationAppId !== config.appId) {
            console.log('[SYNC] Usando credenciais da integração (app_id específico):', integrationAppId);
            // Gerar token com as credenciais da integração
            const baseUrl = DEYE_API_BASES[config.region] || DEYE_API_BASES[DEFAULT_REGION];
            const { createHash } = await import('node:crypto');
            const passwordHash = createHash('sha256').update(config.password).digest('hex');
            const tokenUrl = `${baseUrl}/v1.0/account/token?appId=${encodeURIComponent(integrationAppId)}`;
            const tokenResp = await fetch(tokenUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ appSecret: integrationAppSecret, email: config.email, password: passwordHash })
            });
            const tokenData = await tokenResp.json();
            const token = tokenData.data?.accessToken || tokenData.accessToken;
            if (token) {
              authToken = token;
              console.log('[SYNC] ✅ Token da integração obtido');
            } else {
              console.log('[SYNC] ⚠️ Falha ao obter token da integração, usando token padrão');
            }
          } else if (config.companyId) {
            console.log('[SYNC] Usando contexto business (companyId):', config.companyId);
            authToken = await getAuthToken(config.companyId);
          } else {
            console.log('[SYNC] Sem companyId, tentando buscar companyId via account/info...');
            const companies = await getAccountInfo();
            if (companies.length > 0) {
              const firstCompany = companies[0];
              const cid = firstCompany.companyId || firstCompany.id;
              console.log('[SYNC] Usando primeiro companyId encontrado:', cid);
              authToken = await getAuthToken(cid);
            }
          }

          // Sincronizar todos os dados
          const results = {};

          // Info da estação (opcional, não bloqueia se falhar)
          try {
            const infoResult = await callDeyeAPI('/v1.0/station/latest', { stationId: integration.station_id });
            results.station_info = infoResult;
          } catch (e) {
            console.log('[SYNC] /station/latest falhou (ignorando):', e.message);
          }

          // Sincronizar geração mensal (últimos 12 meses)
          const now = new Date();
          const endDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
          const startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
          const startDateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD

          const stationIdNum = parseInt(integration.station_id, 10);
          // API Deye /station/history espera startTime e endTime no formato YYYY-MM
          const startMonthStr = startDateStr.substring(0, 7); // YYYY-MM
          const endMonthStr = endDate.substring(0, 7); // YYYY-MM
          console.log('[SYNC] stationId (int):', stationIdNum, 'startTime:', startMonthStr, 'endTime:', endMonthStr);
          const historyResult = await callDeyeAPI('/v1.0/station/history', {
            stationId: stationIdNum,
            startTime: startMonthStr,
            endTime: endMonthStr
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