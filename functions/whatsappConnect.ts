import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion
} from 'npm:@whiskeysockets/baileys@6.4.0';
import pino from 'npm:pino@8.16.2';

const logger = pino({ level: 'silent' });

const globalState = {
    sock: null,
    qr: null,
    status: 'disconnected'
};

async function startConnection(base44) {
    console.log('[WA] Iniciando...');
    
    const authPath = '/tmp/wa_session';
    await Deno.mkdir(authPath, { recursive: true }).catch(() => {});

    const { state, saveCreds } = await useMultiFileAuthState(authPath);

    globalState.sock = makeWASocket({
        auth: state,
        logger,
        printQRInTerminal: true,
        browser: ['Chrome (Linux)', '', '']
    });

    globalState.sock.ev.on('creds.update', saveCreds);

    globalState.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        console.log('[WA] Update:', connection);

        if (qr) {
            globalState.qr = qr;
            globalState.status = 'qr_code';
            console.log('[WA] ✅ QR Code pronto');

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
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log('[WA] Desconectado. StatusCode:', statusCode);

            if (shouldReconnect) {
                console.log('[WA] Reconectando em 5s...');
                setTimeout(() => startConnection(base44), 5000);
            } else {
                globalState.sock = null;
                globalState.status = 'disconnected';
                globalState.qr = null;
            }
        }

        if (connection === 'open') {
            globalState.status = 'connected';
            globalState.qr = null;
            
            const phone = globalState.sock.user?.id?.split(':')[0];
            console.log('[WA] ✅✅✅ CONECTADO! Telefone:', phone);

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

    globalState.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            if (!msg.message || msg.key.fromMe) continue;

            const phone = msg.key.remoteJid?.replace('@s.whatsapp.net', '');
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

            if (phone && text) {
                console.log('[WA] Mensagem de:', phone);
                await base44.asServiceRole.entities.WhatsAppMessage.create({
                    phone_number: phone,
                    message: text,
                    status: 'delivered',
                    direction: 'inbound'
                }).catch(e => console.error('[WA] Erro msg:', e));
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
            if (globalState.status === 'connected') {
                return Response.json({ status: 'connected' });
            }
            startConnection(base44);
            return Response.json({ status: 'connecting' });
        }

        if (action === 'status') {
            const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
            return Response.json({
                status: globalState.status,
                qr_code: globalState.qr,
                session: sessions[0] || null
            });
        }

        if (action === 'disconnect') {
            if (globalState.sock) {
                await globalState.sock.logout().catch(() => {});
            }
            globalState.sock = null;
            globalState.status = 'disconnected';
            globalState.qr = null;

            await Deno.remove('/tmp/wa_session', { recursive: true }).catch(() => {});

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
            if (!globalState.sock || globalState.status !== 'connected') {
                return Response.json({ error: 'Não conectado' }, { status: 400 });
            }

            let jid = phone.replace(/\D/g, '');
            if (!jid.endsWith('@s.whatsapp.net')) {
                jid += '@s.whatsapp.net';
            }

            await globalState.sock.sendMessage(jid, { text: message });
            return Response.json({ success: true });
        }

        return Response.json({ error: 'Ação inválida' }, { status: 400 });

    } catch (error) {
        console.error('[WA] Erro:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

export { globalState };