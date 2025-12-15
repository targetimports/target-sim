import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { action, apiUrl, apiKey, instanceName, phone, message } = body;
        
        console.log('[Evolution API] Action:', action, 'URL:', apiUrl, 'Instance:', instanceName);

        if (!apiUrl || !instanceName) {
            return Response.json({ error: 'API URL e Instance Name são obrigatórios' }, { status: 400 });
        }

        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (apiKey) {
            headers['apikey'] = apiKey;
        }

        if (action === 'connect') {
            try {
                // Tentar obter informações da instância
                const fetchRes = await fetch(`${apiUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
                    method: 'GET',
                    headers
                });

                let instanceExists = false;
                if (fetchRes.ok) {
                    const instances = await fetchRes.json();
                    instanceExists = instances && instances.length > 0;
                }

                // Se não existir, criar
                if (!instanceExists) {
                    const createRes = await fetch(`${apiUrl}/instance/create`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            instanceName: instanceName,
                            qrcode: true,
                            integration: 'WHATSAPP-BAILEYS'
                        })
                    });

                    if (!createRes.ok) {
                        const error = await createRes.text();
                        console.error('Erro criar instância:', error);
                        throw new Error(`Erro ao criar: ${error}`);
                    }
                }

                // Conectar (gera QR)
                const connectRes = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
                    method: 'GET',
                    headers
                });

                if (!connectRes.ok) {
                    throw new Error('Erro ao conectar');
                }

                const qrData = await connectRes.json();
                
                return Response.json({
                    success: true,
                    message: 'QR Code gerado',
                    qrcode: qrData
                });

            } catch (error) {
                console.error('Erro no connect:', error);
                throw error;
            }
        }

        if (action === 'status') {
            try {
                console.log('[Status] Checking instance:', instanceName, 'at', apiUrl);
                
                // Verificar se instância existe
                const fetchRes = await fetch(`${apiUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
                    method: 'GET',
                    headers
                });

                console.log('[Status] Fetch status:', fetchRes.status);

                if (!fetchRes.ok) {
                    console.log('[Status] Instance not found or error');
                    return Response.json({
                        state: 'close',
                        instance: null,
                        exists: false
                    });
                }

                const instances = await fetchRes.json();
                if (!instances || instances.length === 0) {
                    return Response.json({
                        state: 'close',
                        instance: null,
                        exists: false
                    });
                }

                const instance = instances[0];

                // Obter status da conexão
                const statusRes = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
                    method: 'GET',
                    headers
                });

                if (!statusRes.ok) {
                    return Response.json({
                        state: 'close',
                        instance: instance,
                        exists: true
                    });
                }

                const status = await statusRes.json();

                // Se desconectado, obter QR Code
                if (status.state === 'close') {
                    try {
                        const qrRes = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
                            method: 'GET',
                            headers
                        });

                        if (qrRes.ok) {
                            const qrData = await qrRes.json();
                            return Response.json({
                                ...status,
                                instance: instance,
                                exists: true,
                                qrcode: qrData
                            });
                        }
                    } catch (e) {
                        console.error('Erro ao obter QR:', e);
                    }
                }

                return Response.json({
                    ...status,
                    instance: instance,
                    exists: true
                });

            } catch (error) {
                console.error('Erro no status:', error);
                return Response.json({
                    state: 'close',
                    instance: null,
                    exists: false,
                    error: error.message
                });
            }
        }

        if (action === 'disconnect') {
            // Logout da instância
            const logoutRes = await fetch(`${apiUrl}/instance/logout/${instanceName}`, {
                method: 'DELETE',
                headers
            });

            if (!logoutRes.ok) {
                throw new Error('Erro ao desconectar');
            }

            return Response.json({
                success: true,
                message: 'Desconectado com sucesso'
            });
        }

        if (action === 'send') {
            if (!phone || !message) {
                return Response.json({ error: 'Telefone e mensagem são obrigatórios' }, { status: 400 });
            }

            // Formatar número
            let formattedPhone = phone.replace(/\D/g, '');
            if (!formattedPhone.startsWith('55')) {
                formattedPhone = '55' + formattedPhone;
            }

            // Enviar mensagem
            const sendRes = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    number: formattedPhone,
                    text: message
                })
            });

            if (!sendRes.ok) {
                const error = await sendRes.text();
                throw new Error(`Erro ao enviar mensagem: ${error}`);
            }

            const result = await sendRes.json();

            return Response.json({
                success: true,
                message: 'Mensagem enviada',
                data: result
            });
        }

        return Response.json({ error: 'Ação inválida' }, { status: 400 });

        } catch (error) {
        console.error('[Evolution API] Inner Error:', error);
        return Response.json({ 
            success: false,
            error: error.message,
            details: error.stack
        }, { status: 200 });
        }
        } catch (error) {
        console.error('[Evolution API] Outer Error:', error);
        return Response.json({ 
        success: false,
        error: error.message,
        stack: error.stack
        }, { status: 200 });
        }
        });