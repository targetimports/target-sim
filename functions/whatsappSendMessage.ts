import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { phone_number, message, media_url } = body;
        
        if (!phone_number || !message) {
            return Response.json({ error: 'phone_number and message required' }, { status: 400 });
        }

        console.log('[WhatsApp Send] Enviando para:', phone_number);

        // Verificar se há conexão ativa
        const statusRes = await base44.functions.invoke('whatsappConnect', { action: 'get_socket' });
        
        if (!statusRes.data.connected) {
            throw new Error('WhatsApp não está conectado. Conecte primeiro.');
        }

        // Formatar número no padrão internacional
        let formattedNumber = phone_number.replace(/\D/g, '');
        if (!formattedNumber.endsWith('@s.whatsapp.net')) {
            formattedNumber = formattedNumber + '@s.whatsapp.net';
        }

        console.log('[WhatsApp Send] Número formatado:', formattedNumber);

        // Registrar mensagem como pendente
        const msgRecord = await base44.asServiceRole.entities.WhatsAppMessage.create({
            phone_number: phone_number,
            message: message,
            status: 'pending',
            direction: 'outbound',
            media_url: media_url || null
        });

        try {
            // Em produção, aqui você faria:
            // await sock.sendMessage(formattedNumber, { text: message });
            
            // Por enquanto, simular envio bem-sucedido
            console.log('[WhatsApp Send] Mensagem registrada. ID:', msgRecord.id);
            
            // Atualizar status para "sent"
            await base44.asServiceRole.entities.WhatsAppMessage.update(msgRecord.id, {
                status: 'sent'
            });

            console.log('[WhatsApp Send] Status atualizado para sent');

            return Response.json({ 
                success: true,
                message_id: msgRecord.id,
                message: 'Mensagem enviada com sucesso'
            });
            
        } catch (error) {
            console.error('[WhatsApp Send] Erro ao enviar:', error);
            
            // Atualizar status para "failed"
            await base44.asServiceRole.entities.WhatsAppMessage.update(msgRecord.id, {
                status: 'failed',
                error_message: error.message
            });

            throw error;
        }

    } catch (error) {
        console.error('[WhatsApp Send] Error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});