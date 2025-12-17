import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { analysis_type, data } = await req.json();

    let result;

    switch (analysis_type) {
      case 'sales_trends':
        result = await analyzeSalesTrends(base44, data);
        break;
      case 'lead_scoring':
        result = await scoreLeads(base44, data);
        break;
      case 'automation_optimization':
        result = await optimizeAutomations(base44, data);
        break;
      case 'financial_anomalies':
        result = await detectFinancialAnomalies(base44, data);
        break;
      default:
        return Response.json({ error: 'Invalid analysis type' }, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function analyzeSalesTrends(base44, data) {
  const leads = await base44.asServiceRole.entities.SalesLead.list('-created_date', 500);
  const subscriptions = await base44.asServiceRole.entities.Subscription.list('-created_date', 500);

  const leadsData = leads.map(l => ({
    status: l.status,
    source: l.source,
    created_date: l.created_date,
    estimated_value: l.estimated_value,
    conversion_probability: l.conversion_probability
  }));

  const subsData = subscriptions.map(s => ({
    status: s.status,
    created_date: s.created_date,
    average_bill_value: s.average_bill_value
  }));

  const response = await base44.integrations.Core.InvokeLLM({
    prompt: `Analise os dados de vendas e assinaturas abaixo e forneça insights acionáveis:

LEADS (${leads.length} total):
${JSON.stringify(leadsData.slice(0, 100), null, 2)}

ASSINATURAS (${subscriptions.length} total):
${JSON.stringify(subsData.slice(0, 100), null, 2)}

Forneça:
1. Principais tendências identificadas
2. Padrões de conversão por fonte de lead
3. Previsão de vendas para próximos 3 meses
4. Recomendações específicas para melhorar conversão
5. Identificar canais com melhor ROI`,
    response_json_schema: {
      type: "object",
      properties: {
        trends: { type: "array", items: { type: "string" } },
        conversion_patterns: { type: "object" },
        forecast: {
          type: "object",
          properties: {
            next_month: { type: "number" },
            second_month: { type: "number" },
            third_month: { type: "number" }
          }
        },
        recommendations: { type: "array", items: { type: "string" } },
        best_channels: { type: "array", items: { type: "string" } }
      }
    }
  });

  return response;
}

async function scoreLeads(base44, data) {
  const { lead_ids } = data;
  const leads = lead_ids 
    ? await Promise.all(lead_ids.map(id => base44.asServiceRole.entities.SalesLead.filter({ id })))
    : await base44.asServiceRole.entities.SalesLead.filter({ status: { $in: ['new', 'contacted', 'qualified'] } });

  const flatLeads = leads.flat();
  
  const leadsData = flatLeads.map(l => ({
    id: l.id,
    name: l.name,
    source: l.source,
    status: l.status,
    average_bill: l.average_bill,
    follow_up_count: l.follow_up_count || 0,
    last_interaction: l.last_interaction,
    created_date: l.created_date,
    city: l.city,
    state: l.state
  }));

  const response = await base44.integrations.Core.InvokeLLM({
    prompt: `Analise os leads abaixo e atribua um score de 0-100 para probabilidade de conversão, considerando:
- Fonte do lead (referrals geralmente convertem melhor)
- Valor da conta média (contas maiores = maior interesse)
- Número de follow-ups (engajamento)
- Tempo desde última interação
- Status atual no funil

LEADS:
${JSON.stringify(leadsData, null, 2)}

Para cada lead, forneça:
- Score (0-100)
- Razão do score
- Próximas ações recomendadas`,
    response_json_schema: {
      type: "object",
      properties: {
        scored_leads: {
          type: "array",
          items: {
            type: "object",
            properties: {
              lead_id: { type: "string" },
              ai_score: { type: "number" },
              conversion_probability: { type: "number" },
              reason: { type: "string" },
              recommended_actions: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    }
  });

  // Atualizar scores nos leads
  for (const scored of response.scored_leads) {
    await base44.asServiceRole.entities.SalesLead.update(scored.lead_id, {
      ai_score: scored.ai_score,
      conversion_probability: scored.conversion_probability
    });
  }

  return response;
}

async function optimizeAutomations(base44, data) {
  const rules = await base44.asServiceRole.entities.TaskAutomationRule.list();
  const tasks = await base44.asServiceRole.entities.Task.list('-created_date', 1000);

  const rulesData = rules.map(r => ({
    id: r.id,
    name: r.name,
    trigger_type: r.trigger_type,
    execution_count: r.execution_count || 0,
    task_template: r.task_template,
    assignment_rule: r.assignment_rule,
    due_date_rule: r.due_date_rule
  }));

  const tasksByAutomation = {};
  tasks.forEach(t => {
    if (t.automation_id) {
      if (!tasksByAutomation[t.automation_id]) {
        tasksByAutomation[t.automation_id] = [];
      }
      tasksByAutomation[t.automation_id].push({
        status: t.status,
        completed_date: t.completed_date,
        due_date: t.due_date,
        created_date: t.created_date
      });
    }
  });

  const response = await base44.integrations.Core.InvokeLLM({
    prompt: `Analise as regras de automação e o histórico de tarefas criadas:

REGRAS:
${JSON.stringify(rulesData, null, 2)}

TAREFAS POR AUTOMAÇÃO:
${JSON.stringify(tasksByAutomation, null, 2)}

Identifique:
1. Regras com baixa taxa de conclusão de tarefas
2. Prazos que frequentemente não são cumpridos
3. Regras que criam tarefas duplicadas
4. Sugestões de novos gatilhos/regras
5. Otimizações de prioridade e atribuição`,
    response_json_schema: {
      type: "object",
      properties: {
        insights: { type: "array", items: { type: "string" } },
        optimization_suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              rule_id: { type: "string" },
              rule_name: { type: "string" },
              issue: { type: "string" },
              suggestion: { type: "string" },
              priority: { type: "string" }
            }
          }
        },
        new_rule_ideas: { type: "array", items: { type: "string" } }
      }
    }
  });

  return response;
}

async function detectFinancialAnomalies(base44, data) {
  const invoices = await base44.asServiceRole.entities.Invoice.list('-created_date', 500);
  const subscriptions = await base44.asServiceRole.entities.Subscription.list();

  const invoicesData = invoices.map(i => ({
    amount: i.amount,
    status: i.status,
    created_date: i.created_date,
    due_date: i.due_date,
    customer_email: i.customer_email
  }));

  const subsData = subscriptions.map(s => ({
    average_bill_value: s.average_bill_value,
    status: s.status,
    customer_email: s.customer_email
  }));

  const response = await base44.integrations.Core.InvokeLLM({
    prompt: `Analise os dados financeiros abaixo e identifique anomalias:

FATURAS:
${JSON.stringify(invoicesData, null, 2)}

ASSINATURAS:
${JSON.stringify(subsData.slice(0, 100), null, 2)}

Identifique:
1. Faturas com valores atípicos
2. Padrões incomuns de pagamento
3. Clientes com inadimplência crescente
4. Variações inesperadas na receita mensal
5. Previsão de problemas de fluxo de caixa`,
    response_json_schema: {
      type: "object",
      properties: {
        anomalies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              severity: { type: "string" },
              description: { type: "string" },
              affected_entities: { type: "array", items: { type: "string" } },
              recommended_action: { type: "string" }
            }
          }
        },
        financial_health_score: { type: "number" },
        alerts: { type: "array", items: { type: "string" } }
      }
    }
  });

  return response;
}