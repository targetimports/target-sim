import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 5000; // 5 seconds

// Armazena tentativas de reconexão
let reconnectAttempts = 0;
let lastReconnectTime = null;

async function logConnectionAttempt(base44, status, error = null) {
    const log = {
        timestamp: new Date().toISOString(),
        status,
        attempt: reconnectAttempts,
        error: error || null
    };
    
    console.log('[WhatsApp Monitor] Log:', JSON.stringify(log));
    
    // Salva log no banco
    try {
        await base44.asServiceRole.entities.AuditLog.create({
            user_email: 'system',
            action: 'whatsapp_connection_attempt',
            entity_type: 'WhatsAppSession',
            entity_id: 'main',
            changes: log
        });
    } catch (e) {
        console.error('[WhatsApp Monitor] Failed to save log:', e);
    }
}

async function sendAdminEmail(base44, subject, message) {
    try {
        const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
        
        for (const admin of admins) {
            await base44.asServiceRole.integrations.Core.SendEmail({
                to: admin.email,
                subject: subject,
                body: `<html><body>
                    <h2>${subject}</h2>
                    <p>${message}</p>
                    <p><strong>Horário:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                    <p><a href="${Deno.env.get('BASE44_APP_URL') || 'https://app.base44.com'}/WhatsAppManagement">Acessar Gestão WhatsApp</a></p>
                </body></html>`
            });
        }
        console.log('[WhatsApp Monitor] Email sent to admins');
    } catch (e) {
        console.error('[WhatsApp Monitor] Failed to send email:', e);
    }
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const body = await req.json();
        const { action } = body;
        
        console.log('[WhatsApp Monitor] Action:', action);

        if (action === 'check_and_reconnect') {
            const statusResponse = await base44.functions.invoke('whatsappConnect', { action: 'status' });
            const { status, session } = statusResponse.data;
            
            console.log('[WhatsApp Monitor] Current status:', status);

            if (status === 'disconnected' && session?.last_connection) {
                const lastConnection = new Date(session.last_connection);
                const now = new Date();
                const hoursSinceLastConnection = (now - lastConnection) / (1000 * 60 * 60);
                
                // Reset contador se passou mais de 1 hora desde última tentativa
                if (lastReconnectTime && (now - lastReconnectTime) > 3600000) {
                    reconnectAttempts = 0;
                }
                
                if (hoursSinceLastConnection < 24 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts++;
                    lastReconnectTime = now;
                    
                    console.log(`[WhatsApp Monitor] Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
                    await logConnectionAttempt(base44, 'attempting', null);
                    
                    try {
                        await base44.functions.invoke('whatsappConnect', { action: 'connect' });
                        
                        reconnectAttempts = 0;
                        await logConnectionAttempt(base44, 'success', null);
                        
                        await base44.asServiceRole.entities.Notification.create({
                            user_email: 'admin@targetsim.com',
                            title: 'WhatsApp Reconectado',
                            message: `Reconexão automática bem-sucedida após ${reconnectAttempts} tentativa(s).`,
                            type: 'success',
                            read: false
                        });
                        
                        return Response.json({ 
                            success: true,
                            message: 'Reconnection successful',
                            attempts: reconnectAttempts
                        });
                    } catch (reconnectError) {
                        console.error('[WhatsApp Monitor] Reconnection failed:', reconnectError);
                        await logConnectionAttempt(base44, 'failed', reconnectError.message);
                        
                        // Se atingiu máximo de tentativas, envia email
                        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                            await sendAdminEmail(
                                base44,
                                '🚨 WhatsApp - Falha Crítica de Conexão',
                                `O sistema tentou reconectar ${MAX_RECONNECT_ATTEMPTS} vezes e falhou. 
                                Intervenção manual necessária.<br><br>
                                <strong>Último erro:</strong> ${reconnectError.message}<br>
                                <strong>Última conexão:</strong> ${new Date(session.last_connection).toLocaleString('pt-BR')}`
                            );
                            
                            await base44.asServiceRole.entities.Notification.create({
                                user_email: 'admin@targetsim.com',
                                title: '🚨 WhatsApp - Falha Crítica',
                                message: `Falha após ${MAX_RECONNECT_ATTEMPTS} tentativas. Email enviado aos administradores.`,
                                type: 'alert',
                                read: false
                            });
                        } else {
                            await base44.asServiceRole.entities.Notification.create({
                                user_email: 'admin@targetsim.com',
                                title: 'Erro na Conexão WhatsApp',
                                message: `Tentativa ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} falhou. Nova tentativa em breve.`,
                                type: 'alert',
                                read: false
                            });
                        }
                        
                        return Response.json({ 
                            success: false,
                            message: 'Reconnection failed',
                            attempts: reconnectAttempts,
                            maxAttempts: MAX_RECONNECT_ATTEMPTS,
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
        
        if (action === 'manual_retry') {
            // Reset contador para permitir retry manual
            reconnectAttempts = 0;
            lastReconnectTime = null;
            
            console.log('[WhatsApp Monitor] Manual retry initiated');
            await logConnectionAttempt(base44, 'manual_retry', null);
            
            try {
                await base44.functions.invoke('whatsappConnect', { action: 'connect' });
                
                await logConnectionAttempt(base44, 'manual_success', null);
                
                return Response.json({ 
                    success: true,
                    message: 'Manual reconnection initiated'
                });
            } catch (error) {
                await logConnectionAttempt(base44, 'manual_failed', error.message);
                
                return Response.json({ 
                    success: false,
                    message: 'Manual reconnection failed',
                    error: error.message
                });
            }
        }
        
        if (action === 'get_logs') {
            const logs = await base44.asServiceRole.entities.AuditLog.filter(
                { action: 'whatsapp_connection_attempt' },
                '-created_date',
                50
            );
            
            return Response.json({ 
                success: true,
                logs: logs.map(log => ({
                    timestamp: log.created_date,
                    ...log.changes
                }))
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