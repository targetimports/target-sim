import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from 'npm:@whiskeysockets/baileys@6.7.8';
import QRCode from 'npm:qrcode@1.5.3';

const SESSION_PATH = '/tmp/whatsapp-session';

let globalSocket = null;
let connectionState = 'disconnected';
let qrCodeData = null;

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action } = await req.json();

        if (action === 'connect') {
            if (globalSocket && connectionState === 'connected') {
                return Response.json({ 
                    status: 'already_connected',
                    message: 'WhatsApp já está conectado'
                });
            }

            try {
                const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);

                const socket = makeWASocket({
                    auth: state,
                    printQRInTerminal: false
                });

                globalSocket = socket;
                connectionState = 'connecting';

                socket.ev.on('connection.update', async (update) => {
                    const { connection, lastDisconnect, qr } = update;

                    if (qr) {
                        connectionState = 'qr_code';
                        qrCodeData = await QRCode.toDataURL(qr);
                        
                        try {
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
                        } catch (e) {
                            console.error('Error updating QR:', e);
                        }
                    }

                    if (connection === 'close') {
                        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                        connectionState = 'disconnected';
                        globalSocket = null;
                        
                        try {
                            const existing = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
                            if (existing.length > 0) {
                                await base44.asServiceRole.entities.WhatsAppSession.update(existing[0].id, {
                                    status: 'disconnected'
                                });
                            }
                        } catch (e) {
                            console.error('Error updating disconnection:', e);
                        }
                    } else if (connection === 'open') {
                        connectionState = 'connected';
                        const phoneNumber = socket.user?.id?.split(':')[0] || 'Unknown';
                        
                        try {
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
                        } catch (e) {
                            console.error('Error updating connection:', e);
                        }
                    }
                });

                socket.ev.on('creds.update', saveCreds);

                return Response.json({ 
                    status: 'connecting',
                    message: 'Aguarde o QR Code...'
                });

            } catch (error) {
                return Response.json({ 
                    error: error.message,
                    status: 'error'
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

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});