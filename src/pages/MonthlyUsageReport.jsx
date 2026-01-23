import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Download, Zap, TrendingUp, TrendingDown, Users, Building2 } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MonthlyUsageReport() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedPlant, setSelectedPlant] = useState('all');
  const [groupBy, setGroupBy] = useState('customer'); // customer, unit, plant

  const { data: powerPlants = [] } = useQuery({
    queryKey: ['powerplants'],
    queryFn: () => base44.entities.PowerPlant.list()
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
    queryKey: ['contracts'],
    queryFn: () => base44.entities.PowerPlantContract.list()
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['utility-bills'],
    queryFn: () => base44.entities.UtilityBill.list()
  });

  // Filtrar dados do mês selecionado
  const monthInvoices = invoices.filter(inv => 
    inv.reference_month?.includes(selectedMonth)
  );

  // Agrupar dados
  const getGroupedData = () => {
    if (groupBy === 'customer') {
      return customers.map(customer => {
        const customerUnits = allUnits.filter(u => u.customer_email === customer.email);
        const customerInvoices = monthInvoices.filter(inv => inv.customer_email === customer.email);
        const totalConsumption = customerInvoices.reduce((sum, inv) => sum + (inv.kwh_consumed || 0), 0);
        const totalAmount = customerInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          units: customerUnits.length,
          consumption: totalConsumption,
          amount: totalAmount,
          invoices: customerInvoices.length
        };
      });
    } else if (groupBy === 'plant') {
      return powerPlants.map(plant => {
        const plantUnits = allUnits.filter(u => u.power_plant_name === plant.name);
        const plantEmails = plantUnits.map(u => u.customer_email);
        const plantInvoices = monthInvoices.filter(inv => plantEmails.includes(inv.customer_email));
        const totalConsumption = plantInvoices.reduce((sum, inv) => sum + (inv.kwh_consumed || 0), 0);

        return {
          id: plant.id,
          name: plant.name,
          capacity: plant.capacity_kw,
          units: plantUnits.length,
          consumption: totalConsumption,
          customers: new Set(plantEmails).size
        };
      });
    } else {
      return allUnits.map(unit => {
        const unitInvoices = monthInvoices.filter(inv => 
          inv.installation_number === unit.unit_number
        );
        const totalConsumption = unitInvoices.reduce((sum, inv) => sum + (inv.kwh_consumed || 0), 0);
        const totalAmount = unitInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

        return {
          id: unit.id,
          name: unit.unit_name || unit.unit_number,
          customer: customers.find(c => c.email === unit.customer_email)?.name,
          plant: unit.power_plant_name,
          consumption: totalConsumption,
          amount: totalAmount
        };
      });
    }
  };

  const groupedData = getGroupedData();
  const totalConsumption = groupedData.reduce((sum, item) => sum + (item.consumption || 0), 0);

  // Gerar meses para o select
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: ptBR })
    };
  });

  const exportToCSV = () => {
    const headers = groupBy === 'customer' 
      ? ['Nome', 'Email', 'Unidades', 'Consumo (kWh)', 'Valor (R$)', 'Faturas']
      : groupBy === 'plant'
      ? ['Usina', 'Capacidade (kW)', 'Unidades', 'Consumo (kWh)', 'Clientes']
      : ['Unidade', 'Cliente', 'Usina', 'Consumo (kWh)', 'Valor (R$)'];

    const rows = groupedData.map(item => {
      if (groupBy === 'customer') {
        return [item.name, item.email, item.units, item.consumption, item.amount, item.invoices];
      } else if (groupBy === 'plant') {
        return [item.name, item.capacity, item.units, item.consumption, item.customers];
      } else {
        return [item.name, item.customer, item.plant, item.consumption, item.amount];
      }
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-uso-${selectedMonth}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Relatório de Uso Mensal</h1>
          <p className="text-slate-600">Análise detalhada de consumo por cliente, unidade ou usina</p>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid sm:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Mês de Referência</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Agrupar Por</label>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Cliente</SelectItem>
                    <SelectItem value="unit">Unidade</SelectItem>
                    <SelectItem value="plant">Usina</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Usina</label>
                <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {powerPlants.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={exportToCSV} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo */}
        <div className="grid sm:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Consumo Total</p>
                  <p className="text-2xl font-bold">{totalConsumption.toFixed(0)} kWh</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">
                    {groupBy === 'customer' ? 'Clientes' : groupBy === 'plant' ? 'Usinas' : 'Unidades'}
                  </p>
                  <p className="text-2xl font-bold">{groupedData.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Faturas</p>
                  <p className="text-2xl font-bold">{monthInvoices.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Dados */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    {groupBy === 'customer' && (
                      <>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Cliente</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Email</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Unidades</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Consumo (kWh)</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Valor (R$)</th>
                      </>
                    )}
                    {groupBy === 'plant' && (
                      <>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Usina</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Capacidade</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Unidades</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Consumo (kWh)</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Clientes</th>
                      </>
                    )}
                    {groupBy === 'unit' && (
                      <>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Unidade</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Cliente</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Usina</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Consumo (kWh)</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Valor (R$)</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {groupedData.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-slate-50">
                      {groupBy === 'customer' && (
                        <>
                          <td className="py-3 px-4 font-medium">{item.name}</td>
                          <td className="py-3 px-4 text-slate-600">{item.email}</td>
                          <td className="py-3 px-4 text-right">{item.units}</td>
                          <td className="py-3 px-4 text-right font-semibold">{item.consumption.toFixed(0)}</td>
                          <td className="py-3 px-4 text-right text-green-600 font-semibold">
                            R$ {item.amount.toFixed(2)}
                          </td>
                        </>
                      )}
                      {groupBy === 'plant' && (
                        <>
                          <td className="py-3 px-4 font-medium">{item.name}</td>
                          <td className="py-3 px-4 text-right">{item.capacity} kW</td>
                          <td className="py-3 px-4 text-right">{item.units}</td>
                          <td className="py-3 px-4 text-right font-semibold">{item.consumption.toFixed(0)}</td>
                          <td className="py-3 px-4 text-right">{item.customers}</td>
                        </>
                      )}
                      {groupBy === 'unit' && (
                        <>
                          <td className="py-3 px-4 font-medium">{item.name}</td>
                          <td className="py-3 px-4 text-slate-600">{item.customer}</td>
                          <td className="py-3 px-4 text-slate-600">{item.plant || '-'}</td>
                          <td className="py-3 px-4 text-right font-semibold">{item.consumption.toFixed(0)}</td>
                          <td className="py-3 px-4 text-right text-green-600 font-semibold">
                            R$ {item.amount.toFixed(2)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}