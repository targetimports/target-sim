import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const { message, session_id, lead_id } = await req.json();

        if (!message) {
            return Response.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
        }

        // Análise de intenção (NLP simplificado)
        const lowerMessage = message.toLowerCase();
        
        let intent = 'general';
        let score = 50;
        let nextQuestion = null;
        let shouldQualify = false;

        // Detecta intenção
        if (lowerMessage.includes('preço') || lowerMessage.includes('custo') || lowerMessage.includes('valor')) {
            intent = 'pricing';
            score = 70;
            nextQuestion = 'Qual o valor médio da sua conta de luz?';
        } else if (lowerMessage.includes('economia') || lowerMessage.includes('economizar') || lowerMessage.includes('desconto')) {
            intent = 'savings';
            score = 80;
            nextQuestion = 'Você gostaria de receber uma simulação personalizada?';
        } else if (lowerMessage.includes('contato') || lowerMessage.includes('falar') || lowerMessage.includes('ligar')) {
            intent = 'contact';
            score = 90;
            shouldQualify = true;
        } else if (lowerMessage.includes('funciona') || lowerMessage.includes('como')) {
            intent = 'how_it_works';
            score = 60;
        } else if (lowerMessage.match(/\d{3,}/)) {
            // Detectou número (provavelmente valor de conta)
            intent = 'value_provided';
            score = 85;
            shouldQualify = true;
        }

        // Respostas do chatbot
        const responses = {
            greeting: 'Olá! 👋 Sou o assistente virtual da Target Sim. Como posso ajudá-lo a economizar na conta de luz?',
            pricing: 'Nossos planos oferecem até 20% de desconto na conta de luz! O valor varia conforme seu consumo. Qual o valor médio da sua conta?',
            savings: 'Você pode economizar de R$ 50 a R$ 500 por mês, dependendo do seu consumo! Energia 100% renovável e sustentável. 🌱',
            how_it_works: 'É simples: você assina nossa energia renovável, continua recebendo da distribuidora local, e paga menos! Sem obras, sem mudanças. ⚡',
            contact: 'Que ótimo! Para prosseguir, preciso de alguns dados. Qual seu nome completo?',
            value_provided: 'Perfeito! Com base no seu consumo, você pode economizar bastante. Gostaria de falar com um consultor para fechar o melhor plano?',
            general: 'Entendi. Posso te ajudar com informações sobre economia, preços, ou agendar um contato. O que prefere?'
        };

        const response = responses[intent] || responses.general;

        // Se deve qualificar o lead
        if (shouldQualify && lead_id) {
            // Atualiza score do lead
            const leads = await base44.entities.SalesLead.filter({ id: lead_id });
            if (leads.length > 0) {
                await base44.entities.SalesLead.update(lead_id, {
                    score: Math.min(100, score),
                    status: score >= 80 ? 'qualified' : 'contacted',
                    notes: `Intent: ${intent} | Score: ${score}`
                });
            }
        }

        // Usa LLM para resposta mais natural (opcional)
        let aiResponse = response;
        
        try {
            const llmResult = await base44.integrations.Core.InvokeLLM({
                prompt: `Você é um vendedor especialista em energia solar. 
                
Contexto da conversa:
- Mensagem do cliente: "${message}"
- Intenção detectada: ${intent}
- Score de interesse: ${score}/100

Responda de forma amigável, persuasiva e direta. Use emojis quando apropriado.
Resposta sugerida: ${response}

Melhore esta resposta mantendo o mesmo objetivo mas sendo mais natural e convincente:`,
                add_context_from_internet: false
            });

            if (llmResult) {
                aiResponse = llmResult;
            }
        } catch (err) {
            // Fallback para resposta padrão
            console.log('LLM não disponível, usando resposta padrão');
        }

        return Response.json({
            success: true,
            response: aiResponse,
            intent,
            score,
            next_question: nextQuestion,
            should_transfer_to_human: score >= 85,
            metadata: {
                session_id,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});