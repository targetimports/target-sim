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

    // Tentar fazer uma requisição simples para validar (usando POST como esperado pela API)
    const infoRes = await base44.functions.invoke('deye_request', {
      path: '/station/list',
      method: 'POST'
    });

    if (infoRes.data.ok) {
      return Response.json({
        success: true,
        message: 'Conexão bem-sucedida!',
        data: infoRes.data.data
      });
    } else {
      return Response.json({
        success: false,
        message: `Erro na requisição: ${infoRes.data.status} - ${infoRes.data.data?.msg || 'erro desconhecido'}`,
        statusCode: infoRes.data.status,
        responseData: infoRes.data.data
      });
    }

  } catch (error) {
    return Response.json({
      success: false,
      message: error.message
    });
  }
});