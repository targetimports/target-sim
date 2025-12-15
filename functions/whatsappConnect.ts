import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState
} from 'npm:@whiskeysockets/baileys@6.7.8';
import { Boom } from 'npm:@hapi/boom@10.0.1';

let sock = null;
let qrCode = null;
let connectionStatus = 'disconnected';

async function startWhatsApp(base44) {
    try {
        const authPath = '/tmp/baileys_auth';
        
        await Deno.mkdir(authPath, { recursive: true }).catch(() => {});

        const { state, saveCreds } = await useMultiFileAuthState(authPath);

        sock = makeWASocket({
            auth: state,
            printQRInTerminal: true
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                qrCode = qr;
                connectionStatus = 'qr_code';
                console.log('[WhatsApp] QR Code ready');

                try {
                    const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
                    
                    if (sessions.length > 0) {
                        await base44.asServiceRole.entities.WhatsAppSession.update(sessions[0].id, {
                            status: 'qr_code',
                            qr_code: qr
                        });
                    } else {
                        await base44.asServiceRole.entities.WhatsAppSession.create({
                            session_id: 'main',
                            status: 'qr_code',
                            qr_code: qr
                        });
                    }
                } catch (e) {
                    console.error('[WhatsApp] Error saving QR:', e);
                }
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error instanceof Boom) 
                    ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                    : true;

                console.log('[WhatsApp] Connection closed. Reconnect:', shouldReconnect);

                if (shouldReconnect) {
                    setTimeout(() => startWhatsApp(base44), 5000);
                } else {
                    sock = null;
                    connectionStatus = 'disconnected';
                    qrCode = null;
                }
            }

            if (connection === 'open') {
                connectionStatus = 'connected';
                qrCode = null;
                
                const phoneNumber = sock.user?.id?.split(':')[0];
                console.log('[WhatsApp] ✅ Connected:', phoneNumber);

                try {
                    const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
                    const data = {
                        status: 'connected',
                        qr_code: null,
                        phone_number: phoneNumber,
                        last_connection: new Date().toISOString()
                    };

                    if (sessions.length > 0) {
                        await base44.asServiceRole.entities.WhatsAppSession.update(sessions[0].id, data);
                    } else {
                        await base44.asServiceRole.entities.WhatsAppSession.create({
                            session_id: 'main',
                            ...data
                        });
                    }
                } catch (e) {
                    console.error('[WhatsApp] Error saving session:', e);
                }
            }
        });

        sock.ev.on('messages.upsert', async ({ messages }) => {
            for (const msg of messages) {
                if (msg.key.fromMe || !msg.message) continue;

                const from = msg.key.remoteJid.replace('@s.whatsapp.net', '');
                const text = msg.message.conversation || 
                            msg.message.extendedTextMessage?.text || '';

                if (text) {
                    try {
                        await base44.asServiceRole.entities.WhatsAppMessage.create({
                            phone_number: from,
                            message: text,
                            status: 'delivered',
                            direction: 'inbound'
                        });
                        console.log('[WhatsApp] Message saved from:', from);
                    } catch (e) {
                        console.error('[WhatsApp] Error saving message:', e);
                    }
                }
            }
        });

    } catch (error) {
        console.error('[WhatsApp] Error starting:', error);
        throw error;
    }
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    try {
        const body = await req.json();
        const { action, phone, message } = body;

        if (['connect', 'disconnect'].includes(action)) {
            const user = await base44.auth.me();
            if (!user || user.role !== 'admin') {
                return Response.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        if (action === 'connect') {
            if (connectionStatus === 'connected') {
                return Response.json({ 
                    success: true,
                    message: 'Already connected',
                    status: connectionStatus 
                });
            }

            startWhatsApp(base44);
            
            return Response.json({ 
                success: true,
                message: 'Connecting...',
                status: 'connecting' 
            });
        }

        if (action === 'status') {
            const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({ 
                session_id: 'main' 
            });

            return Response.json({
                status: connectionStatus,
                qr_code: qrCode,
                session: sessions[0] || null
            });
        }

        if (action === 'disconnect') {
            if (sock) {
                await sock.logout();
            }
            
            sock = null;
            connectionStatus = 'disconnected';
            qrCode = null;

            await Deno.remove('/tmp/baileys_auth', { recursive: true }).catch(() => {});

            const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({ 
                session_id: 'main' 
            });
            
            if (sessions.length > 0) {
                await base44.asServiceRole.entities.WhatsAppSession.update(sessions[0].id, {
                    status: 'disconnected',
                    qr_code: null
                });
            }

            return Response.json({ 
                success: true,
                message: 'Disconnected',
                status: 'disconnected' 
            });
        }

        if (action === 'send') {
            if (!sock || connectionStatus !== 'connected') {
                return Response.json({ 
                    success: false,
                    error: 'Not connected to WhatsApp' 
                }, { status: 400 });
            }

            const jid = phone.includes('@') ? phone : `${phone.replace(/\D/g, '')}@s.whatsapp.net`;

            await sock.sendMessage(jid, { text: message });
            
            return Response.json({ 
                success: true,
                message: 'Message sent' 
            });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('[WhatsApp] Request error:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});