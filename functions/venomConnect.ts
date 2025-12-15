import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import venom from 'npm:venom-bot@5.0.29';

let client = null;
let qrCode = null;
let connectionStatus = 'disconnected';
let phoneNumber = null;

async function startVenom(base44) {
    try {
        console.log('[Venom] Starting Venom Bot...');
        qrCode = null;
        connectionStatus = 'connecting';

        client = await venom.create(
            'targetsim-session',
            (base64Qr, asciiQR) => {
                console.log('[Venom] ✅ QR Code generated!');
                console.log('[Venom] QR length:', base64Qr?.length);
                qrCode = base64Qr;
                connectionStatus = 'qrReadSuccess';
            },
            (statusSession) => {
                console.log('[Venom] Status changed to:', statusSession);
                connectionStatus = statusSession;
                
                if (statusSession === 'isLogged' || statusSession === 'qrReadSuccess') {
                    connectionStatus = 'connected';
                }
            },
            {
                headless: true,
                useChrome: false,
                logQR: true,
                disableWelcome: true,
                updatesLog: true,
                browserArgs: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        );

        if (client) {
            console.log('[Venom] Connected successfully');
            connectionStatus = 'connected';
            qrCode = null;

            const me = await client.getHostDevice();
            phoneNumber = me?.id?.user || null;

            // Listen to incoming messages
            client.onMessage(async (message) => {
                try {
                    if (message.isGroupMsg) return;
                    
                    const from = message.from.replace('@c.us', '');
                    const text = message.body || '';

                    if (text) {
                        await base44.asServiceRole.entities.WhatsAppMessage.create({
                            phone_number: from,
                            message: text,
                            status: 'delivered',
                            direction: 'inbound'
                        });
                        console.log('[Venom] Message saved from:', from);
                    }
                } catch (e) {
                    console.error('[Venom] Error saving message:', e);
                }
            });
        }

        return client;
    } catch (error) {
        console.error('[Venom] ❌ Error starting:', error.message);
        console.error('[Venom] Stack:', error.stack);
        connectionStatus = 'disconnected';
        qrCode = null;
        throw error;
    }
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    try {
        const body = await req.json();
        const { action, phone, message } = body;

        // Only admin can connect/disconnect
        if (['connect', 'disconnect'].includes(action)) {
            const user = await base44.auth.me();
            if (!user || user.role !== 'admin') {
                return Response.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        if (action === 'connect') {
            if (connectionStatus === 'connected' && client) {
                return Response.json({ 
                    success: true,
                    message: 'Already connected',
                    status: connectionStatus,
                    phoneNumber
                });
            }

            connectionStatus = 'connecting';
            qrCode = null;
            
            // Inicia conexão em background
            startVenom(base44).catch(err => {
                console.error('[Venom] Connection error:', err);
                connectionStatus = 'disconnected';
            });

            // Aguarda QR code ser gerado (máximo 15 segundos)
            for (let i = 0; i < 30; i++) {
                if (qrCode || connectionStatus === 'connected') {
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            return Response.json({ 
                success: true,
                message: qrCode ? 'QR Code gerado' : 'Gerando QR Code...',
                status: connectionStatus,
                qrCode: qrCode
            });
        }

        if (action === 'status') {
            console.log('[Venom] Status check - Status:', connectionStatus, 'QR exists:', !!qrCode, 'Client exists:', !!client);
            return Response.json({
                status: connectionStatus,
                qrCode: qrCode,
                phoneNumber: phoneNumber,
                debug: {
                    hasClient: !!client,
                    hasQrCode: !!qrCode,
                    qrLength: qrCode?.length || 0
                }
            });
        }

        if (action === 'disconnect') {
            if (client) {
                try {
                    await client.close();
                } catch (e) {
                    console.error('[Venom] Error closing:', e);
                }
            }
            
            client = null;
            connectionStatus = 'disconnected';
            qrCode = null;
            phoneNumber = null;

            return Response.json({ 
                success: true,
                message: 'Disconnected',
                status: 'disconnected' 
            });
        }

        if (action === 'send') {
            if (!client || connectionStatus !== 'connected') {
                return Response.json({ 
                    success: false,
                    error: 'Not connected' 
                }, { status: 400 });
            }

            const chatId = phone.includes('@c.us') ? phone : `${phone.replace(/\D/g, '')}@c.us`;

            await client.sendText(chatId, message);
            
            await base44.asServiceRole.entities.WhatsAppMessage.create({
                phone_number: phone,
                message: message,
                status: 'sent',
                direction: 'outbound'
            });

            return Response.json({ 
                success: true,
                message: 'Message sent' 
            });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('[Venom] Request error:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});