import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, CheckCircle, ArrowLeft, PlayCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function RegulatoryReports() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedPlant, setSelectedPlant] = useState('');
  const [reportType, setReportType] = useState('aneel_monthly');

  const { data: powerPlants = [] } = useQuery({
    queryKey: ['plants-reports'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['regulatory-reports', selectedMonth],
    queryFn: () => base44.entities.RegulatoryReport.filter({ month_reference: selectedMonth })
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions-reports'],
    queryFn: () => base44.entities.Subscription.filter({ status: 'active' })
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations-reports', selectedMonth],
    queryFn: () => base44.entities.EnergyAllocation.filter({ month_reference: selectedMonth })
  });

  const generateReport = useMutation({
    mutationFn: async () => {
      if (!selectedPlant) throw new Error('Selecione uma usina');

      const plant = powerPlants.find(p => p.id === selectedPlant);
      const plantAllocations = allocations.filter(a => a.power_plant_id === selectedPlant);
      
      const reportData = {
        plant_name: plant.name,
        plant_capacity: plant.capacity_kw,
        month: selectedMonth,
        total_generation: plant.monthly_generation_kwh,
        total_allocated: plantAllocations.reduce((sum, a) => sum + (a.allocated_kwh || 0), 0),
        subscribers_count: plantAllocations.length,
        allocations: plantAllocations.map(a => {
          const sub = subscriptions.find(s => s.id === a.subscription_id);
          return {
            customer: sub?.customer_name,
            email: a.customer_email,
            allocated_kwh: a.allocated_kwh,
            percentage: a.allocation_percentage
          };
        })
      };

      await base44.entities.RegulatoryReport.create({
        report_type: reportType,
        month_reference: selectedMonth,
        power_plant_id: selectedPlant,
        status: 'generated',
        generated_date: new Date().toISOString(),
        data: reportData
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['regulatory-reports']);
      toast.success('Relatório gerado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro: ' + error.message);
    }
  });

  const reportTypeLabels = {
    aneel_monthly: 'ANEEL - Mensal',
    audit: 'Auditoria',
    generation_certificate: 'Certificado de Geração',
    compensation_report: 'Relatório de Compensação',
    customer_list: 'Lista de Clientes'
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    generated: 'bg-blue-100 text-blue-800',
    submitted: 'bg-purple-100 text-purple-800',
    approved: 'bg-green-100 text-green-800'
  };

  const statusLabels = {
    pending: 'Pendente',
    generated: 'Gerado',
    submitted: 'Submetido',
    approved: 'Aprovado'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Relatórios Regulatórios</h1>
                <p className="text-slate-300 text-sm">ANEEL, Auditoria e Certificações</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Relatórios Gerados</p>
                  <p className="text-2xl font-bold">{reports.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Aprovados</p>
                  <p className="text-2xl font-bold">{reports.filter(r => r.status === 'approved').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pendentes</p>
                  <p className="text-2xl font-bold">{reports.filter(r => r.status === 'pending').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Gerar Novo Relatório</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Tipo de Relatório</label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aneel_monthly">ANEEL - Mensal</SelectItem>
                    <SelectItem value="audit">Auditoria</SelectItem>
                    <SelectItem value="generation_certificate">Certificado Geração</SelectItem>
                    <SelectItem value="compensation_report">Compensação</SelectItem>
                    <SelectItem value="customer_list">Lista Clientes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Usina</label>
                <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {powerPlants.map(plant => (
                      <SelectItem key={plant.id} value={plant.id}>{plant.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Mês</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={() => generateReport.mutate()}
                  disabled={!selectedPlant || generateReport.isPending}
                  className="w-full bg-slate-800 hover:bg-slate-900"
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  {generateReport.isPending ? 'Gerando...' : 'Gerar'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Relatórios ({selectedMonth})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports.map((report) => {
                const plant = powerPlants.find(p => p.id === report.power_plant_id);
                return (
                  <Card key={report.id} className="border border-slate-200">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {reportTypeLabels[report.report_type]}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {plant?.name} • {report.month_reference}
                          </p>
                          {report.generated_date && (
                            <p className="text-xs text-slate-500 mt-1">
                              Gerado em {format(new Date(report.generated_date), 'dd/MM/yyyy HH:mm')}
                            </p>
                          )}
                        </div>
                        <Badge className={statusColors[report.status]}>
                          {statusLabels[report.status]}
                        </Badge>
                      </div>

                      {report.data && (
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500">Geração Total</p>
                            <p className="font-semibold">{report.data.total_generation?.toLocaleString()} kWh</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500">Alocado</p>
                            <p className="font-semibold">{report.data.total_allocated?.toLocaleString()} kWh</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500">Assinantes</p>
                            <p className="font-semibold">{report.data.subscribers_count}</p>
                          </div>
                        </div>
                      )}

                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Baixar Relatório
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}

              {reports.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhum relatório gerado neste mês</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}