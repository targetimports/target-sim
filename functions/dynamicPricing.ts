import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { power_plant_id, base_price_kwh } = await req.json();

        if (!power_plant_id || !base_price_kwh) {
            return Response.json({ 
                error: 'power_plant_id e base_price_kwh são obrigatórios' 
            }, { status: 400 });
        }

        // Busca dados para análise
        const [plant, weather, subscriptions, performance] = await Promise.all([
            base44.asServiceRole.entities.PowerPlant.filter({ id: power_plant_id }).then(p => p[0]),
            base44.asServiceRole.entities.WeatherForecast.filter({ power_plant_id }),
            base44.asServiceRole.entities.Subscription.filter({ status: 'active' }),
            base44.asServiceRole.entities.PlantPerformance.filter({ power_plant_id })
        ]);

        if (!plant) {
            return Response.json({ error: 'Usina não encontrada' }, { status: 404 });
        }

        // FATOR DE DEMANDA (baseado em número de assinaturas ativas)
        const demandFactor = Math.min(2, 0.5 + (subscriptions.length / 100));

        // FATOR DE OFERTA (baseado na capacidade da usina)
        const supplyFactor = Math.max(0.5, 2 - (plant.capacity_kw / 10000));

        // FATOR CLIMÁTICO (baseado em previsão do tempo)
        const latestWeather = weather.sort((a, b) => 
            new Date(b.forecast_date) - new Date(a.forecast_date)
        )[0];
        const weatherFactor = latestWeather 
            ? Math.min(2, latestWeather.generation_efficiency_percent / 50)
            : 1;

        // FATOR DE MERCADO (baseado na performance recente)
        const recentPerf = performance.slice(-7); // últimos 7 dias
        const avgPerformance = recentPerf.length > 0
            ? recentPerf.reduce((sum, p) => sum + (p.performance_ratio || 100), 0) / recentPerf.length
            : 100;
        const marketFactor = avgPerformance / 100;

        // CÁLCULO DO PREÇO DINÂMICO
        // Fórmula: base * (demanda / oferta) * clima * mercado
        const priceFactor = (demandFactor / supplyFactor) * weatherFactor * marketFactor;
        const dynamicPrice = base_price_kwh * priceFactor;
        
        // Limita variação entre -30% e +50%
        const minPrice = base_price_kwh * 0.7;
        const maxPrice = base_price_kwh * 1.5;
        const finalPrice = Math.max(minPrice, Math.min(maxPrice, dynamicPrice));

        const finalAdjustment = ((finalPrice - base_price_kwh) / base_price_kwh) * 100;

        const pricingData = {
            power_plant_id,
            date: new Date().toISOString().split('T')[0],
            base_price_kwh,
            dynamic_price_kwh: Math.round(finalPrice * 10000) / 10000,
            demand_factor: Math.round(demandFactor * 100) / 100,
            supply_factor: Math.round(supplyFactor * 100) / 100,
            weather_factor: Math.round(weatherFactor * 100) / 100,
            market_factor: Math.round(marketFactor * 100) / 100,
            final_adjustment: Math.round(finalAdjustment * 100) / 100
        };

        // Salva no banco
        await base44.asServiceRole.entities.DynamicPricing.create(pricingData);

        return Response.json({
            success: true,
            message: finalAdjustment > 0 
                ? `Preço aumentado em ${finalAdjustment.toFixed(1)}%` 
                : `Preço reduzido em ${Math.abs(finalAdjustment).toFixed(1)}%`,
            pricing: pricingData,
            analysis: {
                demand: `${subscriptions.length} assinaturas ativas`,
                supply: `${plant.capacity_kw} kW de capacidade`,
                weather: latestWeather ? `${latestWeather.generation_efficiency_percent}% eficiência prevista` : 'Sem dados',
                performance: `${avgPerformance.toFixed(1)}% performance média`
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});