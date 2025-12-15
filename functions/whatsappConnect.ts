import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from 'npm:@whiskeysockets/baileys@6.7.8';
import QRCode from 'npm:qrcode@1.5.3';

const SESSION_PATH = '/tmp/whatsapp-session';

let globalSocket = null;
let connectionState = 'disconnected';
let qrCodeData = null;

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json();
    const { action } = body;
    
    console.log('WhatsApp action:', action);
    
    // Verificar autenticação apenas para connect e disconnect
    if (action === 'connect' || action === 'disconnect') {
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    if (action === 'connect') {
        try {
            if (globalSocket && connectionState === 'connected') {
                return Response.json({ 
                    status: 'already_connected',
                    message: 'WhatsApp já está conectado'
                });
            }

            console.log('Iniciando conexão WhatsApp...');
            
            const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
            console.log('Auth state carregado');

            const socket = makeWASocket({
                auth: state,
                printQRInTerminal: false
            });
            console.log('Socket criado');

            globalSocket = socket;
            connectionState = 'connecting';

            socket.ev.on('connection.update', async (update) => {
                try {
                    const { connection, lastDisconnect, qr } = update;
                    console.log('Connection update:', { connection, hasQr: !!qr });

                    if (qr) {
                        connectionState = 'qr_code';
                        qrCodeData = await QRCode.toDataURL(qr);
                        console.log('QR Code gerado');
                        
                        const existing = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
                        if (existing.length > 0) {
                            await base44.asServiceRole.entities.WhatsAppSession.update(existing[0].id, {
                                status: 'qr_code',
                                qr_code: qrCodeData
                            });
                        } else {
                            await base44.asServiceRole.entities.WhatsAppSession.create({
                                session_id: 'main',
                                status: 'qr_code',
                                qr_code: qrCodeData
                            });
                        }
                    }

                    if (connection === 'close') {
                        connectionState = 'disconnected';
                        globalSocket = null;
                        console.log('Conexão fechada');
                        
                        const existing = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
                        if (existing.length > 0) {
                            await base44.asServiceRole.entities.WhatsAppSession.update(existing[0].id, {
                                status: 'disconnected'
                            });
                        }
                    } else if (connection === 'open') {
                        connectionState = 'connected';
                        const phoneNumber = socket.user?.id?.split(':')[0] || 'Unknown';
                        console.log('Conectado com sucesso:', phoneNumber);
                        
                        const existing = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
                        if (existing.length > 0) {
                            await base44.asServiceRole.entities.WhatsAppSession.update(existing[0].id, {
                                status: 'connected',
                                phone_number: phoneNumber,
                                last_connection: new Date().toISOString()
                            });
                        } else {
                            await base44.asServiceRole.entities.WhatsAppSession.create({
                                session_id: 'main',
                                status: 'connected',
                                phone_number: phoneNumber,
                                last_connection: new Date().toISOString()
                            });
                        }
                    }
                } catch (err) {
                    console.error('Erro no connection.update:', err);
                }
            });

            socket.ev.on('creds.update', saveCreds);

            return Response.json({ 
                status: 'connecting',
                message: 'Conectando... Aguarde o QR Code'
            });
        } catch (error) {
            console.error('Erro ao conectar:', error);
            return Response.json({ 
                error: error.message,
                stack: error.stack
            }, { status: 500 });
        }
    }

    if (action === 'status') {
        const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
        const latestSession = sessions.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

        return Response.json({
            status: connectionState,
            qr_code: qrCodeData,
            session: latestSession || null
        });
    }

    if (action === 'disconnect') {
        if (globalSocket) {
            await globalSocket.logout();
            globalSocket = null;
            connectionState = 'disconnected';
            qrCodeData = null;

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
});