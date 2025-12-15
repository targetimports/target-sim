import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from 'npm:@whiskeysockets/baileys@6.7.0';
import { Boom } from 'npm:@hapi/boom@10.0.1';
import pino from 'npm:pino@8.16.2';

// Estado global da conexão
let sock = null;
let qrCode = null;
let connectionStatus = 'disconnected';
let authState = null;

const logger = pino({ level: 'silent' });

async function startSock(base44) {
    const authDir = '/tmp/baileys_auth';
    try {
        await Deno.mkdir(authDir, { recursive: true });
    } catch (e) {
        // Diretório já existe
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    authState = { state, saveCreds };
    
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: state,
        browser: ['Target Sim', 'Chrome', '10.0'],
        markOnlineOnConnect: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        console.log('[WhatsApp] Connection update:', { connection, hasQr: !!qr });
        
        if (qr) {
            qrCode = qr;
            connectionStatus = 'qr_code';
            
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
            
            console.log('[WhatsApp] QR Code gerado');
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('[WhatsApp] Conexão fechada. Reconectar?', shouldReconnect);
            
            if (shouldReconnect) {
                setTimeout(() => startSock(base44), 3000);
            } else {
                connectionStatus = 'disconnected';
                sock = null;
                qrCode = null;
                
                const existing = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
                if (existing.length > 0) {
                    await base44.asServiceRole.entities.WhatsAppSession.update(existing[0].id, {
                        status: 'disconnected',
                        qr_code: null
                    });
                }
            }
        } else if (connection === 'open') {
            console.log('[WhatsApp] ✅ Conectado com sucesso!');
            connectionStatus = 'connected';
            qrCode = null;
            
            const phoneNumber = sock.user?.id?.split(':')[0] || null;
            console.log('[WhatsApp] Número conectado:', phoneNumber);
            
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
        }
    });

    // Listener para mensagens recebidas
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify') {
            for (const msg of messages) {
                if (!msg.key.fromMe && msg.message) {
                    const phone = msg.key.remoteJid;
                    const text = msg.message.conversation || 
                                msg.message.extendedTextMessage?.text || '';
                    
                    console.log('[WhatsApp] Mensagem recebida de:', phone);
                    
                    await base44.asServiceRole.entities.WhatsAppMessage.create({
                        phone_number: phone.replace('@s.whatsapp.net', ''),
                        message: text,
                        status: 'delivered',
                        direction: 'inbound'
                    });
                }
            }
        }
    });
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const body = await req.json();
        const { action } = body;
        
        console.log('[WhatsApp] Action:', action);
        
        if (action === 'connect' || action === 'disconnect') {
            const user = await base44.auth.me();
            if (!user || user.role !== 'admin') {
                return Response.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        if (action === 'connect') {
            console.log('[WhatsApp] Iniciando conexão...');
            
            if (sock && connectionStatus === 'connected') {
                return Response.json({ 
                    status: 'already_connected',
                    message: 'WhatsApp já está conectado'
                });
            }

            try {
                connectionStatus = 'connecting';
                await startSock(base44);
                
                return Response.json({ 
                    status: 'connecting',
                    message: 'Conectando... Aguarde o QR Code'
                });
                
            } catch (error) {
                console.error('[WhatsApp] Erro ao conectar:', error);
                connectionStatus = 'disconnected';
                return Response.json({ 
                    error: 'Erro ao iniciar conexão: ' + error.message 
                }, { status: 500 });
            }
        }

        if (action === 'status') {
            const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
            const latestSession = sessions.length > 0 
                ? sessions.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
                : null;

            return Response.json({
                status: connectionStatus,
                qr_code: qrCode,
                session: latestSession
            });
        }

        if (action === 'disconnect') {
            console.log('[WhatsApp] Desconectando...');
            
            if (sock) {
                try {
                    await sock.logout();
                } catch (e) {
                    console.log('[WhatsApp] Erro ao fazer logout:', e);
                }
                sock = null;
            }
            
            connectionStatus = 'disconnected';
            qrCode = null;

            try {
                await Deno.remove('/tmp/baileys_auth', { recursive: true });
            } catch (e) {
                console.log('[WhatsApp] Erro ao limpar auth:', e);
            }

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

        if (action === 'get_socket') {
            return Response.json({
                connected: !!sock && connectionStatus === 'connected',
                status: connectionStatus,
                has_socket: !!sock
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

export { sock };