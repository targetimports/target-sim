import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sun, Zap, TrendingUp, TrendingDown, DollarSign, 
  Battery, Upload, Download, Activity, Award
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export default function ProsumerDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: prosumer } = useQuery({
    queryKey: ['prosumer', user?.email],
    queryFn: async () => {
      const all = await base44.entities.Prosumer.list();
      return all.find(p => p.customer_email === user?.email);
    },
    enabled: !!user?.email
  });

  const { data: readings = [] } = useQuery({
    queryKey: ['prosumer-readings', prosumer?.subscription_id],
    queryFn: async () => {
      if (!prosumer) return [];
      const units = await base44.entities.ConsumerUnit.filter({ subscription_id: prosumer.subscription_id });
      if (units.length === 0) return [];
      const allReadings = await base44.entities.ConsumptionReading.list('-reading_date', 100);
      return allReadings.filter(r => r.consumer_unit_id === units[0].id);
    },
    enabled: !!prosumer
  });

  if (!prosumer) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="border-0 shadow-lg p-8 text-center max-w-md">
          <Sun className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Torne-se um Prosumer</h2>
          <p className="text-slate-600 mb-6">
            Gere sua própria energia e ganhe créditos por excedentes injetados na rede
          </p>
          <Button className="bg-amber-500 hover:bg-amber-600">Cadastrar Sistema</Button>
        </Card>
      </div>
    );
  }

  // Mock generation data (in real app, would come from IoT devices)
  const generationData = readings.slice(0, 24).reverse().map((r, idx) => ({
    time: format(new Date(r.reading_date), 'HH:mm'),
    geracao: Math.random() * 5 + 2, // Mock generation
    consumo: r.consumption_kwh,
    saldo: Math.random() * 3 - 1 // Mock balance
  }));

  const totalGenerated = prosumer.total_generated_kwh || 0;
  const totalInjected = prosumer.total_injected_kwh || 0;
  const totalCompensation = prosumer.total_compensation || 0;
  const currentBalance = totalGenerated - readings.reduce((sum, r) => sum + r.consumption_kwh, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Dashboard Prosumer</h1>
              <p className="text-amber-100 text-sm">Geração e consumo de energia</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-amber-100">Saldo Energético</p>
              <p className={`text-3xl font-bold ${currentBalance >= 0 ? 'text-white' : 'text-red-200'}`}>
                {currentBalance >= 0 ? '+' : ''}{currentBalance.toFixed(1)} kWh
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* System Info */}
        <Card className="border-0 shadow-sm mb-8 bg-gradient-to-br from-slate-900 to-amber-900 text-white">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <p className="text-amber-200 text-sm mb-1">Sistema</p>
                <p className="text-lg font-semibold">{prosumer.generation_type === 'solar' ? 'Solar' : prosumer.generation_type === 'wind' ? 'Eólico' : 'Híbrido'}</p>
              </div>
              <div>
                <p className="text-amber-200 text-sm mb-1">Capacidade</p>
                <p className="text-lg font-semibold">{prosumer.installed_capacity_kw} kW</p>
              </div>
              <div>
                <p className="text-amber-200 text-sm mb-1">Inversor</p>
                <p className="text-lg font-semibold">{prosumer.inverter_model || 'N/A'}</p>
              </div>
              <div>
                <p className="text-amber-200 text-sm mb-1">Status</p>
                <Badge className={prosumer.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}>
                  {prosumer.status === 'active' ? 'Operacional' : prosumer.status === 'maintenance' ? 'Manutenção' : 'Inativo'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center">
                  <Sun className="w-7 h-7 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Gerado</p>
                  <p className="text-3xl font-bold">{totalGenerated.toFixed(0)} kWh</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                  <Upload className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Injetado na Rede</p>
                  <p className="text-3xl font-bold">{totalInjected.toFixed(0)} kWh</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center">
                  <DollarSign className="w-7 h-7 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Compensação</p>
                  <p className="text-3xl font-bold">R$ {totalCompensation.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <Battery className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Taxa Compensação</p>
                  <p className="text-3xl font-bold">R$ {(prosumer.compensation_rate || 0.65).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Geração vs Consumo (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={generationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="geracao" stackId="1" stroke="#f59e0b" fill="#fbbf24" fillOpacity={0.6} name="Geração (kWh)" />
                  <Area type="monotone" dataKey="consumo" stackId="2" stroke="#3b82f6" fill="#60a5fa" fillOpacity={0.6} name="Consumo (kWh)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Saldo Energético</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={generationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="saldo" stroke="#10b981" strokeWidth={3} name="Saldo (kWh)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Net Metering Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Net Metering</CardTitle>
              <Badge className="bg-green-100 text-green-800">Ativo</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-amber-50 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <Upload className="w-6 h-6 text-amber-600" />
                  <h4 className="font-semibold text-slate-900">Energia Injetada</h4>
                </div>
                <p className="text-sm text-slate-600 mb-2">
                  Toda energia excedente é injetada na rede da distribuidora
                </p>
                <p className="text-2xl font-bold text-amber-600">{totalInjected.toFixed(0)} kWh</p>
              </div>

              <div className="p-6 bg-green-50 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  <h4 className="font-semibold text-slate-900">Compensação</h4>
                </div>
                <p className="text-sm text-slate-600 mb-2">
                  Você recebe créditos financeiros por kWh injetado
                </p>
                <p className="text-2xl font-bold text-green-600">R$ {totalCompensation.toFixed(2)}</p>
              </div>

              <div className="p-6 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <Award className="w-6 h-6 text-blue-600" />
                  <h4 className="font-semibold text-slate-900">Créditos Energéticos</h4>
                </div>
                <p className="text-sm text-slate-600 mb-2">
                  Ganhe créditos verdes por geração limpa
                </p>
                <p className="text-2xl font-bold text-blue-600">+{(totalGenerated * 0.1).toFixed(0)} créditos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}