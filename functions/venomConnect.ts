import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import venom from 'npm:venom-bot@5.0.9';

let venomClient = null;
let qrCodeData = null;
let connectionStatus = 'disconnected';

async function startVenom(base44, sessionName) {
    try {
        venomClient = await venom.create(
            sessionName,
            (base64Qr, asciiQR) => {
                qrCodeData = base64Qr;
                connectionStatus = 'qr_code';
                console.log('[Venom] QR Code gerado');
                
                // Salvar QR no banco
                base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: sessionName })
                    .then(sessions => {
                        const data = {
                            status: 'qr_code',
                            qr_code: base64Qr
                        };
                        if (sessions.length > 0) {
                            base44.asServiceRole.entities.WhatsAppSession.update(sessions[0].id, data);
                        } else {
                            base44.asServiceRole.entities.WhatsAppSession.create({
                                session_id: sessionName,
                                ...data
                            });
                        }
                    });
            },
            (statusSession, session) => {
                console.log('[Venom] Status:', statusSession);
                connectionStatus = statusSession === 'inChat' ? 'connected' : 'connecting';
                
                if (statusSession === 'inChat') {
                    qrCodeData = null;
                    
                    // Atualizar sessão como conectada
                    venomClient.getSessionTokenBrowser().then(token => {
                        base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: sessionName })
                            .then(sessions => {
                                const data = {
                                    status: 'connected',
                                    qr_code: null,
                                    phone_number: token?.me?.user || 'Conectado',
                                    last_connection: new Date().toISOString()
                                };
                                if (sessions.length > 0) {
                                    base44.asServiceRole.entities.WhatsAppSession.update(sessions[0].id, data);
                                }
                            });
                    });
                }
            },
            {
                headless: true,
                devtools: false,
                useChrome: false,
                debug: false,
                logQR: false,
                browserArgs: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        );

        // Escutar mensagens recebidas
        venomClient.onMessage(async (message) => {
            if (message.isGroupMsg === false && !message.fromMe) {
                try {
                    await base44.asServiceRole.entities.WhatsAppMessage.create({
                        phone_number: message.from.replace('@c.us', ''),
                        message: message.body,
                        status: 'delivered',
                        direction: 'inbound'
                    });
                } catch (e) {
                    console.error('[Venom] Erro salvar mensagem:', e);
                }
            }
        });

        console.log('[Venom] ✅ Cliente iniciado');
        return venomClient;

    } catch (error) {
        console.error('[Venom] Erro ao iniciar:', error);
        connectionStatus = 'disconnected';
        throw error;
    }
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    try {
        const body = await req.json();
        const { action, sessionName, phone, message } = body;

        // Verificar autenticação admin
        if (['connect', 'disconnect'].includes(action)) {
            const user = await base44.auth.me();
            if (!user || user.role !== 'admin') {
                return Response.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const session = sessionName || 'venom-session';

        if (action === 'connect') {
            if (connectionStatus === 'connected' && venomClient) {
                return Response.json({
                    success: true,
                    message: 'Já conectado',
                    status: connectionStatus
                });
            }

            // Iniciar Venom em background
            startVenom(base44, session).catch(console.error);

            return Response.json({
                success: true,
                message: 'Iniciando conexão...',
                status: 'connecting'
            });
        }

        if (action === 'status') {
            const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({
                session_id: session
            });

            return Response.json({
                status: connectionStatus,
                qr_code: qrCodeData,
                session: sessions[0] || null,
                client_active: venomClient !== null
            });
        }

        if (action === 'disconnect') {
            if (venomClient) {
                await venomClient.close();
                venomClient = null;
            }

            connectionStatus = 'disconnected';
            qrCodeData = null;

            const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({
                session_id: session
            });

            if (sessions.length > 0) {
                await base44.asServiceRole.entities.WhatsAppSession.update(sessions[0].id, {
                    status: 'disconnected',
                    qr_code: null
                });
            }

            return Response.json({
                success: true,
                message: 'Desconectado'
            });
        }

        if (action === 'send') {
            if (!venomClient || connectionStatus !== 'connected') {
                return Response.json({
                    success: false,
                    error: 'WhatsApp não conectado'
                }, { status: 400 });
            }

            const phoneFormatted = phone.includes('@c.us') ? phone : `${phone.replace(/\D/g, '')}@c.us`;

            await venomClient.sendText(phoneFormatted, message);

            await base44.asServiceRole.entities.WhatsAppMessage.create({
                phone_number: phone.replace(/\D/g, ''),
                message: message,
                status: 'sent',
                direction: 'outbound'
            });

            return Response.json({
                success: true,
                message: 'Mensagem enviada'
            });
        }

        return Response.json({ error: 'Ação inválida' }, { status: 400 });

    } catch (error) {
        console.error('[Venom] Erro na requisição:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});