import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Cloud, CloudRain, Sun, Wind, Zap, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format, addDays } from 'date-fns';

export default function WeatherForecast() {
  const { data: plants = [] } = useQuery({
    queryKey: ['power-plants'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const { data: forecasts = [] } = useQuery({
    queryKey: ['weather-forecasts'],
    queryFn: () => base44.entities.WeatherForecast.filter({}, '-forecast_date', 50)
  });

  // Group forecasts by plant
  const forecastsByPlant = plants.map(plant => ({
    plant,
    forecasts: forecasts.filter(f => f.power_plant_id === plant.id).slice(0, 7)
  }));

  const getWeatherIcon = (cloudCover, precipitation) => {
    if (precipitation > 5) return <CloudRain className="w-8 h-8 text-blue-500" />;
    if (cloudCover > 70) return <Cloud className="w-8 h-8 text-slate-500" />;
    return <Sun className="w-8 h-8 text-amber-500" />;
  };

  const getEfficiencyColor = (efficiency) => {
    if (efficiency >= 80) return 'text-green-600';
    if (efficiency >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminPowerPlants')}>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Cloud className="w-6 h-6 text-amber-400" />
              <div>
                <h1 className="text-2xl font-bold">Previsão de Geração</h1>
                <p className="text-amber-400 text-sm">Previsão do tempo e estimativa de geração das usinas</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {forecastsByPlant.map(({ plant, forecasts: plantForecasts }) => (
            <Card key={plant.id} className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{plant.name}</CardTitle>
                    <p className="text-sm text-slate-500">{plant.city}/{plant.state}</p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-800">
                    {plant.capacity_kw} kW
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {plantForecasts.length === 0 ? (
                  <div className="text-center py-8">
                    <Cloud className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">Nenhuma previsão disponível</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {plantForecasts.map((forecast) => (
                      <div
                        key={forecast.id}
                        className="p-4 bg-slate-50 rounded-xl border border-slate-200"
                      >
                        <p className="text-sm font-medium text-slate-700 mb-2 text-center">
                          {format(new Date(forecast.forecast_date), 'dd/MM')}
                        </p>
                        <div className="flex justify-center mb-3">
                          {getWeatherIcon(forecast.cloud_cover_percent, forecast.precipitation_mm)}
                        </div>
                        <div className="text-center space-y-2">
                          <p className="text-2xl font-bold text-slate-900">
                            {forecast.temperature_celsius}°C
                          </p>
                          <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
                            <Cloud className="w-3 h-3" />
                            {forecast.cloud_cover_percent}%
                          </div>
                          {forecast.wind_speed_kmh > 0 && (
                            <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
                              <Wind className="w-3 h-3" />
                              {forecast.wind_speed_kmh} km/h
                            </div>
                          )}
                          {forecast.estimated_generation_kwh > 0 && (
                            <>
                              <div className="pt-2 border-t border-slate-200">
                                <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mb-1">
                                  <Zap className="w-3 h-3" />
                                  Geração
                                </div>
                                <p className="text-sm font-bold text-amber-600">
                                  {forecast.estimated_generation_kwh} kWh
                                </p>
                              </div>
                              <p className={`text-xs font-medium ${getEfficiencyColor(forecast.generation_efficiency_percent)}`}>
                                {forecast.generation_efficiency_percent}% eficiência
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {forecastsByPlant.length === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <Cloud className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nenhuma usina cadastrada</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}