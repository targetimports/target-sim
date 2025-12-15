import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { file } = await req.json();

        if (!file) {
            return Response.json({ error: 'Arquivo é obrigatório' }, { status: 400 });
        }

        // Upload do arquivo
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        const fileUrl = uploadResult.file_url;

        // Usa LLM com visão para extrair dados da fatura
        const extractionResult = await base44.integrations.Core.InvokeLLM({
            prompt: `Analise esta fatura de energia elétrica e extraia as seguintes informações:

1. Valor total da conta
2. Consumo em kWh
3. Nome do cliente/titular
4. Número da instalação
5. Distribuidora de energia
6. Data de vencimento
7. Mês/ano de referência
8. Endereço de instalação

Retorne APENAS um JSON com esses dados, sem texto adicional.`,
            file_urls: [fileUrl],
            response_json_schema: {
                type: "object",
                properties: {
                    valor_total: { type: "number" },
                    consumo_kwh: { type: "number" },
                    nome_cliente: { type: "string" },
                    numero_instalacao: { type: "string" },
                    distribuidora: { type: "string" },
                    data_vencimento: { type: "string" },
                    mes_referencia: { type: "string" },
                    endereco: { type: "string" }
                }
            }
        });

        if (!extractionResult) {
            return Response.json({ 
                error: 'Não foi possível extrair dados da fatura' 
            }, { status: 400 });
        }

        // Valida se tem dados mínimos
        const hasMinimalData = extractionResult.valor_total || extractionResult.consumo_kwh;

        if (!hasMinimalData) {
            return Response.json({ 
                error: 'Imagem não contém uma fatura válida',
                extracted: extractionResult
            }, { status: 400 });
        }

        return Response.json({
            success: true,
            message: 'Fatura processada com sucesso',
            file_url: fileUrl,
            extracted_data: extractionResult,
            confidence: 'high',
            suggestions: {
                can_subscribe: extractionResult.valor_total >= 200,
                estimated_savings: extractionResult.valor_total 
                    ? Math.round(extractionResult.valor_total * 0.15 * 100) / 100
                    : 0
            }
        });

    } catch (error) {
        return Response.json({ 
            error: error.message,
            details: 'Erro ao processar fatura. Verifique se a imagem está legível.'
        }, { status: 500 });
    }
});