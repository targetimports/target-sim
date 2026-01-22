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
        
        // Buscar customer existente por email
        const email = sub.email || sub.Email;
        const existing = email ? await base44.asServiceRole.entities.Customer.filter({ email }) : [];

        const cleanedData = {
          gdash_id: sub.gdash_id || sub.GDASH_ID,
          name: sub.name || sub['Nome/Razão Social'],
          email: email,
          phone: sub.phone || sub.Telefone || '',
          cpf_cnpj: sub.cpf_cnpj || sub['CNPJ/CPF'],
          customer_number: sub.customer_number || sub['Número do Cliente'],
          customer_type: sub.customer_type || 'residential',
          address: sub.address || sub['Endereço'] || '',
          city: sub.city || sub['Cidade'] || '',
          state: sub.state || sub['Estado'] || '',
          zip_code: sub.zip_code || sub['CEP'] || '',
          status: sub.status || sub.Status || 'active',
          notes: sub.notes || ''
        };

        if (existing.length > 0) {
          // Atualizar existente
          await base44.asServiceRole.entities.Customer.update(existing[0].id, cleanedData);
          results.updated.push({
            id: existing[0].id,
            name: cleanedData.name,
            email: cleanedData.email
          });
        } else {
          // Criar novo
          const created = await base44.asServiceRole.entities.Customer.create(cleanedData);
          results.created.push({
            id: created.id,
            name: cleanedData.name,
            email: cleanedData.email
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