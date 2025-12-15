import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from 'npm:@whiskeysockets/baileys@6.7.0';
import { Boom } from 'npm:@hapi/boom@10.0.1';
import pino from 'npm:pino@8.16.2';
import NodeCache from 'npm:node-cache@5.1.2';

const msgRetryCounterCache = new NodeCache();
const logger = pino({ level: 'silent' });

// Estado global persistente
const globalState = {
    sock: null,
    qrCode: null,
    status: 'disconnected',
    connecting: false
};

async function connectToWhatsApp(base44) {
    if (globalState.connecting) {
        console.log('[WhatsApp] Já está tentando conectar...');
        return;
    }

    if (globalState.sock && globalState.status === 'connected') {
        console.log('[WhatsApp] Já está conectado');
        return;
    }

    globalState.connecting = true;
    console.log('[WhatsApp] Iniciando conexão com WhatsApp...');

    try {
        const authDir = '/tmp/baileys_auth_v2';
        await Deno.mkdir(authDir, { recursive: true });

        const { state, saveCreds } = await useMultiFileAuthState(authDir);
        const { version } = await fetchLatestBaileysVersion();

        globalState.sock = makeWASocket({
            version,
            logger,
            printQRInTerminal: true,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger)
            },
            browser: ['Target Sim Platform', 'Chrome', '120.0.0'],
            msgRetryCounterCache,
            generateHighQualityLinkPreview: true,
            defaultQueryTimeoutMs: undefined,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 30000
        });

        globalState.sock.ev.on('creds.update', saveCreds);

        globalState.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            console.log('[WhatsApp] Update:', { connection, hasQr: !!qr });
            
            if (qr) {
                globalState.qrCode = qr;
                globalState.status = 'qr_code';
                
                console.log('[WhatsApp] ✅ QR Code gerado');
                
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
            }
            
            if (connection === 'close') {
                globalState.connecting = false;
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                console.log('[WhatsApp] Conexão fechada. StatusCode:', statusCode, 'Reconectar:', shouldReconnect);
                
                if (shouldReconnect) {
                    globalState.status = 'connecting';
                    setTimeout(() => connectToWhatsApp(base44), 5000);
                } else {
                    globalState.status = 'disconnected';
                    globalState.sock = null;
                    globalState.qrCode = null;
                }
                
                const existing = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
                if (existing.length > 0) {
                    await base44.asServiceRole.entities.WhatsAppSession.update(existing[0].id, {
                        status: globalState.status,
                        qr_code: null
                    });
                }
            } else if (connection === 'open') {
                globalState.connecting = false;
                globalState.status = 'connected';
                globalState.qrCode = null;
                
                const phoneNumber = globalState.sock.user?.id?.split(':')[0];
                console.log('[WhatsApp] ✅✅✅ CONECTADO! Número:', phoneNumber);
                
                const existing = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
                const data = {
                    status: 'connected',
                    qr_code: null,
                    phone_number: phoneNumber,
                    last_connection: new Date().toISOString()
                };
                
                if (existing.length > 0) {
                    await base44.asServiceRole.entities.WhatsAppSession.update(existing[0].id, data);
                } else {
                    await base44.asServiceRole.entities.WhatsAppSession.create({
                        session_id: 'main',
                        ...data
                    });
                }
            } else if (connection === 'connecting') {
                globalState.status = 'connecting';
                console.log('[WhatsApp] Conectando...');
            }
        });

        globalState.sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            
            for (const msg of messages) {
                if (msg.key.fromMe) continue;
                if (!msg.message) continue;
                
                const phone = msg.key.remoteJid?.replace('@s.whatsapp.net', '');
                const text = msg.message.conversation || 
                            msg.message.extendedTextMessage?.text || 
                            '';
                
                if (text) {
                    console.log('[WhatsApp] 📩 Mensagem de:', phone);
                    
                    try {
                        await base44.asServiceRole.entities.WhatsAppMessage.create({
                            phone_number: phone,
                            message: text,
                            status: 'delivered',
                            direction: 'inbound'
                        });
                    } catch (e) {
                        console.error('[WhatsApp] Erro ao salvar mensagem:', e);
                    }
                }
            }
        });

    } catch (error) {
        globalState.connecting = false;
        globalState.status = 'disconnected';
        console.error('[WhatsApp] ❌ Erro na conexão:', error);
        throw error;
    }
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const body = await req.json();
        const { action } = body;
        
        if (action === 'connect' || action === 'disconnect') {
            const user = await base44.auth.me();
            if (!user || user.role !== 'admin') {
                return Response.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        if (action === 'connect') {
            if (globalState.status === 'connected') {
                return Response.json({ 
                    status: 'already_connected',
                    message: 'WhatsApp já conectado'
                });
            }

            await connectToWhatsApp(base44);
            
            return Response.json({ 
                status: globalState.status,
                message: 'Conexão iniciada'
            });
        }

        if (action === 'status') {
            const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
            const latestSession = sessions.length > 0 
                ? sessions.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
                : null;

            return Response.json({
                status: globalState.status,
                qr_code: globalState.qrCode,
                session: latestSession
            });
        }

        if (action === 'disconnect') {
            if (globalState.sock) {
                try {
                    await globalState.sock.logout();
                } catch (e) {
                    console.log('[WhatsApp] Erro no logout:', e);
                }
                globalState.sock = null;
            }
            
            globalState.status = 'disconnected';
            globalState.qrCode = null;
            globalState.connecting = false;

            try {
                await Deno.remove('/tmp/baileys_auth_v2', { recursive: true });
            } catch (e) {}

            const existing = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
            if (existing.length > 0) {
                await base44.asServiceRole.entities.WhatsAppSession.update(existing[0].id, {
                    status: 'disconnected',
                    qr_code: null
                });
            }

            return Response.json({ 
                status: 'disconnected',
                message: 'Desconectado'
            });
        }

        if (action === 'get_socket') {
            return Response.json({
                connected: globalState.status === 'connected',
                status: globalState.status,
                has_socket: !!globalState.sock
            });
        }

        if (action === 'send_message') {
            const { phone_number, message } = body;
            
            if (!globalState.sock || globalState.status !== 'connected') {
                return Response.json({ error: 'WhatsApp não conectado' }, { status: 400 });
            }

            let formattedNumber = phone_number.replace(/\D/g, '');
            if (!formattedNumber.endsWith('@s.whatsapp.net')) {
                formattedNumber = formattedNumber + '@s.whatsapp.net';
            }

            await globalState.sock.sendMessage(formattedNumber, { text: message });
            
            return Response.json({ success: true });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('[WhatsApp] Error:', error);
        return Response.json({ 
            error: error.message
        }, { status: 500 });
    }
});

export { globalState };