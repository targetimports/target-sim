import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data } = payload;

    if (event.type !== 'create') {
      return Response.json({ status: 'skipped', reason: 'Only create events are processed' });
    }

    const contract = data;
    
    // 1. Buscar a geração mensal mais recente da usina
    const currentMonth = new Date().toISOString().substring(0, 7);
    const generations = await base44.asServiceRole.entities.MonthlyGeneration.filter({
      power_plant_id: contract.power_plant_id,
      reference_month: currentMonth
    });

    if (generations.length === 0) {
      return Response.json({ 
        status: 'warning', 
        message: 'Nenhuma geração registrada para este mês',
        contract_id: contract.id
      });
    }

    const generation = generations[0];
    
    // 2. Buscar informações da assinatura e unidade consumidora
    const subscription = await base44.asServiceRole.entities.Subscription.filter({
      id: contract.subscription_id
    });

    if (subscription.length === 0) {
      return Response.json({ 
        status: 'error', 
        message: 'Assinatura não encontrada'
      }, { status: 404 });
    }

    const consumerUnit = await base44.asServiceRole.entities.ConsumerUnit.filter({
      id: contract.consumer_unit_id
    });

    if (consumerUnit.length === 0) {
      return Response.json({ 
        status: 'error', 
        message: 'Unidade consumidora não encontrada'
      }, { status: 404 });
    }

    const sub = subscription[0];
    const unit = consumerUnit[0];

    // 3. Calcular alocação mensal baseado no percentual do contrato
    const availableKwh = generation.available_for_allocation_kwh || 0;
    const allocatedKwh = (availableKwh * contract.allocation_percentage) / 100;

    // 4. Criar registro de EnergyAllocation
    const energyAllocation = await base44.asServiceRole.entities.EnergyAllocation.create({
      power_plant_id: contract.power_plant_id,
      power_plant_name: generation.power_plant_name,
      subscription_id: contract.subscription_id,
      consumer_unit_id: contract.consumer_unit_id,
      customer_name: unit.customer_name || sub.customer_name,
      customer_email: unit.customer_email || sub.customer_email,
      month_reference: currentMonth,
      allocation_percentage: contract.allocation_percentage,
      allocated_kwh: allocatedKwh,
      monthly_generation_kwh: generation.generated_kwh,
      status: 'pending_allocation',
      created_from_contract: contract.id
    });

    // 5. Atualizar contract com status
    await base44.asServiceRole.entities.PowerPlantContract.update(contract.id, {
      status: 'active',
      energy_allocation_id: energyAllocation.id
    });

    return Response.json({
      status: 'success',
      contract_id: contract.id,
      energy_allocation_id: energyAllocation.id,
      allocated_kwh: allocatedKwh,
      message: `Contrato vinculado à alocação de ${allocatedKwh.toFixed(0)} kWh`
    });

  } catch (error) {
    return Response.json({ 
      status: 'error', 
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});