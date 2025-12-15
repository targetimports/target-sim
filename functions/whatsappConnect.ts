import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay
} from 'npm:@whiskeysockets/baileys@6.6.0';
import { Boom } from 'npm:@hapi/boom@10.0.1';
import pino from 'npm:pino@8.16.2';
import NodeCache from 'npm:node-cache@5.1.2';

const msgRetryCounterCache = new NodeCache();
const logger = pino({ level: 'error' });

const globalState = {
    sock: null,
    qrCode: null,
    status: 'disconnected',
    isConnecting: false,
    retryCount: 0
};

async function startConnection(base44) {
    if (globalState.isConnecting) {
        console.log('[WA] Já conectando...');
        return;
    }

    if (globalState.sock && globalState.status === 'connected') {
        console.log('[WA] Já conectado');
        return;
    }

    globalState.isConnecting = true;
    globalState.retryCount++;
    console.log(`[WA] Iniciando conexão (tentativa ${globalState.retryCount})...`);

    try {
        const authPath = '/tmp/wa_auth';
        
        try {
            await Deno.mkdir(authPath, { recursive: true });
        } catch (e) {
            // já existe
        }

        const { state, saveCreds } = await useMultiFileAuthState(authPath);
        const { version, isLatest } = await fetchLatestBaileysVersion();
        
        console.log(`[WA] Usando versão ${version.join('.')}, latest: ${isLatest}`);

        globalState.sock = makeWASocket({
            version,
            logger,
            printQRInTerminal: true,
            browser: ['Target Sim', 'Chrome', '20.0.04'],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger)
            },
            msgRetryCounterCache,
            getMessage: async () => undefined,
            shouldIgnoreJid: jid => jid?.includes('@broadcast'),
            markOnlineOnConnect: false,
            syncFullHistory: false,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            emitOwnEvents: false,
            fireInitQueries: true,
            generateHighQualityLinkPreview: false,
            patchMessageBeforeSending: (message) => {
                return message;
            }
        });

        globalState.sock.ev.on('creds.update', saveCreds);

        globalState.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr, isNewLogin } = update;
            
            console.log('[WA] Status:', connection, { qr: !!qr, isNewLogin });

            if (qr) {
                globalState.qrCode = qr;
                globalState.status = 'qr_code';
                
                console.log('[WA] ✅ QR CODE GERADO');
                
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
                    console.error('[WA] Erro ao salvar QR:', e);
                }
            }

            if (connection === 'close') {
                globalState.isConnecting = false;
                
                const statusCode = (lastDisconnect?.error)?.output?.statusCode;
                const reason = lastDisconnect?.error?.message;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                console.log('[WA] Desconectado:', { statusCode, reason, shouldReconnect });

                if (shouldReconnect) {
                    console.log('[WA] Reconectando em 3s...');
                    await delay(3000);
                    startConnection(base44);
                } else {
                    console.log('[WA] Logout - limpando credenciais');
                    globalState.sock = null;
                    globalState.status = 'disconnected';
                    globalState.qrCode = null;
                    
                    try {
                        await Deno.remove(authPath, { recursive: true });
                    } catch (e) {}
                }
            } else if (connection === 'open') {
                console.log('[WA] ✅✅✅ CONECTADO COM SUCESSO!');
                
                globalState.isConnecting = false;
                globalState.status = 'connected';
                globalState.qrCode = null;
                globalState.retryCount = 0;

                const phone = globalState.sock.user?.id?.split(':')[0] || 'Desconhecido';
                console.log('[WA] Número:', phone);

                try {
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
                } catch (e) {
                    console.error('[WA] Erro ao salvar conexão:', e);
                }
            }
        });

        globalState.sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;

            for (const m of messages) {
                if (!m.message || m.key.fromMe) continue;

                const phone = m.key.remoteJid?.replace('@s.whatsapp.net', '');
                const text = m.message.conversation || 
                           m.message.extendedTextMessage?.text || '';

                if (phone && text) {
                    console.log('[WA] 📩 Mensagem recebida:', phone);
                    
                    try {
                        await base44.asServiceRole.entities.WhatsAppMessage.create({
                            phone_number: phone,
                            message: text,
                            status: 'delivered',
                            direction: 'inbound'
                        });
                    } catch (e) {
                        console.error('[WA] Erro ao salvar msg:', e);
                    }
                }
            }
        });

    } catch (error) {
        globalState.isConnecting = false;
        console.error('[WA] ❌ ERRO:', error.message);
        throw error;
    }
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const body = await req.json();
        const { action } = body;

        if (['connect', 'disconnect'].includes(action)) {
            const user = await base44.auth.me();
            if (!user || user.role !== 'admin') {
                return Response.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        if (action === 'connect') {
            if (globalState.status === 'connected') {
                return Response.json({ 
                    status: 'connected',
                    message: 'Já conectado'
                });
            }

            if (globalState.isConnecting) {
                return Response.json({ 
                    status: 'connecting',
                    message: 'Já está conectando...'
                });
            }

            startConnection(base44);

            return Response.json({ 
                status: 'connecting',
                message: 'Iniciando conexão...'
            });
        }

        if (action === 'status') {
            const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
            const session = sessions.length > 0 ? sessions[0] : null;

            return Response.json({
                status: globalState.status,
                qr_code: globalState.qrCode,
                session
            });
        }

        if (action === 'disconnect') {
            if (globalState.sock) {
                try {
                    await globalState.sock.logout();
                } catch (e) {
                    console.error('[WA] Erro logout:', e);
                }
            }

            globalState.sock = null;
            globalState.status = 'disconnected';
            globalState.qrCode = null;
            globalState.isConnecting = false;

            try {
                await Deno.remove('/tmp/wa_auth', { recursive: true });
            } catch (e) {}

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

            const { phone, message } = body;
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