import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { action, prompt, template_id, context, incoming_message } = body;
        
        console.log('[WhatsApp AI] Action:', action);

        if (action === 'draft_message') {
            const systemPrompt = template_id 
                ? `Você é um assistente de mensagens WhatsApp. Crie uma mensagem profissional e amigável baseada no template fornecido.`
                : `Você é um assistente de mensagens WhatsApp. Crie uma mensagem profissional, amigável e concisa.`;

            const userPrompt = template_id
                ? `Use este template como base e personalize com o seguinte contexto: ${context || prompt}`
                : prompt;

            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `${systemPrompt}\n\n${userPrompt}\n\nIMPORTANTE: Retorne apenas a mensagem, sem aspas ou formatação adicional. Máximo de 500 caracteres.`,
                add_context_from_internet: false
            });

            return Response.json({ 
                success: true,
                message: response.trim()
            });
        }

        if (action === 'suggest_reply') {
            if (!incoming_message) {
                return Response.json({ error: 'incoming_message required' }, { status: 400 });
            }

            const systemPrompt = `Você é um assistente de atendimento ao cliente para uma empresa de energia solar (Target Sim). 
Analise a mensagem recebida e sugira 3 respostas curtas e profissionais.
Contexto da empresa: Oferecemos planos de energia solar com descontos na conta de luz.`;

            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `${systemPrompt}\n\nMensagem recebida: "${incoming_message}"\n\nSugira 3 respostas curtas (máximo 100 caracteres cada).`,
                add_context_from_internet: false,
                response_json_schema: {
                    type: "object",
                    properties: {
                        suggestions: {
                            type: "array",
                            items: { type: "string" },
                            minItems: 3,
                            maxItems: 3
                        }
                    }
                }
            });

            return Response.json({ 
                success: true,
                suggestions: response.suggestions || []
            });
        }

        if (action === 'enhance_message') {
            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `Melhore esta mensagem tornando-a mais profissional e amigável, mantendo o mesmo significado: "${prompt}"\n\nRetorne apenas a mensagem melhorada, sem aspas. Máximo de 500 caracteres.`,
                add_context_from_internet: false
            });

            return Response.json({ 
                success: true,
                message: response.trim()
            });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('[WhatsApp AI] Error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});