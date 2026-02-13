import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const formData = await req.formData();
    
    const file = formData.get('file');
    const powerPlantId = formData.get('power_plant_id');

    if (!file || !powerPlantId) {
      return Response.json({ 
        status: 'error', 
        message: 'Arquivo e ID da usina são obrigatórios' 
      }, { status: 400 });
    }

    // 1. Upload do arquivo
    const uploadResponse = await base44.integrations.Core.UploadFile({ file });
    const fileUrl = uploadResponse.file_url;

    // 2. Extrair dados do PDF com OCR
    const ocrResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `Extraia os dados de geração mensal deste PDF de faturamento de energia solar.
      
      Procure pela tabela "DADOS DOS ÚLTIMOS 13 MESES" e extraia:
      - SITUAÇÃO MENSAL (mês/ano)
      - ENERGIA INJETADA (valor em kWh)
      
      Retorne APENAS um array JSON com este formato:
      [
        {
          "month": "dez/2025",
          "generated_kwh": 7301,
          "injected_kwh": 7301
        }
      ]
      
      Se não encontrar dados de injeção, use o valor de geração para ambos.
      Retorne apenas o array JSON, sem explicações.`,
      file_urls: [fileUrl],
      response_json_schema: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: {
              type: "object",
              properties: {
                month: { type: "string" },
                generated_kwh: { type: "number" },
                injected_kwh: { type: "number" }
              }
            }
          }
        }
      }
    });

    const monthlyData = ocrResponse.data || [];

    // 3. Buscar usina e seus dados
    const plant = await base44.asServiceRole.entities.PowerPlant.filter({
      id: powerPlantId
    });

    if (plant.length === 0) {
      return Response.json({ 
        status: 'error', 
        message: 'Usina não encontrada' 
      }, { status: 404 });
    }

    const powerPlant = plant[0];

    // 4. Processar cada mês e criar/atualizar MonthlyGeneration
    const results = [];
    
    for (const record of monthlyData) {
      try {
        // Converter formato do mês (dez/2025 -> 2025-12)
        const [monthName, year] = record.month.split('/');
        const monthMap = {
          'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04', 'mai': '05', 'jun': '06',
          'jul': '07', 'ago': '08', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
        };
        
        const monthNum = monthMap[monthName.toLowerCase()];
        if (!monthNum) continue;
        
        const referenceMonth = `${year}-${monthNum}`;

        // Verificar se já existe registro deste mês
        const existing = await base44.asServiceRole.entities.MonthlyGeneration.filter({
          power_plant_id: powerPlantId,
          reference_month: referenceMonth
        });

        let result;
        
        if (existing.length > 0) {
          // Atualizar registro existente
          result = await base44.asServiceRole.entities.MonthlyGeneration.update(
            existing[0].id,
            {
              generated_kwh: record.generated_kwh,
              injected_kwh: record.injected_kwh,
              available_for_allocation_kwh: record.injected_kwh,
              status: 'confirmed',
              source: 'pdf_import'
            }
          );
        } else {
          // Criar novo registro
          result = await base44.asServiceRole.entities.MonthlyGeneration.create({
            power_plant_id: powerPlantId,
            power_plant_name: powerPlant.name,
            reference_month: referenceMonth,
            reading_date: new Date().toISOString().split('T')[0],
            generated_kwh: record.generated_kwh,
            injected_kwh: record.injected_kwh,
            available_for_allocation_kwh: record.injected_kwh,
            expected_generation_kwh: powerPlant.monthly_generation_kwh || record.generated_kwh,
            performance_ratio: powerPlant.monthly_generation_kwh 
              ? (record.generated_kwh / powerPlant.monthly_generation_kwh * 100)
              : 100,
            status: 'confirmed',
            source: 'pdf_import'
          });
        }

        results.push({
          month: referenceMonth,
          status: 'success',
          generated_kwh: record.generated_kwh
        });
      } catch (error) {
        results.push({
          month: record.month,
          status: 'error',
          message: error.message
        });
      }
    }

    return Response.json({
      status: 'success',
      power_plant_id: powerPlantId,
      power_plant_name: powerPlant.name,
      imported_records: results.length,
      details: results,
      message: `${results.filter(r => r.status === 'success').length} meses importados com sucesso`
    });

  } catch (error) {
    return Response.json({ 
      status: 'error', 
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});