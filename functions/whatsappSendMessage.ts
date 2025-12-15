import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { phone_number, message } = body;
        
        if (!phone_number || !message) {
            return Response.json({ error: 'phone_number and message required' }, { status: 400 });
        }

        console.log('[Send] Enviando para:', phone_number);

        // Registrar mensagem
        const msgRecord = await base44.asServiceRole.entities.WhatsAppMessage.create({
            phone_number: phone_number,
            message: message,
            status: 'pending',
            direction: 'outbound'
        });

        try {
            // Enviar via whatsappConnect
            const sendRes = await base44.functions.invoke('whatsappConnect', {
                action: 'send_message',
                phone_number,
                message
            });

            if (!sendRes.data.success) {
                throw new Error('Falha ao enviar');
            }
            
            await base44.asServiceRole.entities.WhatsAppMessage.update(msgRecord.id, {
                status: 'sent'
            });

            return Response.json({ 
                success: true,
                message_id: msgRecord.id
            });
            
        } catch (error) {
            await base44.asServiceRole.entities.WhatsAppMessage.update(msgRecord.id, {
                status: 'failed',
                error_message: error.message
            });

            throw error;
        }

    } catch (error) {
        console.error('[Send] Error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});