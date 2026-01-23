import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Building2, Zap, Users, FileText, TrendingUp, ArrowRight, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function EnergyFlowDashboard() {
  const [selectedPlant, setSelectedPlant] = useState(null);

  const { data: powerPlants = [] } = useQuery({
    queryKey: ['powerplants'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const { data: plantOwners = [] } = useQuery({
    queryKey: ['plant-owners'],
    queryFn: () => base44.entities.PlantOwner.list()
  });

  const { data: allUnits = [] } = useQuery({
    queryKey: ['consumer-units'],
    queryFn: () => base44.entities.ConsumerUnit.list()
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list()
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['plant-contracts'],
    queryFn: () => base44.entities.PowerPlantContract.list()
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['utility-bills'],
    queryFn: () => base44.entities.UtilityBill.list('-created_date', 100)
  });

  // Calcular estatísticas gerais
  const totalCapacity = powerPlants.reduce((sum, p) => sum + (p.capacity_kw || 0), 0);
  const totalUnits = allUnits.length;
  const totalCustomers = customers.length;
  const totalInvoices = invoices.length;

  const activeContracts = contracts.filter(c => c.status === 'active').length;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Dashboard de Fluxo Energético</h1>
          <p className="text-slate-600">Visão completa: Usinas → Unidades → Clientes → Faturas</p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Usinas Ativas</p>
                  <p className="text-2xl font-bold">{powerPlants.length}</p>
                  <p className="text-xs text-slate-500">{totalCapacity.toFixed(0)} kW total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Unidades</p>
                  <p className="text-2xl font-bold">{totalUnits}</p>
                  <p className="text-xs text-slate-500">{activeContracts} contratos ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Clientes</p>
                  <p className="text-2xl font-bold">{totalCustomers}</p>
                  <p className="text-xs text-slate-500">Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Faturas</p>
                  <p className="text-2xl font-bold">{totalInvoices}</p>
                  <p className="text-xs text-slate-500">Total processadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fluxo Visual por Usina */}
        <div className="space-y-6">
          {powerPlants.map((plant) => {
            const plantUnits = allUnits.filter(u => u.power_plant_name === plant.name);
            const plantCustomers = new Set(plantUnits.map(u => u.customer_email)).size;
            const plantContracts = contracts.filter(c => c.power_plant_id === plant.id);
            const owner = plantOwners.find(o => o.id === plant.plant_owner_id);

            return (
              <Card key={plant.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-6 h-6 text-amber-600" />
                      <div>
                        <p className="text-lg">{plant.name}</p>
                        <p className="text-sm font-normal text-slate-500">
                          {owner?.name || 'Sem proprietário'} • {plant.capacity_kw} kW
                        </p>
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
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid lg:grid-cols-4 gap-6">
                    {/* Usina */}
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <Building2 className="w-8 h-8 text-amber-600 mb-3" />
                      <p className="font-semibold mb-1">Usina</p>
                      <p className="text-sm text-slate-600">{plant.city}/{plant.state}</p>
                      <div className="mt-3 space-y-1 text-xs">
                        <p className="text-slate-500">Capacidade: {plant.capacity_kw} kW</p>
                        <p className="text-slate-500">Tipo: {plant.type}</p>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center justify-center">
                      <ArrowRight className="w-8 h-8 text-slate-400" />
                    </div>

                    {/* Unidades */}
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <Zap className="w-8 h-8 text-green-600 mb-3" />
                      <p className="font-semibold mb-1">Unidades</p>
                      <p className="text-2xl font-bold text-green-600">{plantUnits.length}</p>
                      <div className="mt-3 space-y-1 text-xs">
                        <p className="text-slate-500">
                          Consumo: {plantUnits.reduce((s, u) => s + (u.monthly_consumption_kwh || 0), 0).toFixed(0)} kWh
                        </p>
                        <p className="text-slate-500">Contratos: {plantContracts.length}</p>
                      </div>
                      <Link to={createPageUrl('PowerPlantUnitsManager')}>
                        <button className="mt-2 text-xs text-green-600 hover:underline">
                          Ver unidades →
                        </button>
                      </Link>
                    </div>

                    {/* Clientes */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <Users className="w-8 h-8 text-blue-600 mb-3" />
                      <p className="font-semibold mb-1">Clientes</p>
                      <p className="text-2xl font-bold text-blue-600">{plantCustomers}</p>
                      <div className="mt-3 space-y-1 text-xs">
                        <p className="text-slate-500">Ativos</p>
                        {plantUnits.slice(0, 2).map((unit, idx) => (
                          <p key={idx} className="text-slate-600 truncate">
                            • {customers.find(c => c.email === unit.customer_email)?.name || unit.customer_email}
                          </p>
                        ))}
                      </div>
                      <Link to={createPageUrl('CustomerManagement')}>
                        <button className="mt-2 text-xs text-blue-600 hover:underline">
                          Ver clientes →
                        </button>
                      </Link>
                    </div>
                  </div>

                  {/* Estatísticas Financeiras */}
                  <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-slate-500">Geração Mensal Estimada</p>
                      <p className="text-lg font-bold text-slate-900">
                        {plant.monthly_generation_kwh?.toFixed(0) || 0} kWh
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Alocação</p>
                      <p className="text-lg font-bold text-slate-900">
                        {((plantUnits.reduce((s, u) => s + (u.monthly_consumption_kwh || 0), 0) / (plant.monthly_generation_kwh || 1)) * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Contratos Ativos</p>
                      <p className="text-lg font-bold text-slate-900">
                        {plantContracts.filter(c => c.status === 'active').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {powerPlants.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-2">Nenhuma usina cadastrada</p>
                <Link to={createPageUrl('AdminPowerPlants')}>
                  <button className="text-amber-600 hover:underline">
                    Cadastrar primeira usina →
                  </button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}