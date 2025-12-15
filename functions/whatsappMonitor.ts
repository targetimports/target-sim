import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 5000; // 5 seconds

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const body = await req.json();
        const { action } = body;
        
        console.log('[WhatsApp Monitor] Action:', action);

        if (action === 'check_and_reconnect') {
            // Verifica status atual
            const statusResponse = await base44.functions.invoke('whatsappConnect', { action: 'status' });
            const { status, session } = statusResponse.data;
            
            console.log('[WhatsApp Monitor] Current status:', status);

            // Se desconectado, tenta reconectar
            if (status === 'disconnected' && session?.last_connection) {
                const lastConnection = new Date(session.last_connection);
                const now = new Date();
                const hoursSinceLastConnection = (now - lastConnection) / (1000 * 60 * 60);
                
                // Reconecta se esteve conectado nas últimas 24h
                if (hoursSinceLastConnection < 24) {
                    console.log('[WhatsApp Monitor] Attempting reconnection...');
                    
                    try {
                        await base44.functions.invoke('whatsappConnect', { action: 'connect' });
                        
                        // Notifica admin sobre reconexão
                        await base44.asServiceRole.entities.Notification.create({
                            user_email: 'admin@targetsim.com',
                            title: 'WhatsApp Reconectado',
                            message: 'O sistema reconectou automaticamente o WhatsApp.',
                            type: 'success',
                            read: false
                        });
                        
                        return Response.json({ 
                            success: true,
                            message: 'Reconnection attempt initiated'
                        });
                    } catch (reconnectError) {
                        console.error('[WhatsApp Monitor] Reconnection failed:', reconnectError);
                        
                        // Notifica admin sobre falha
                        await base44.asServiceRole.entities.Notification.create({
                            user_email: 'admin@targetsim.com',
                            title: 'Erro na Conexão WhatsApp',
                            message: 'Falha ao reconectar automaticamente. Verifique a conexão.',
                            type: 'alert',
                            read: false
                        });
                        
                        return Response.json({ 
                            success: false,
                            message: 'Reconnection failed',
                            error: reconnectError.message
                        });
                    }
                }
            }

            return Response.json({ 
                success: true,
                status: status,
                message: 'Status check completed'
            });
        }

        if (action === 'get_health') {
            const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
            const latestSession = sessions.length > 0 
                ? sessions.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
                : null;

            const health = {
                connected: latestSession?.status === 'connected',
                status: latestSession?.status || 'disconnected',
                phone_number: latestSession?.phone_number || null,
                last_connection: latestSession?.last_connection || null,
                uptime: latestSession?.last_connection 
                    ? Math.floor((new Date() - new Date(latestSession.last_connection)) / 1000 / 60) 
                    : null
            };

            return Response.json(health);
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('[WhatsApp Monitor] Error:', error);
        return Response.json({ 
            error: error.message,
            details: error.stack
        }, { status: 500 });
    }
});