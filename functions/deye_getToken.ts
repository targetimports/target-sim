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

    // Preparar body da requisição de token - SEMPRE strings!
    const tokenBody = {
      appSecret: String(config.appSecret),
      email: String(config.email),
      password: String(passwordHash)
    };

    if (config.companyId && String(config.companyId).trim() !== '') {
      tokenBody.companyId = String(config.companyId);
    }

    // Requisição de token - IMPORTANTE: appId vai na URL, não no body
    const tokenUrl = new URL(`${baseURL}/account/token`);
    tokenUrl.searchParams.append('appId', config.appId);
    
    // Log para debug
    const url = tokenUrl.toString();
    const bodyStr = JSON.stringify(tokenBody);

    const tokenResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: bodyStr
    });

    const tokenText = await tokenResponse.text();
    let tokenData;
    
    try {
      tokenData = JSON.parse(tokenText);
    } catch (e) {
      return Response.json({ 
        success: false,
        error: `Resposta inválida (status ${tokenResponse.status}): ${tokenText.substring(0, 200)}`,
        debug: {
          url: tokenUrl.toString(),
          statusCode: tokenResponse.status,
          responseBody: tokenText.substring(0, 500)
        }
      }, { status: 500 });
    }

    // Validar resposta - A API retorna accessToken diretamente, não em data.accessToken
    const token = tokenData.accessToken;
    if (!token) {
      return Response.json({
        success: false,
        error: tokenData.msg || 'Token não obtido',
        debug: {
          url: tokenUrl.toString(),
          statusCode: tokenResponse.status,
          responseBody: tokenData
        }
      }, { status: 500 });
    }

    // Salvar token
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const existingAuth = await base44.asServiceRole.entities.DeyeAuth.list();
    if (existingAuth && existingAuth.length > 0) {
      await base44.asServiceRole.entities.DeyeAuth.update(existingAuth[0].id, {
        accessToken: token,
        expiresAt: expiresAt.toISOString(),
        obtainedAt: new Date().toISOString(),
        status: 'valid'
      });
    } else {
      await base44.asServiceRole.entities.DeyeAuth.create({
        accessToken: token,
        expiresAt: expiresAt.toISOString(),
        obtainedAt: new Date().toISOString(),
        status: 'valid'
      });
    }

    return Response.json({
      success: true,
      token: token,
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});