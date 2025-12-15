import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ArrowLeft, Wrench, Calendar, CheckCircle, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from 'date-fns';

export default function MaintenanceManagement() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [maintenanceData, setMaintenanceData] = useState({
    power_plant_id: '',
    maintenance_type: 'preventive',
    scheduled_date: '',
    technician: '',
    description: '',
    priority: 'medium'
  });

  const { data: maintenances = [] } = useQuery({
    queryKey: ['maintenances'],
    queryFn: () => base44.entities.MaintenanceSchedule.list('-scheduled_date')
  });

  const { data: plants = [] } = useQuery({
    queryKey: ['plants'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const createMaintenance = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceSchedule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['maintenances']);
      setShowDialog(false);
      setMaintenanceData({
        power_plant_id: '',
        maintenance_type: 'preventive',
        scheduled_date: '',
        technician: '',
        description: '',
        priority: 'medium'
      });
    }
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => {
      const updates = { status };
      if (status === 'completed') {
        updates.completed_date = new Date().toISOString().split('T')[0];
      }
      return base44.entities.MaintenanceSchedule.update(id, updates);
    },
    onSuccess: () => queryClient.invalidateQueries(['maintenances'])
  });

  const scheduled = maintenances.filter(m => m.status === 'scheduled').length;
  const inProgress = maintenances.filter(m => m.status === 'in_progress').length;
  const completed = maintenances.filter(m => m.status === 'completed').length;

  const maintenanceTypeLabels = {
    preventive: 'Preventiva',
    corrective: 'Corretiva',
    inspection: 'Inspeção',
    cleaning: 'Limpeza',
    repair: 'Reparo'
  };

  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-slate-100 text-slate-800'
  };

  const priorityColors = {
    low: 'bg-slate-100 text-slate-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminPowerPlants')}>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Wrench className="w-6 h-6 text-amber-400" />
                <div>
                  <h1 className="text-2xl font-bold">Manutenção Preventiva</h1>
                  <p className="text-amber-400 text-sm">Gestão de manutenções das usinas</p>
                </div>
              </div>
            </div>
            <Button onClick={() => setShowDialog(true)} className="bg-amber-500 hover:bg-amber-600">
              <Plus className="w-4 h-4 mr-2" />
              Agendar Manutenção
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid sm:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Agendadas</p>
                  <p className="text-2xl font-bold">{scheduled}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Em Andamento</p>
                  <p className="text-2xl font-bold">{inProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Concluídas</p>
                  <p className="text-2xl font-bold">{completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Programação de Manutenções</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {maintenances.map((maintenance) => {
                const plant = plants.find(p => p.id === maintenance.power_plant_id);
                return (
                  <div key={maintenance.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{plant?.name}</h3>
                        <p className="text-sm text-slate-500">{maintenanceTypeLabels[maintenance.maintenance_type]}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={statusColors[maintenance.status]}>
                          {maintenance.status === 'scheduled' ? 'Agendada' :
                           maintenance.status === 'in_progress' ? 'Em Andamento' :
                           maintenance.status === 'completed' ? 'Concluída' : 'Cancelada'}
                        </Badge>
                        <Badge className={priorityColors[maintenance.priority]}>
                          {maintenance.priority === 'urgent' ? 'Urgente' :
                           maintenance.priority === 'high' ? 'Alta' :
                           maintenance.priority === 'medium' ? 'Média' : 'Baixa'}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-slate-500">Data Agendada</p>
                        <p className="font-medium">{format(new Date(maintenance.scheduled_date), 'dd/MM/yyyy')}</p>
                      </div>
                      {maintenance.technician && (
                        <div>
                          <p className="text-xs text-slate-500">Técnico</p>
                          <p className="font-medium">{maintenance.technician}</p>
                        </div>
                      )}
                      {maintenance.cost > 0 && (
                        <div>
                          <p className="text-xs text-slate-500">Custo</p>
                          <p className="font-medium">R$ {maintenance.cost.toFixed(2)}</p>
                        </div>
                      )}
                    </div>

                    {maintenance.description && (
                      <p className="text-sm text-slate-600 mb-3">{maintenance.description}</p>
                    )}

                    {maintenance.status === 'scheduled' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: maintenance.id, status: 'in_progress' })}
                        >
                          Iniciar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus.mutate({ id: maintenance.id, status: 'cancelled' })}
                        >
                          Cancelar
                        </Button>
                      </div>
                    )}

                    {maintenance.status === 'in_progress' && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => updateStatus.mutate({ id: maintenance.id, status: 'completed' })}
                      >
                        Concluir
                      </Button>
                    )}
                  </div>
                );
              })}

              {maintenances.length === 0 && (
                <div className="text-center py-12">
                  <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhuma manutenção agendada</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar Manutenção</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Usina *</Label>
              <Select value={maintenanceData.power_plant_id} onValueChange={(v) => setMaintenanceData(prev => ({ ...prev, power_plant_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {plants.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo *</Label>
                <Select value={maintenanceData.maintenance_type} onValueChange={(v) => setMaintenanceData(prev => ({ ...prev, maintenance_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Preventiva</SelectItem>
                    <SelectItem value="corrective">Corretiva</SelectItem>
                    <SelectItem value="inspection">Inspeção</SelectItem>
                    <SelectItem value="cleaning">Limpeza</SelectItem>
                    <SelectItem value="repair">Reparo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={maintenanceData.priority} onValueChange={(v) => setMaintenanceData(prev => ({ ...prev, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data *</Label>
                <Input type="date" value={maintenanceData.scheduled_date} onChange={(e) => setMaintenanceData(prev => ({ ...prev, scheduled_date: e.target.value }))} />
              </div>
              <div>
                <Label>Técnico</Label>
                <Input value={maintenanceData.technician} onChange={(e) => setMaintenanceData(prev => ({ ...prev, technician: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={maintenanceData.description}
                onChange={(e) => setMaintenanceData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <Button className="w-full bg-amber-500 hover:bg-amber-600" onClick={() => createMaintenance.mutate(maintenanceData)}>
              Agendar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}