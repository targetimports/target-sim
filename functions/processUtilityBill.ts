import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, customer_email, subscription_id, test_mode } = await req.json();

    // Schema para extrair dados da fatura (padrão brasileiro)
    const schema = {
      type: "object",
      properties: {
        customer_name: { type: "string", description: "Nome completo do cliente conforme aparece na fatura" },
        customer_cpf_cnpj: { type: "string", description: "CPF ou CNPJ do cliente com pontuação" },
        installation_number: { type: "string", description: "Número da instalação ou UC (Unidade Consumidora)" },
        customer_code: { type: "string", description: "Código ou número do cliente" },
        reference_month: { type: "string", description: "Mês de referência no formato MM/YYYY" },
        due_date: { type: "string", description: "Data de vencimento no formato DD/MM/YYYY" },
        invoice_number: { type: "string", description: "Número da nota fiscal ou documento" },
        total_amount: { 
          type: "number", 
          description: "VALOR TOTAL A PAGAR em Reais (R$) - normalmente o valor final destacado da fatura. Extraia apenas o número, sem R$ ou vírgulas. Use ponto para decimal. Exemplo: se aparecer R$ 1.234,56 extraia como 1234.56"
        },
        kwh_consumed: { 
          type: "number", 
          description: "Total de kWh consumidos. Procure por 'Consumo' ou 'Energia Consumida' em kWh. Extraia apenas o número."
        },
        kwh_tusd_value: { 
          type: "number", 
          description: "Valor em Reais da TUSD (Tarifa de Uso). Procure por linhas com 'TUSD' ou 'Tarifa de Uso'. Converta para número decimal."
        },
        kwh_te_value: { 
          type: "number", 
          description: "Valor em Reais da TE (Tarifa de Energia). Procure por 'TE' ou 'Tarifa de Energia'. Converta para número decimal."
        },
        kwh_total_value: { 
          type: "number", 
          description: "Soma dos valores de TUSD + TE em Reais. Se não estiver explícito, calcule somando os dois valores acima."
        },
        cosip_value: { 
          type: "number", 
          description: "Valor da Contribuição de Iluminação Pública (COSIP, CIP ou CIP/COSIP) em Reais. Converta para decimal."
        },
        tariff_flags_value: { 
          type: "number", 
          description: "Valor das Bandeiras Tarifárias em Reais (pode ser verde/amarela/vermelha). Converta para decimal."
        },
        fines_value: { 
          type: "number", 
          description: "Valor de Multas em Reais, se houver. Converta para decimal."
        },
        interest_value: { 
          type: "number", 
          description: "Valor de Juros em Reais, se houver. Converta para decimal."
        },
        other_charges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string", description: "Nome da cobrança" },
              amount: { type: "number", description: "Valor em número decimal" }
            }
          },
          description: "Lista de TODAS as outras cobranças visíveis na fatura que não se encaixam nas categorias acima. Inclua o nome e valor convertido para decimal. Exemplos: taxas adicionais, débitos anteriores, créditos, etc."
        },
        taxes: {
          type: "object",
          properties: {
            icms: { type: "number", description: "Valor do imposto ICMS em Reais (decimal)" },
            pis: { type: "number", description: "Valor do imposto PIS em Reais (decimal)" },
            cofins: { type: "number", description: "Valor do imposto COFINS em Reais (decimal)" }
          },
          description: "Impostos podem aparecer embutidos ou em seção separada. Procure por 'Impostos', 'Tributos' ou similar."
        },
        utility_company: { type: "string", description: "Nome da distribuidora de energia (Neoenergia, CEMIG, CPFL, Enel, etc)" }
      }
    };

    // Extrair dados do PDF com instruções claras para o LLM
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: schema,
      extraction_instructions: "Esta é uma fatura de energia elétrica brasileira. IMPORTANTE: Todos os valores monetários em Reais devem ser convertidos para números decimais (ex: R$ 1.234,56 vira 1234.56). Procure cuidadosamente por todas as cobranças e seus valores na fatura, incluindo consumo de energia, taxas, impostos e outras cobranças. Valores em kWh também devem ser extraídos como números. Se um valor não for encontrado, use 0."
    });

    if (result.status === 'error') {
      return Response.json({ 
        success: false, 
        error: result.details 
      }, { status: 400 });
    }

    const extractedData = result.output;

    // Buscar configurações de cobranças
    const chargeConfigs = await base44.asServiceRole.entities.ChargeConfiguration.list();
    const configMap = {};
    chargeConfigs.forEach(c => {
      configMap[c.charge_key] = c;
    });

    // Registrar/atualizar cobranças encontradas
    const allCharges = [];
    
    // Mapear cobranças conhecidas
    const knownCharges = [
      { key: 'consumo_tusd', label: 'Consumo TUSD', value: extractedData.kwh_tusd_value, category: 'energy' },
      { key: 'consumo_te', label: 'Consumo TE', value: extractedData.kwh_te_value, category: 'energy' },
      { key: 'cosip', label: 'COSIP/Iluminação Pública', value: extractedData.cosip_value, category: 'fees' },
      { key: 'bandeiras', label: 'Bandeiras Tarifárias', value: extractedData.tariff_flags_value, category: 'fees' },
      { key: 'multa', label: 'Multa', value: extractedData.fines_value, category: 'fines' },
      { key: 'juros', label: 'Juros', value: extractedData.interest_value, category: 'fines' },
      { key: 'icms', label: 'ICMS', value: extractedData.taxes?.icms, category: 'taxes' },
      { key: 'pis', label: 'PIS', value: extractedData.taxes?.pis, category: 'taxes' },
      { key: 'cofins', label: 'COFINS', value: extractedData.taxes?.cofins, category: 'taxes' }
    ];

    // Adicionar outras cobranças encontradas
    if (extractedData.other_charges) {
      extractedData.other_charges.forEach(charge => {
        const key = charge.description.toLowerCase().replace(/[^a-z0-9]/g, '_');
        knownCharges.push({
          key: key,
          label: charge.description,
          value: charge.amount,
          category: 'other',
          auto_discovered: true
        });
      });
    }

    // Processar cada cobrança
    let discount_base = 0;
    let non_discountable = 0;

    for (const charge of knownCharges) {
      if (!charge.value || charge.value === 0) continue;

      // Verificar se configuração existe
      if (!configMap[charge.key]) {
        // Criar nova configuração (padrão: energia é descontável, resto não)
        const newConfig = await base44.asServiceRole.entities.ChargeConfiguration.create({
          charge_key: charge.key,
          charge_label: charge.label,
          is_discountable: charge.category === 'energy',
          category: charge.category,
          auto_discovered: charge.auto_discovered || false,
          first_seen_date: new Date().toISOString(),
          occurrences: 1
        });
        configMap[charge.key] = newConfig;
      } else {
        // Atualizar contador de ocorrências
        await base44.asServiceRole.entities.ChargeConfiguration.update(configMap[charge.key].id, {
          occurrences: (configMap[charge.key].occurrences || 0) + 1
        });
      }

      // Adicionar ao total apropriado
      if (configMap[charge.key].is_discountable) {
        discount_base += charge.value;
      } else {
        non_discountable += charge.value;
      }

      allCharges.push({
        key: charge.key,
        label: charge.label,
        value: charge.value,
        is_discountable: configMap[charge.key].is_discountable
      });
    }

    // Se for modo teste, não salvar fatura
    let utilityBill = null;
    
    if (!test_mode) {
      // Salvar fatura processada
      utilityBill = await base44.asServiceRole.entities.UtilityBill.create({
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
      other_charges: allCharges,
      taxes: extractedData.taxes || {},
      discount_base_value: discount_base,
      non_discountable_value: non_discountable,
      ocr_processed: true,
      extracted_data: extractedData,
      status: 'processed'
      });
    }

    return Response.json({
      success: true,
      utility_bill: utilityBill,
      extracted_data: extractedData,
      summary: {
        total: extractedData.total_amount,
        kwh_consumed: extractedData.kwh_consumed,
        discount_base: discount_base,
        non_discountable: non_discountable,
        all_charges: allCharges
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});