import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Busca todas as usinas e suas performances
        const [plants, allPerformances, subscriptions] = await Promise.all([
            base44.asServiceRole.entities.PowerPlant.list(),
            base44.asServiceRole.entities.PlantPerformance.list('-date', 500),
            base44.asServiceRole.entities.Subscription.filter({ status: 'active' })
        ]);

        // Calcula métricas por usina
        const plantMetrics = plants.map(plant => {
            const performances = allPerformances.filter(p => p.power_plant_id === plant.id);
            
            const avgPerformance = performances.length > 0
                ? performances.reduce((sum, p) => sum + (p.performance_ratio || 0), 0) / performances.length
                : 0;

            const avgRevenue = performances.length > 0
                ? performances.reduce((sum, p) => sum + (p.revenue_generated || 0), 0) / performances.length
                : 0;

            const avgROI = performances.length > 0
                ? performances.reduce((sum, p) => sum + (p.roi_daily || 0), 0) / performances.length
                : 0;

            const totalAlerts = performances.reduce((sum, p) => sum + (p.alerts_triggered || 0), 0);

            // Score de eficiência (0-100)
            const efficiencyScore = (avgPerformance * 0.4) + (avgROI * 10 * 0.3) + ((100 - totalAlerts) * 0.3);

            return {
                plant,
                metrics: {
                    avgPerformance: Math.round(avgPerformance * 10) / 10,
                    avgRevenue: Math.round(avgRevenue * 100) / 100,
                    avgROI: Math.round(avgROI * 1000) / 1000,
                    totalAlerts,
                    efficiencyScore: Math.round(efficiencyScore * 10) / 10
                }
            };
        });

        // Ordena por score de eficiência
        plantMetrics.sort((a, b) => b.metrics.efficiencyScore - a.metrics.efficiencyScore);

        // Calcula demanda total
        const totalDemand = subscriptions.reduce((sum, s) => sum + (s.average_bill_value || 0), 0);
        
        // Calcula capacidade total
        const totalCapacity = plants.reduce((sum, p) => sum + (p.capacity_kw || 0), 0);

        // Otimização: distribui carga proporcionalmente ao score de eficiência
        const totalScore = plantMetrics.reduce((sum, pm) => sum + pm.metrics.efficiencyScore, 0);
        
        const recommendations = plantMetrics.map(pm => {
            const idealAllocation = (pm.metrics.efficiencyScore / totalScore) * 100;
            const currentAllocation = ((pm.plant.capacity_kw || 0) / totalCapacity) * 100;
            const adjustment = idealAllocation - currentAllocation;

            let action = 'maintain';
            if (adjustment > 10) action = 'expand';
            else if (adjustment < -10) action = 'reduce';

            return {
                plant_id: pm.plant.id,
                plant_name: pm.plant.name,
                current_allocation: Math.round(currentAllocation * 10) / 10,
                ideal_allocation: Math.round(idealAllocation * 10) / 10,
                adjustment_needed: Math.round(adjustment * 10) / 10,
                action,
                efficiency_score: pm.metrics.efficiencyScore,
                priority: pm.metrics.efficiencyScore > 80 ? 'high' : pm.metrics.efficiencyScore > 60 ? 'medium' : 'low'
            };
        });

        // Identifica ações prioritárias
        const expansions = recommendations.filter(r => r.action === 'expand').sort((a, b) => b.efficiency_score - a.efficiency_score);
        const reductions = recommendations.filter(r => r.action === 'reduce').sort((a, b) => a.efficiency_score - b.efficiency_score);

        return Response.json({
            success: true,
            portfolio_summary: {
                total_plants: plants.length,
                total_capacity_kw: totalCapacity,
                total_demand: Math.round(totalDemand),
                avg_efficiency: Math.round((plantMetrics.reduce((sum, pm) => sum + pm.metrics.efficiencyScore, 0) / plantMetrics.length) * 10) / 10
            },
            top_performers: plantMetrics.slice(0, 3).map(pm => ({
                name: pm.plant.name,
                score: pm.metrics.efficiencyScore,
                roi: pm.metrics.avgROI
            })),
            recommended_actions: {
                expand: expansions.slice(0, 3),
                reduce: reductions.slice(0, 2),
                maintain: recommendations.filter(r => r.action === 'maintain').length
            },
            detailed_recommendations: recommendations
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});