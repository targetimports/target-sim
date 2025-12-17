import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { trigger_type, entity_id, entity_data } = await req.json();

    // Buscar regras ativas para este gatilho
    const rules = await base44.asServiceRole.entities.TaskAutomationRule.filter({
      trigger_type,
      is_active: true
    });

    const createdTasks = [];

    for (const rule of rules) {
      // Verificar condições do gatilho
      if (rule.trigger_conditions && !matchesConditions(entity_data, rule.trigger_conditions)) {
        continue;
      }

      // Determinar responsável
      let assignedTo = rule.assigned_to;
      
      if (rule.assignment_rule === 'round_robin' && rule.assignment_pool?.length > 0) {
        const index = rule.execution_count % rule.assignment_pool.length;
        assignedTo = rule.assignment_pool[index];
      } else if (rule.assignment_rule === 'least_tasks' && rule.assignment_pool?.length > 0) {
        assignedTo = await findUserWithLeastTasks(base44, rule.assignment_pool);
      } else if (rule.assignment_rule === 'based_on_field' && rule.assignment_field) {
        assignedTo = entity_data[rule.assignment_field];
      }

      // Determinar prazo
      let dueDate = null;
      const now = new Date();
      
      if (rule.due_date_rule === 'hours_from_now' && rule.due_date_value) {
        dueDate = new Date(now.getTime() + rule.due_date_value * 60 * 60 * 1000);
      } else if (rule.due_date_rule === 'days_from_now' && rule.due_date_value) {
        dueDate = new Date(now.getTime() + rule.due_date_value * 24 * 60 * 60 * 1000);
      } else if (rule.due_date_rule === 'based_on_field' && rule.due_date_field) {
        dueDate = entity_data[rule.due_date_field];
      }

      // Interpolar variáveis no template
      const taskData = {
        title: interpolateTemplate(rule.task_template.title, entity_data),
        description: interpolateTemplate(rule.task_template.description, entity_data),
        task_type: rule.task_template.task_type || 'other',
        priority: rule.task_template.priority || 'medium',
        status: 'pending',
        assigned_to: assignedTo,
        due_date: dueDate?.toISOString(),
        related_to_type: getEntityType(trigger_type),
        related_to_id: entity_id,
        related_to_name: entity_data.name || entity_data.customer_name || entity_data.title || '',
        automation_id: rule.id,
        notes: `Tarefa criada automaticamente pela regra: ${rule.name}`
      };

      // Criar tarefa
      const task = await base44.asServiceRole.entities.Task.create(taskData);
      createdTasks.push(task);

      // Enviar notificação
      if (rule.send_notification && assignedTo) {
        const notificationTitle = rule.notification_template?.title || 'Nova tarefa atribuída';
        const notificationMessage = interpolateTemplate(
          rule.notification_template?.message || 'Você tem uma nova tarefa: {{title}}',
          { ...entity_data, ...taskData }
        );

        await base44.asServiceRole.entities.SystemNotification.create({
          recipient_email: assignedTo,
          notification_type: 'system_alert',
          title: notificationTitle,
          message: notificationMessage,
          priority: taskData.priority === 'urgent' ? 'urgent' : 'medium',
          action_url: `/task/${task.id}`,
          metadata: {
            task_id: task.id,
            trigger_type,
            rule_id: rule.id
          }
        });
      }

      // Atualizar contador de execuções
      await base44.asServiceRole.entities.TaskAutomationRule.update(rule.id, {
        execution_count: (rule.execution_count || 0) + 1,
        last_execution: new Date().toISOString()
      });
    }

    return Response.json({
      success: true,
      tasks_created: createdTasks.length,
      tasks: createdTasks
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function matchesConditions(data, conditions) {
  for (const [key, value] of Object.entries(conditions)) {
    if (data[key] !== value) {
      return false;
    }
  }
  return true;
}

async function findUserWithLeastTasks(base44, userPool) {
  const taskCounts = {};
  
  for (const userEmail of userPool) {
    const tasks = await base44.asServiceRole.entities.Task.filter({
      assigned_to: userEmail,
      status: { $in: ['pending', 'in_progress'] }
    });
    taskCounts[userEmail] = tasks.length;
  }
  
  return Object.entries(taskCounts).reduce((min, [email, count]) => 
    count < taskCounts[min] ? email : min, userPool[0]
  );
}

function interpolateTemplate(template, data) {
  if (!template) return '';
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
}

function getEntityType(triggerType) {
  if (triggerType.includes('lead')) return 'lead';
  if (triggerType.includes('subscription')) return 'subscription';
  if (triggerType.includes('ticket')) return 'ticket';
  if (triggerType.includes('invoice')) return 'invoice';
  return 'other';
}