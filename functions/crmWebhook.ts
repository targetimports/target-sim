import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get webhook secret from query params or headers
    const url = new URL(req.url);
    const secret = url.searchParams.get('secret') || req.headers.get('x-webhook-secret');
    
    if (!secret) {
      return Response.json({ error: 'Missing webhook secret' }, { status: 401 });
    }

    // Verify webhook secret matches an active integration
    const integrations = await base44.asServiceRole.entities.CRMIntegration.filter({
      webhook_secret: secret,
      is_active: true
    });

    if (integrations.length === 0) {
      return Response.json({ error: 'Invalid webhook secret' }, { status: 401 });
    }

    const integration = integrations[0];
    const payload = await req.json();

    // Create lead from CRM data
    // Adjust field mapping based on your CRM structure
    const leadData = {
      name: payload.name || payload.first_name + ' ' + payload.last_name,
      email: payload.email,
      phone: payload.phone || payload.mobile,
      company: payload.company || payload.company_name,
      source: 'crm_webhook',
      status: 'new',
      notes: `Importado do ${integration.crm_type} via webhook`,
      city: payload.city,
      state: payload.state
    };

    // Create the lead
    const lead = await base44.asServiceRole.entities.SalesLead.create(leadData);

    // Log the sync
    await base44.asServiceRole.entities.CRMSyncLog.create({
      integration_id: integration.id,
      sync_type: 'lead_created',
      entity_id: lead.id,
      crm_entity_id: payload.id || payload.crm_id,
      status: 'success',
      payload: payload
    });

    return Response.json({
      success: true,
      lead_id: lead.id,
      message: 'Lead created successfully'
    });
  } catch (error) {
    // Log error
    try {
      const base44 = createClientFromRequest(req);
      const payload = await req.json();
      
      await base44.asServiceRole.entities.CRMSyncLog.create({
        integration_id: 'unknown',
        sync_type: 'lead_created',
        entity_id: 'error',
        status: 'failed',
        error_message: error.message,
        payload: payload
      });
    } catch (logErr) {
      console.error('Failed to log error:', logErr);
    }

    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});