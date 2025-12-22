import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, customer_email, subscription_id } = await req.json();

    // Schema para extrair dados da fatura (padrão brasileiro)
    const schema = {
      type: "object",
      properties: {
        customer_name: { type: "string", description: "Nome do cliente na fatura" },
        customer_cpf_cnpj: { type: "string", description: "CPF ou CNPJ do cliente" },
        installation_number: { type: "string", description: "Código/Número da instalação" },
        customer_code: { type: "string", description: "Código do cliente" },
        reference_month: { type: "string", description: "Mês de referência (MM/YYYY)" },
        due_date: { type: "string", description: "Data de vencimento" },
        invoice_number: { type: "string", description: "Número da nota fiscal" },
        total_amount: { type: "number", description: "Valor TOTAL a pagar da fatura" },
        kwh_consumed: { type: "number", description: "Total de kWh consumidos no período" },
        kwh_tusd_value: { type: "number", description: "Valor do Consumo-TUSD (Tarifa de Uso do Sistema de Distribuição)" },
        kwh_te_value: { type: "number", description: "Valor do Consumo-TE (Tarifa de Energia)" },
        kwh_total_value: { type: "number", description: "Soma total dos valores de energia (TUSD + TE)" },
        cosip_value: { type: "number", description: "Contribuição de Iluminação Pública (COSIP/CIP)" },
        tariff_flags_value: { type: "number", description: "Bandeiras tarifárias" },
        fines_value: { type: "number", description: "Multas" },
        interest_value: { type: "number", description: "Juros" },
        other_charges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string", description: "Descrição do item" },
              amount: { type: "number", description: "Valor" }
            }
          },
          description: "Lista de todas as outras cobranças (multas, juros, taxas, COSIP, etc.)"
        },
        taxes: {
          type: "object",
          properties: {
            icms: { type: "number", description: "Valor de ICMS" },
            pis: { type: "number", description: "Valor de PIS" },
            cofins: { type: "number", description: "Valor de COFINS" }
          }
        },
        utility_company: { type: "string", description: "Nome da concessionária (ex: Neoenergia, CEMIG, CPFL)" }
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

    // Calcular valor base para desconto (APENAS energia: TUSD + TE)
    const kwh_tusd = extractedData.kwh_tusd_value || 0;
    const kwh_te = extractedData.kwh_te_value || 0;
    const discount_base = kwh_tusd + kwh_te;
    
    // Valores não descontáveis (tudo que NÃO é kWh)
    const cosip = extractedData.cosip_value || 0;
    const flags = extractedData.tariff_flags_value || 0;
    const fines = extractedData.fines_value || 0;
    const interest = extractedData.interest_value || 0;
    const taxes_total = (extractedData.taxes?.icms || 0) + 
                        (extractedData.taxes?.pis || 0) + 
                        (extractedData.taxes?.cofins || 0);
    
    const non_discountable = extractedData.total_amount - discount_base;

    // Salvar fatura processada
    const utilityBill = await base44.asServiceRole.entities.UtilityBill.create({
      customer_email,
      subscription_id,
      file_url,
      reference_month: extractedData.reference_month,
      due_date: extractedData.due_date,
      invoice_number: extractedData.invoice_number,
      installation_number: extractedData.installation_number,
      customer_code: extractedData.customer_code,
      utility_company: extractedData.utility_company,
      total_amount: extractedData.total_amount,
      kwh_consumed: extractedData.kwh_consumed,
      kwh_value: discount_base,
      kwh_tusd_value: kwh_tusd,
      kwh_te_value: kwh_te,
      cosip_value: cosip,
      tariff_flags_value: flags,
      fines_value: fines,
      interest_value: interest,
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
        kwh_consumed: extractedData.kwh_consumed,
        discount_base: discount_base,
        kwh_tusd: kwh_tusd,
        kwh_te: kwh_te,
        non_discountable: non_discountable,
        breakdown: {
          cosip: cosip,
          flags: flags,
          fines: fines,
          interest: interest,
          taxes: taxes_total
        }
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});