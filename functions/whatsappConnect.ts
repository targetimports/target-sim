import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion
} from 'npm:@whiskeysockets/baileys@6.5.0';
import pino from 'npm:pino@8.16.2';

const logger = pino({ level: 'silent' });

const state = {
    sock: null,
    qr: null,
    status: 'disconnected'
};

async function connect(base44) {
    console.log('[WA] Conectando...');
    
    const authFolder = '/tmp/baileys_auth';
    await Deno.mkdir(authFolder, { recursive: true }).catch(() => {});

    const { state: authState, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();

    state.sock = makeWASocket({
        version,
        auth: authState,
        logger,
        printQRInTerminal: true,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        syncFullHistory: false,
        markOnlineOnConnect: true
    });

    state.sock.ev.on('creds.update', saveCreds);

    state.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            state.qr = qr;
            state.status = 'qr_code';
            console.log('[WA] QR gerado');

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
            console.log('[WA] Fechou. Reconectar?', shouldReconnect);

            if (shouldReconnect) {
                setTimeout(() => connect(base44), 3000);
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
            console.log('[WA] ✅ Conectado:', phone);

            const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
            if (sessions.length > 0) {
                await base44.asServiceRole.entities.WhatsAppSession.update(sessions[0].id, {
                    status: 'connected',
                    qr_code: null,
                    phone_number: phone,
                    last_connection: new Date().toISOString()
                });
            } else {
                await base44.asServiceRole.entities.WhatsAppSession.create({
                    session_id: 'main',
                    status: 'connected',
                    qr_code: null,
                    phone_number: phone,
                    last_connection: new Date().toISOString()
                });
            }
        }
    });

    state.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const m of messages) {
            if (!m.message || m.key.fromMe) continue;

            const phone = m.key.remoteJid?.replace('@s.whatsapp.net', '');
            const text = m.message.conversation || m.message.extendedTextMessage?.text || '';

            if (phone && text) {
                await base44.asServiceRole.entities.WhatsAppMessage.create({
                    phone_number: phone,
                    message: text,
                    status: 'delivered',
                    direction: 'inbound'
                }).catch(e => console.error('[WA] Erro salvar msg:', e));
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
                return Response.json({ status: 'connected', message: 'Já conectado' });
            }
            connect(base44);
            return Response.json({ status: 'connecting', message: 'Conectando...' });
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

            await Deno.remove('/tmp/baileys_auth', { recursive: true }).catch(() => {});

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
                return Response.json({ error: 'Não conectado' }, { status: 400 });
            }

            let jid = phone.replace(/\D/g, '');
            if (!jid.endsWith('@s.whatsapp.net')) {
                jid += '@s.whatsapp.net';
            }

            await state.sock.sendMessage(jid, { text: message });
            return Response.json({ success: true });
        }

        return Response.json({ error: 'Ação inválida' }, { status: 400 });

    } catch (error) {
        console.error('[WA] Erro:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

export { state };