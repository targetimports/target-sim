import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sun, Wind, Droplet, Leaf, Activity, Zap, TrendingUp,
  AlertTriangle, MapPin, Calendar, ArrowLeft, Gauge
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export default function PowerPlantManager() {
  const [selectedPlant, setSelectedPlant] = useState(null);

  const { data: plants = [] } = useQuery({
    queryKey: ['power-plants'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const { data: productions = [] } = useQuery({
    queryKey: ['plant-production', selectedPlant?.id],
    queryFn: async () => {
      if (!selectedPlant) return [];
      const all = await base44.entities.PowerPlantProduction.list('-timestamp', 100);
      return all.filter(p => p.power_plant_id === selectedPlant.id);
    },
    enabled: !!selectedPlant
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['energy-allocations'],
    queryFn: () => base44.entities.EnergyAllocation.list('-allocation_date', 50)
  });

  const typeIcons = {
    solar: Sun,
    wind: Wind,
    hydro: Droplet,
    biomass: Leaf
  };

  const typeColors = {
    solar: 'from-yellow-500 to-orange-500',
    wind: 'from-blue-500 to-cyan-500',
    hydro: 'from-blue-600 to-indigo-600',
    biomass: 'from-green-500 to-emerald-600'
  };

  const totalProduction = productions.reduce((sum, p) => sum + (p.production_kwh || 0), 0);
  const avgEfficiency = productions.length > 0 
    ? productions.reduce((sum, p) => sum + (p.efficiency_percentage || 0), 0) / productions.length 
    : 0;
  const totalCO2Avoided = productions.reduce((sum, p) => sum + (p.co2_avoided_kg || 0), 0);
  const totalRevenue = productions.reduce((sum, p) => sum + (p.revenue_generated || 0), 0);

  const chartData = productions.slice(0, 24).reverse().map(p => ({
    time: format(new Date(p.timestamp), 'HH:mm'),
    producao: p.production_kwh,
    eficiencia: p.efficiency_percentage
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Gestão de Usinas</h1>
              <p className="text-amber-400 text-sm">Monitoramento e otimização de geração</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!selectedPlant ? (
          <>
            {/* Stats */}
            <div className="grid sm:grid-cols-4 gap-6 mb-8">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Zap className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Total de Usinas</p>
                      <p className="text-3xl font-bold">{plants.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Activity className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Operacionais</p>
                      <p className="text-3xl font-bold">{plants.filter(p => p.status === 'operational').length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Gauge className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Capacidade Total</p>
                      <p className="text-3xl font-bold">{plants.reduce((sum, p) => sum + (p.capacity_kw || 0), 0)} kW</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Em Manutenção</p>
                      <p className="text-3xl font-bold">{plants.filter(p => p.status === 'maintenance').length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Plants Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plants.map((plant) => {
                const Icon = typeIcons[plant.type];
                return (
                  <motion.div
                    key={plant.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <Card 
                      className="border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                      onClick={() => setSelectedPlant(plant)}
                    >
                      <div className={`h-2 bg-gradient-to-r ${typeColors[plant.type]}`} />
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 bg-gradient-to-br ${typeColors[plant.type]} rounded-xl flex items-center justify-center`}>
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900">{plant.name}</h3>
                              <p className="text-sm text-slate-500">{plant.type === 'solar' ? 'Solar' : plant.type === 'wind' ? 'Eólica' : plant.type === 'hydro' ? 'Hidrelétrica' : 'Biomassa'}</p>
                            </div>
                          </div>
                          <Badge className={
                            plant.status === 'operational' ? 'bg-green-100 text-green-800' :
                            plant.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-slate-100 text-slate-800'
                          }>
                            {plant.status === 'operational' ? 'Operacional' :
                             plant.status === 'maintenance' ? 'Manutenção' : 'Inativa'}
                          </Badge>
                        </div>

                        <div className="space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Capacidade</span>
                            <span className="font-semibold">{plant.capacity_kw} kW</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <MapPin className="w-4 h-4" />
                            <span>{plant.city}/{plant.state}</span>
                          </div>
                          {plant.start_date && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Calendar className="w-4 h-4" />
                              <span>Desde {format(new Date(plant.start_date), 'MM/yyyy')}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Plant Details */}
            <Button variant="outline" onClick={() => setSelectedPlant(null)} className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para lista
            </Button>

            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center">
                      <Zap className="w-7 h-7 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Produção Total</p>
                      <p className="text-3xl font-bold">{(totalProduction / 1000).toFixed(1)} MWh</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                      <Gauge className="w-7 h-7 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Eficiência Média</p>
                      <p className="text-3xl font-bold">{avgEfficiency.toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                      <Leaf className="w-7 h-7 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">CO² Evitado</p>
                      <p className="text-3xl font-bold">{(totalCO2Avoided / 1000).toFixed(1)}t</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Produção nas últimas 24h</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip />
                      <Area type="monotone" dataKey="producao" stroke="#f59e0b" fill="#fbbf24" fillOpacity={0.3} name="Produção (kWh)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Eficiência</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip />
                      <Line type="monotone" dataKey="eficiencia" stroke="#3b82f6" strokeWidth={2} name="Eficiência (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Alocação de Energia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allocations.filter(a => a.power_plant_id === selectedPlant.id).slice(0, 10).map((alloc) => (
                    <div key={alloc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div>
                        <p className="font-medium text-slate-900">{alloc.energy_kwh} kWh alocados</p>
                        <p className="text-sm text-slate-500">{alloc.percentage}% renovável - Cert: {alloc.certificate_number || 'N/A'}</p>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {alloc.co2_avoided_kg} kg CO² evitado
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}