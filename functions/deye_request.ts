import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { path, method = 'GET', payload = {}, retryCount = 0 } = body;

    if (!path) {
      return Response.json({ error: 'path é obrigatório' }, { status: 400 });
    }

    // Obter configurações e token
    const settings = await base44.asServiceRole.entities.DeyeSettings.list();
    if (!settings || settings.length === 0) {
      return Response.json({ error: 'DeyeSettings não encontrado' }, { status: 400 });
    }

    const config = settings[0];
    // AMEA (Américas) = US1, EU = EU1
    const baseURL = (config.region === 'US' || config.region === 'AMEA')
      ? 'https://us1-developer.deyecloud.com/v1.0'
      : 'https://eu1-developer.deyecloud.com/v1.0';

    // Obter token válido
    let authData = await base44.asServiceRole.entities.DeyeAuth.list();
    let token = authData && authData.length > 0 ? authData[0].accessToken : null;

    if (!token) {
      // Tentar obter novo token
      const tokenRes = await base44.functions.invoke('deye_getToken');
      if (!tokenRes.data.success) {
        throw new Error('Falha ao obter token');
      }
      token = tokenRes.data.token;
    }

    // Fazer requisição
    const url = new URL(`${baseURL}${path}`);
    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `bearer ${token}`
      }
    };

    // IMPORTANTE: POST sempre com body JSON (mínimo {})
    if (method === 'POST') {
      fetchOptions.body = JSON.stringify(payload && Object.keys(payload).length > 0 ? payload : {});
    } else if (method !== 'GET' && Object.keys(payload).length > 0) {
      fetchOptions.body = JSON.stringify(payload);
    }

    console.log('[DEBUG] Calling Deye:', method, path, 'with body:', fetchOptions.body);
    
    const response = await fetch(url.toString(), fetchOptions);
    const responseText = await response.text();
    
    console.log('[DEBUG] Response:', response.status, 'body:', responseText.substring(0, 300));
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { raw: responseText };
    }

    // Se 401, tentar refresh de token (apenas 1 vez)
    if (response.status === 401 && retryCount === 0) {
      try {
        const tokenRes = await base44.functions.invoke('deye_getToken');
        if (tokenRes.data.success) {
          // Retry
          return await base44.functions.invoke('deye_request', {
            path,
            method,
            payload,
            retryCount: 1
          });
        }
      } catch (e) {
        // Continuar com erro original
      }
    }

    // Se 429 (rate limit), aplicar backoff exponencial
    if (response.status === 429 && retryCount < 3) {
      const delayMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      await sleep(delayMs);
      return await base44.functions.invoke('deye_request', {
        path,
        method,
        payload,
        retryCount: retryCount + 1
      });
    }

    return Response.json({
      status: response.status,
      ok: response.ok,
      data: responseData
    });

  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});