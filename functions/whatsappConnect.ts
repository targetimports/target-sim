import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState
} from 'npm:@whiskeysockets/baileys@6.3.0';
import pino from 'npm:pino@8.16.2';

const logger = pino({ level: 'silent' });

const state = {
    sock: null,
    qr: null,
    status: 'disconnected'
};

async function connect(base44) {
    console.log('[WA] Starting connection...');
    
    const authPath = '/tmp/baileys_session';
    await Deno.mkdir(authPath, { recursive: true }).catch(() => {});

    const { state: authState, saveCreds } = await useMultiFileAuthState(authPath);

    state.sock = makeWASocket({
        auth: authState,
        logger,
        printQRInTerminal: true
    });

    state.sock.ev.on('creds.update', saveCreds);

    state.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            state.qr = qr;
            state.status = 'qr_code';
            console.log('[WA] QR Code generated');
            console.log('[WA] QR length:', qr?.length);

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
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('[WA] Connection closed, reconnect:', shouldReconnect);

            if (shouldReconnect) {
                setTimeout(() => connect(base44), 5000);
            } else {
                state.sock = null;
                state.status = 'disconnected';
                state.qr = null;
            }
        }

        if (connection === 'open') {
            state.status = 'connected';
            state.qr = null;
            
            const phone = state.sock.user?.id?.split(':')[0];
            console.log('[WA] ✅ CONNECTED! Phone:', phone);

            const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
            const data = {
                status: 'connected',
                qr_code: null,
                phone_number: phone,
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
        }
    });

    state.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            if (!msg.message || msg.key.fromMe) continue;

            const phone = msg.key.remoteJid?.replace('@s.whatsapp.net', '');
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

            if (phone && text) {
                await base44.asServiceRole.entities.WhatsAppMessage.create({
                    phone_number: phone,
                    message: text,
                    status: 'delivered',
                    direction: 'inbound'
                }).catch(() => {});
            }
        }
    });
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const { action, phone, message } = await req.json();

        if (['connect', 'disconnect'].includes(action)) {
            const user = await base44.auth.me();
            if (!user || user.role !== 'admin') {
                return Response.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        if (action === 'connect') {
            if (state.status === 'connected') {
                return Response.json({ status: 'connected' });
            }
            connect(base44);
            return Response.json({ status: 'connecting' });
        }

        if (action === 'status') {
            const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
            return Response.json({
                status: state.status,
                qr_code: state.qr,
                session: sessions[0] || null
            });
        }

        if (action === 'disconnect') {
            if (state.sock) {
                await state.sock.logout().catch(() => {});
            }
            state.sock = null;
            state.status = 'disconnected';
            state.qr = null;

            await Deno.remove('/tmp/baileys_session', { recursive: true }).catch(() => {});

            const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
            if (sessions.length > 0) {
                await base44.asServiceRole.entities.WhatsAppSession.update(sessions[0].id, {
                    status: 'disconnected',
                    qr_code: null
                });
            }

            return Response.json({ status: 'disconnected' });
        }

        if (action === 'send') {
            if (!state.sock || state.status !== 'connected') {
                return Response.json({ error: 'Not connected' }, { status: 400 });
            }

            let jid = phone.replace(/\D/g, '');
            if (!jid.endsWith('@s.whatsapp.net')) {
                jid += '@s.whatsapp.net';
            }

            await state.sock.sendMessage(jid, { text: message });
            return Response.json({ success: true });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('[WA] Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

export { state };