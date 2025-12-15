import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const body = await req.json();
        const { action, phone_number, message, scheduled_time, message_id } = body;
        
        console.log('[WhatsApp Scheduler] Action:', action);

        if (action === 'schedule') {
            const user = await base44.auth.me();
            if (!user || user.role !== 'admin') {
                return Response.json({ error: 'Unauthorized' }, { status: 401 });
            }

            const scheduledMsg = await base44.asServiceRole.entities.WhatsAppMessage.create({
                phone_number,
                message,
                status: 'scheduled',
                direction: 'outbound',
                sent_at: scheduled_time
            });

            return Response.json({ 
                success: true,
                message_id: scheduledMsg.id,
                message: 'Mensagem agendada com sucesso'
            });
        }

        if (action === 'process_scheduled') {
            // Busca mensagens agendadas para enviar agora
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            
            const allScheduled = await base44.asServiceRole.entities.WhatsAppMessage.filter({
                status: 'scheduled',
                direction: 'outbound'
            });

            const toSend = allScheduled.filter(msg => {
                const scheduledTime = new Date(msg.sent_at);
                return scheduledTime <= now && scheduledTime >= fiveMinutesAgo;
            });

            console.log(`[WhatsApp Scheduler] Found ${toSend.length} messages to send`);

            const results = [];
            for (const msg of toSend) {
                try {
                    await base44.functions.invoke('whatsappSendMessage', {
                        phone_number: msg.phone_number,
                        message: msg.message
                    });

                    await base44.asServiceRole.entities.WhatsAppMessage.update(msg.id, {
                        status: 'sent'
                    });

                    results.push({ id: msg.id, success: true });
                } catch (error) {
                    console.error(`[WhatsApp Scheduler] Failed to send ${msg.id}:`, error);
                    
                    await base44.asServiceRole.entities.WhatsAppMessage.update(msg.id, {
                        status: 'failed',
                        error_message: error.message
                    });

                    results.push({ id: msg.id, success: false, error: error.message });
                }
            }

            return Response.json({ 
                success: true,
                processed: results.length,
                results
            });
        }

        if (action === 'cancel') {
            const user = await base44.auth.me();
            if (!user || user.role !== 'admin') {
                return Response.json({ error: 'Unauthorized' }, { status: 401 });
            }

            await base44.asServiceRole.entities.WhatsAppMessage.update(message_id, {
                status: 'cancelled'
            });

            return Response.json({ 
                success: true,
                message: 'Mensagem cancelada'
            });
        }

        if (action === 'list_scheduled') {
            const scheduled = await base44.asServiceRole.entities.WhatsAppMessage.filter(
                { status: 'scheduled', direction: 'outbound' },
                'sent_at',
                50
            );

            return Response.json({ 
                success: true,
                messages: scheduled
            });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('[WhatsApp Scheduler] Error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});