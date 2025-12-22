import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, customer_email, subscription_id } = await req.json();

    // Schema para extrair dados da fatura
    const schema = {
      type: "object",
      properties: {
        customer_name: { type: "string", description: "Nome do cliente" },
        customer_cpf_cnpj: { type: "string", description: "CPF ou CNPJ" },
        installation_number: { type: "string", description: "Número da instalação" },
        reference_month: { type: "string", description: "Mês de referência" },
        due_date: { type: "string", description: "Data de vencimento" },
        total_amount: { type: "number", description: "Valor total da fatura" },
        kwh_consumed: { type: "number", description: "kWh consumidos" },
        kwh_value: { type: "number", description: "Valor dos kWh" },
        other_charges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              amount: { type: "number" }
            }
          },
          description: "Outras cobranças (bandeiras, impostos, taxas, etc)"
        },
        taxes: {
          type: "object",
          properties: {
            icms: { type: "number" },
            pis: { type: "number" },
            cofins: { type: "number" },
            other: { type: "number" }
          }
        }
      }
    };

    // Extrair dados do PDF
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: schema
    });

    if (result.status === 'error') {
      return Response.json({ 
        success: false, 
        error: result.details 
      }, { status: 400 });
    }

    const extractedData = result.output;

    // Calcular valor que será descontado (apenas kWh)
    const discount_base = extractedData.kwh_value || 0;
    const non_discountable = extractedData.total_amount - discount_base;

    // Salvar fatura processada
    const utilityBill = await base44.asServiceRole.entities.UtilityBill.create({
      customer_email,
      subscription_id,
      file_url,
      reference_month: extractedData.reference_month,
      due_date: extractedData.due_date,
      total_amount: extractedData.total_amount,
      kwh_consumed: extractedData.kwh_consumed,
      kwh_value: extractedData.kwh_value,
      other_charges: extractedData.other_charges || [],
      taxes: extractedData.taxes || {},
      discount_base_value: discount_base,
      non_discountable_value: non_discountable,
      ocr_processed: true,
      extracted_data: extractedData,
      status: 'processed'
    });

    return Response.json({
      success: true,
      utility_bill: utilityBill,
      extracted_data: extractedData,
      summary: {
        total: extractedData.total_amount,
        kwh_value: discount_base,
        other_charges: non_discountable,
        kwh_consumed: extractedData.kwh_consumed
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});