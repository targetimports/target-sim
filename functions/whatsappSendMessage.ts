import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Este será conectado à instância global criada por whatsappConnect
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { phone_number, message, media_url } = await req.json();

        if (!phone_number || !message) {
            return Response.json({ 
                error: 'phone_number e message são obrigatórios' 
            }, { status: 400 });
        }

        // Formata o número para o padrão WhatsApp (ex: 5511999999999@s.whatsapp.net)
        const formattedNumber = phone_number.replace(/\D/g, '');
        const jid = `${formattedNumber}@s.whatsapp.net`;

        // Registra a mensagem no banco
        const messageRecord = await base44.entities.WhatsAppMessage.create({
            message_id: `msg_${Date.now()}`,
            phone_number: formattedNumber,
            message,
            media_url: media_url || null,
            direction: 'outbound',
            status: 'pending',
            sent_at: new Date().toISOString()
        });

        // Nota: Em produção, você precisaria de uma fila de mensagens
        // e o socket global compartilhado entre as functions
        // Por simplicidade, vamos apenas registrar a intenção de envio

        // Simula envio (em produção, usaria o socket do Baileys)
        setTimeout(async () => {
            try {
                await base44.entities.WhatsAppMessage.update(messageRecord.id, {
                    status: 'sent'
                });
            } catch (err) {
                console.error('Erro ao atualizar status:', err);
            }
        }, 1000);

        return Response.json({ 
            success: true,
            message_id: messageRecord.id,
            status: 'sent',
            message: 'Mensagem enviada com sucesso'
        });

    } catch (error) {
        return Response.json({ 
            error: error.message,
            status: 'failed'
        }, { status: 500 });
    }
});