import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { campaign_id } = await req.json();

        // Buscar campanha
        const campaign = await base44.asServiceRole.entities.WhatsAppCampaign.filter({ id: campaign_id });
        if (campaign.length === 0) {
            return Response.json({ error: 'Campaign not found' }, { status: 404 });
        }

        const campaignData = campaign[0];

        // Atualizar status para "sending"
        await base44.asServiceRole.entities.WhatsAppCampaign.update(campaign_id, {
            status: 'sending'
        });

        // Buscar destinatários baseado no segmento
        let recipients = [];
        const allSubscriptions = await base44.asServiceRole.entities.Subscription.list('-created_date', 1000);

        switch (campaignData.target_segment) {
            case 'all':
                recipients = allSubscriptions;
                break;
            case 'active':
                recipients = allSubscriptions.filter(s => s.status === 'active');
                break;
            case 'pending':
                recipients = allSubscriptions.filter(s => s.status === 'pending' || s.status === 'analyzing');
                break;
            case 'residential':
                recipients = allSubscriptions.filter(s => s.customer_type === 'residential');
                break;
            case 'commercial':
                recipients = allSubscriptions.filter(s => s.customer_type === 'commercial');
                break;
            case 'suspended':
                recipients = allSubscriptions.filter(s => s.status === 'suspended');
                break;
        }

        let sentCount = 0;
        let failedCount = 0;

        // Enviar mensagens
        for (const recipient of recipients) {
            try {
                // Substituir variáveis na mensagem
                let personalizedMessage = campaignData.message
                    .replace(/{{nome}}/g, recipient.customer_name || '')
                    .replace(/{{email}}/g, recipient.customer_email || '')
                    .replace(/{{valor_conta}}/g, recipient.average_bill_value?.toFixed(2) || '0')
                    .replace(/{{cidade}}/g, recipient.city || '')
                    .replace(/{{estado}}/g, recipient.state || '');

                // Enviar via função whatsappSendMessage
                await base44.asServiceRole.functions.invoke('whatsappSendMessage', {
                    phone_number: recipient.customer_phone,
                    message: personalizedMessage
                });

                sentCount++;

                // Pequeno delay para evitar spam
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`Failed to send to ${recipient.customer_phone}:`, error);
                failedCount++;
            }
        }

        // Atualizar campanha com resultados
        await base44.asServiceRole.entities.WhatsAppCampaign.update(campaign_id, {
            status: 'completed',
            sent_count: sentCount,
            failed_count: failedCount,
            total_recipients: recipients.length
        });

        return Response.json({
            success: true,
            sent_count: sentCount,
            failed_count: failedCount,
            total_recipients: recipients.length
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});