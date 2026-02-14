import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obter configurações
    const settings = await base44.asServiceRole.entities.DeyeSettings.list();
    if (!settings || settings.length === 0) {
      return Response.json({ 
        error: 'Configurações DeyeCloud não encontradas. Acesse a página de configuração.' 
      }, { status: 400 });
    }

    const config = settings[0];
    
    if (!config.enabled) {
      return Response.json({ 
        error: 'Integração DeyeCloud desabilitada' 
      }, { status: 400 });
    }

    // Montar baseURL conforme região
    const baseURLs = {
      'EU': 'https://eu1-developer.deyecloud.com/v1.0',
      'US': 'https://us1-developer.deyecloud.com/v1.0',
      'AMEA': 'https://amea1-developer.deyecloud.com/v1.0'
    };
    const baseURL = baseURLs[config.region] || baseURLs['EU'];

    // Calcular SHA-256 da senha
    const passwordHash = createHash('sha256')
      .update(config.password)
      .digest('hex');

    // Preparar body da requisição de token
    const tokenBody = {
      appSecret: config.appSecret,
      email: config.email,
      password: passwordHash
    };

    if (config.companyId) {
      tokenBody.companyId = config.companyId;
    }

    // Requisição de token
    const tokenUrl = new URL(`${baseURL}/account/token`);
    tokenUrl.searchParams.append('appId', config.appId);
    
    console.log('[DEBUG] Token request - URL:', tokenUrl.toString());
    console.log('[DEBUG] Token request - Body keys:', Object.keys(tokenBody));
    console.log('[DEBUG] Config keys:', Object.keys(config));

    const tokenResponse = await fetch(tokenUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tokenBody)
    });

    const tokenText = await tokenResponse.text();
    console.log('[DEBUG] Token response - Status:', tokenResponse.status);
    console.log('[DEBUG] Token response - Body (first 500 chars):', tokenText.substring(0, 500));
    let tokenData;
    
    try {
      tokenData = JSON.parse(tokenText);
    } catch (e) {
      throw new Error(`Resposta inválida (status ${tokenResponse.status}): ${tokenText.substring(0, 200)}`);
    }

    // Validar resposta
    if (!tokenData.data || !tokenData.data.accessToken) {
      throw new Error(tokenData.msg || 'Token não obtido');
    }

    // Salvar token
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const existingAuth = await base44.asServiceRole.entities.DeyeAuth.list();
    if (existingAuth && existingAuth.length > 0) {
      await base44.asServiceRole.entities.DeyeAuth.update(existingAuth[0].id, {
        accessToken: tokenData.data.accessToken,
        expiresAt: expiresAt.toISOString(),
        obtainedAt: new Date().toISOString(),
        status: 'valid'
      });
    } else {
      await base44.asServiceRole.entities.DeyeAuth.create({
        accessToken: tokenData.data.accessToken,
        expiresAt: expiresAt.toISOString(),
        obtainedAt: new Date().toISOString(),
        status: 'valid'
      });
    }

    return Response.json({
      success: true,
      token: tokenData.data.accessToken,
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});