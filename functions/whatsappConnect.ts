import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from 'npm:@whiskeysockets/baileys@6.7.8';

const SESSION_PATH = '/tmp/baileys-session';

let globalSocket = null;
let connectionState = 'disconnected';
let qrCodeText = null;

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const body = await req.json();
        const { action } = body;
        
        console.log('[WhatsApp] Action:', action);
        
        // Verificar autenticação apenas para connect e disconnect
        if (action === 'connect' || action === 'disconnect') {
            try {
                const user = await base44.auth.me();
                if (!user || user.role !== 'admin') {
                    return Response.json({ error: 'Unauthorized' }, { status: 401 });
                }
            } catch (authError) {
                console.error('[WhatsApp] Auth error:', authError);
                return Response.json({ error: 'Authentication failed' }, { status: 401 });
            }
        }

        if (action === 'connect') {
            console.log('[WhatsApp] Iniciando conexão...');
            
            if (globalSocket && connectionState === 'connected') {
                console.log('[WhatsApp] Já conectado');
                return Response.json({ 
                    status: 'already_connected',
                    message: 'WhatsApp já está conectado'
                });
            }

            const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
            console.log('[WhatsApp] Auth state carregado');

            const socket = makeWASocket({
                auth: state,
                printQRInTerminal: true
            });

            globalSocket = socket;
            connectionState = 'connecting';

            socket.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                console.log('[WhatsApp] Connection update:', { connection, hasQr: !!qr });

                if (qr) {
                    console.log('[WhatsApp] QR Code gerado!');
                    connectionState = 'qr_code';
                    qrCodeText = qr;
                    
                    try {
                        const existing = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
                        const data = {
                            status: 'qr_code',
                            qr_code: qr
                        };
                        
                        if (existing.length > 0) {
                            await base44.asServiceRole.entities.WhatsAppSession.update(existing[0].id, data);
                        } else {
                            await base44.asServiceRole.entities.WhatsAppSession.create({
                                session_id: 'main',
                                ...data
                            });
                        }
                        console.log('[WhatsApp] QR salvo no banco');
                    } catch (dbError) {
                        console.error('[WhatsApp] Erro ao salvar QR:', dbError);
                    }
                }

                if (connection === 'close') {
                    console.log('[WhatsApp] Conexão fechada');
                    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                    connectionState = 'disconnected';
                    globalSocket = null;
                    qrCodeText = null;
                    
                    const existing = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
                    if (existing.length > 0) {
                        await base44.asServiceRole.entities.WhatsAppSession.update(existing[0].id, {
                            status: 'disconnected'
                        });
                    }
                } else if (connection === 'open') {
                    console.log('[WhatsApp] Conectado com sucesso!');
                    connectionState = 'connected';
                    qrCodeText = null;
                    const phoneNumber = socket.user?.id?.split(':')[0] || '';
                    
                    const existing = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
                    const data = {
                        status: 'connected',
                        phone_number: phoneNumber,
                        last_connection: new Date().toISOString(),
                        qr_code: null
                    };
                    
                    if (existing.length > 0) {
                        await base44.asServiceRole.entities.WhatsAppSession.update(existing[0].id, data);
                    } else {
                        await base44.asServiceRole.entities.WhatsAppSession.create({
                            session_id: 'main',
                            ...data
                        });
                    }
                }
            });

            socket.ev.on('creds.update', saveCreds);

            return Response.json({ 
                status: 'connecting',
                message: 'Conectando... Aguarde o QR Code'
            });
        }

        if (action === 'status') {
            const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
            const latestSession = sessions.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

            return Response.json({
                status: connectionState,
                qr_code: qrCodeText,
                session: latestSession || null
            });
        }

        if (action === 'disconnect') {
            console.log('[WhatsApp] Desconectando...');
            if (globalSocket) {
                await globalSocket.logout();
                globalSocket = null;
                connectionState = 'disconnected';
                qrCodeText = null;

                const existing = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
                if (existing.length > 0) {
                    await base44.asServiceRole.entities.WhatsAppSession.update(existing[0].id, {
                        status: 'disconnected'
                    });
                }
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