import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { action, apiUrl, apiKey, instanceName, phone, message } = body;

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
            // Criar instância
            const createRes = await fetch(`${apiUrl}/instance/create`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    instanceName: instanceName,
                    qrcode: true
                })
            });

            if (!createRes.ok) {
                const error = await createRes.text();
                throw new Error(`Erro ao criar instância: ${error}`);
            }

            const result = await createRes.json();
            
            return Response.json({
                success: true,
                message: 'Instância criada. Aguarde o QR Code.',
                data: result
            });
        }

        if (action === 'status') {
            // Obter status da conexão
            const statusRes = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
                method: 'GET',
                headers
            });

            if (!statusRes.ok) {
                return Response.json({
                    state: 'close',
                    instance: null
                });
            }

            const status = await statusRes.json();

            // Se desconectado, tentar obter QR Code
            if (status.state === 'close') {
                const qrRes = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
                    method: 'GET',
                    headers
                }).catch(() => null);

                if (qrRes && qrRes.ok) {
                    const qrData = await qrRes.json();
                    return Response.json({
                        ...status,
                        qrcode: qrData
                    });
                }
            }

            return Response.json(status);
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

            // Salvar no banco
            await base44.asServiceRole.entities.WhatsAppMessage.create({
                phone_number: formattedPhone,
                message: message,
                status: 'sent',
                direction: 'outbound'
            });

            return Response.json({
                success: true,
                message: 'Mensagem enviada',
                data: result
            });
        }

        return Response.json({ error: 'Ação inválida' }, { status: 400 });

    } catch (error) {
        console.error('[Evolution API] Error:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});