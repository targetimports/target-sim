import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Tentar obter novo token
    const tokenRes = await base44.functions.invoke('deye_getToken');
    
    if (!tokenRes.data.success) {
      return Response.json({
        success: false,
        message: tokenRes.data.error || 'Falha ao obter token'
      });
    }

    // Tentar fazer uma requisição simples para validar
    const infoRes = await base44.functions.invoke('deye_request', {
      path: '/account/info',
      method: 'GET'
    });

    if (infoRes.data.ok) {
      return Response.json({
        success: true,
        message: 'Conexão bem-sucedida!',
        accountInfo: infoRes.data.data?.data
      });
    } else {
      return Response.json({
        success: false,
        message: `Erro na requisição: ${infoRes.data.status} - ${infoRes.data.data?.msg || 'erro desconhecido'}`
      });
    }

  } catch (error) {
    return Response.json({
      success: false,
      message: error.message
    });
  }
});