import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { subscriptions } = body;

    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
      return Response.json({ error: 'No subscriptions to import' }, { status: 400 });
    }

    const results = {
      created: [],
      updated: [],
      errors: []
    };

    for (let i = 0; i < subscriptions.length; i++) {
      try {
        const sub = subscriptions[i];
        
        // Buscar customer existente por CNPJ/CPF ou email
        const existing = await base44.asServiceRole.entities.Subscription.filter({
          $or: [
            { customer_cpf_cnpj: sub.customer_cpf_cnpj },
            { customer_email: sub.customer_email }
          ]
        });

        const cleanedData = {
          gdash_id: sub.gdash_id || sub.GDASH_ID,
          customer_name: sub.customer_name || sub['Nome/Razão Social'],
          customer_email: sub.customer_email || sub.Email,
          customer_phone: sub.customer_phone || sub.Telefone || '',
          customer_cpf_cnpj: sub.customer_cpf_cnpj || sub['CNPJ/CPF'],
          customer_number: sub.customer_number || sub['Número do Cliente'],
          power_plant_name: sub.power_plant_name || sub.Usina || '',
          business_type: sub.business_type || sub.Negócio || '',
          status: sub.status || sub.Status || 'pending',
          send_email: sub.send_email !== false && (sub['Enviar Email'] !== 'Não'),
          invoice_unlock_password: sub.invoice_unlock_password || sub['Senha para desbloqueio de faturas'] || '',
          notes: sub.notes || ''
        };

        if (existing.length > 0) {
          // Atualizar existente
          await base44.asServiceRole.entities.Subscription.update(existing[0].id, cleanedData);
          results.updated.push({
            id: existing[0].id,
            name: cleanedData.customer_name,
            email: cleanedData.customer_email
          });
        } else {
          // Criar novo
          const created = await base44.asServiceRole.entities.Subscription.create(cleanedData);
          results.created.push({
            id: created.id,
            name: cleanedData.customer_name,
            email: cleanedData.customer_email
          });
        }
      } catch (error) {
        results.errors.push({
          row: i + 1,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      summary: {
        total: subscriptions.length,
        created: results.created.length,
        updated: results.updated.length,
        errors: results.errors.length
      },
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});