import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

let connectionState = 'disconnected';
let testQRCode = null;

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const body = await req.json();
        const { action } = body;
        
        console.log('[WhatsApp] Action:', action);
        
        // Verificar autenticação
        if (action === 'connect' || action === 'disconnect') {
            const user = await base44.auth.me();
            if (!user || user.role !== 'admin') {
                return Response.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        if (action === 'connect') {
            console.log('[WhatsApp] Gerando QR Code...');

            if (connectionState === 'connected') {
                return Response.json({ 
                    status: 'already_connected',
                    message: 'WhatsApp já está conectado'
                });
            }

            // Gera QR code simulado (formato mais próximo do real)
            // NOTA: Para produção, substituir por integração real com @whiskeysockets/baileys
            connectionState = 'qr_code';
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 15);
            const serverToken = Math.random().toString(36).substring(2, 15);

            // Formato simulado mais próximo do QR real do WhatsApp
            testQRCode = `1@${randomId},${serverToken},${timestamp}`;

            console.log('[WhatsApp] QR Code gerado. IMPORTANTE: Este é um QR de teste.');

            const existing = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
            const data = {
                status: 'qr_code',
                qr_code: testQRCode
            };
            
            if (existing.length > 0) {
                await base44.asServiceRole.entities.WhatsAppSession.update(existing[0].id, data);
                console.log('[WhatsApp] QR atualizado no banco');
            } else {
                await base44.asServiceRole.entities.WhatsAppSession.create({
                    session_id: 'main',
                    ...data
                });
                console.log('[WhatsApp] QR criado no banco');
            }

            return Response.json({ 
                status: 'qr_code',
                message: 'QR Code gerado com sucesso',
                qr_code: testQRCode
            });
        }

        if (action === 'status') {
            const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
            const latestSession = sessions.length > 0 
                ? sessions.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
                : null;

            console.log('[WhatsApp] Status:', connectionState, 'QR:', !!testQRCode, 'Session:', !!latestSession);

            return Response.json({
                status: connectionState,
                qr_code: testQRCode,
                session: latestSession
            });
        }

        if (action === 'disconnect') {
            console.log('[WhatsApp] Desconectando...');
            connectionState = 'disconnected';
            testQRCode = null;

            const existing = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
            if (existing.length > 0) {
                await base44.asServiceRole.entities.WhatsAppSession.update(existing[0].id, {
                    status: 'disconnected',
                    qr_code: null
                });
            }

            return Response.json({ 
                status: 'disconnected',
                message: 'WhatsApp desconectado'
            });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('[WhatsApp] Error:', error);
        return Response.json({ 
            error: error.message,
            details: error.stack
        }, { status: 500 });
    }
});