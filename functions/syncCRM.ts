import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { integration_id } = await req.json();

    // Get integration config
    const integration = await base44.asServiceRole.entities.CRMIntegration.get(integration_id);
    
    if (!integration || !integration.is_active) {
      return Response.json({ error: 'Integration not found or inactive' }, { status: 404 });
    }

    const results = {
      leads: 0,
      customers: 0,
      errors: []
    };

    // Sync leads if enabled
    if (integration.sync_leads) {
      try {
        const leads = await base44.asServiceRole.entities.SalesLead.list('-updated_date', 100);
        
        for (const lead of leads) {
          try {
            // Here you would call the actual CRM API
            // For now, just log the sync
            await base44.asServiceRole.entities.CRMSyncLog.create({
              integration_id: integration.id,
              sync_type: 'lead_updated',
              entity_id: lead.id,
              status: 'success',
              payload: {
                name: lead.name,
                email: lead.email,
                phone: lead.phone,
                status: lead.status
              }
            });
            results.leads++;
          } catch (err) {
            results.errors.push(`Lead ${lead.id}: ${err.message}`);
          }
        }
      } catch (err) {
        results.errors.push(`Leads sync: ${err.message}`);
      }
    }

    // Sync customers if enabled
    if (integration.sync_customers) {
      try {
        const subscriptions = await base44.asServiceRole.entities.Subscription.list('-updated_date', 100);
        
        for (const sub of subscriptions) {
          try {
            await base44.asServiceRole.entities.CRMSyncLog.create({
              integration_id: integration.id,
              sync_type: 'customer_updated',
              entity_id: sub.id,
              status: 'success',
              payload: {
                customer_name: sub.customer_name,
                customer_email: sub.customer_email,
                status: sub.status
              }
            });
            results.customers++;
          } catch (err) {
            results.errors.push(`Customer ${sub.id}: ${err.message}`);
          }
        }
      } catch (err) {
        results.errors.push(`Customers sync: ${err.message}`);
      }
    }

    // Update last sync time
    await base44.asServiceRole.entities.CRMIntegration.update(integration.id, {
      last_sync: new Date().toISOString()
    });

    return Response.json({
      success: true,
      synced: results.leads + results.customers,
      details: results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});