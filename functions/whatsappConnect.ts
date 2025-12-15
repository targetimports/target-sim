import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import pkg from 'npm:whatsapp-web.js@1.23.0';
const { Client, LocalAuth } = pkg;

let globalClient = null;
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
            if (globalClient && connectionState === 'connected') {
                return Response.json({ 
                    status: 'already_connected',
                    message: 'WhatsApp já está conectado'
                });
            }

            console.log('Iniciando conexão WhatsApp com whatsapp-web.js...');
            
            const client = new Client({
                authStrategy: new LocalAuth({ dataPath: '/tmp/whatsapp-session' }),
                puppeteer: {
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                }
            });

            globalClient = client;
            connectionState = 'connecting';

            client.on('qr', async (qr) => {
                console.log('QR Code recebido');
                connectionState = 'qr_code';
                qrCodeData = qr;
                
                try {
                    const existing = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
                    if (existing.length > 0) {
                        await base44.asServiceRole.entities.WhatsAppSession.update(existing[0].id, {
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
                } catch (err) {
                    console.error('Erro ao salvar QR:', err);
                }
            });

            client.on('ready', async () => {
                console.log('WhatsApp conectado com sucesso!');
                connectionState = 'connected';
                
                try {
                    const info = client.info;
                    const existing = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
                    if (existing.length > 0) {
                        await base44.asServiceRole.entities.WhatsAppSession.update(existing[0].id, {
                            status: 'connected',
                            phone_number: info.wid.user,
                            last_connection: new Date().toISOString()
                        });
                    } else {
                        await base44.asServiceRole.entities.WhatsAppSession.create({
                            session_id: 'main',
                            status: 'connected',
                            phone_number: info.wid.user,
                            last_connection: new Date().toISOString()
                        });
                    }
                } catch (err) {
                    console.error('Erro ao atualizar conexão:', err);
                }
            });

            client.on('disconnected', async () => {
                console.log('WhatsApp desconectado');
                connectionState = 'disconnected';
                globalClient = null;
                
                try {
                    const existing = await base44.asServiceRole.entities.WhatsAppSession.filter({ session_id: 'main' });
                    if (existing.length > 0) {
                        await base44.asServiceRole.entities.WhatsAppSession.update(existing[0].id, {
                            status: 'disconnected'
                        });
                    }
                } catch (err) {
                    console.error('Erro ao atualizar desconexão:', err);
                }
            });

            await client.initialize();
            console.log('Cliente inicializado');

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
        if (globalClient) {
            await globalClient.destroy();
            globalClient = null;
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