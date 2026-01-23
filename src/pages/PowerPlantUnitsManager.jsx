import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Zap, Users, Search, Link2, X, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

export default function PowerPlantUnitsManager() {
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const queryClient = useQueryClient();

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

  const linkUnitMutation = useMutation({
    mutationFn: ({ unitId, plantName }) => 
      base44.entities.ConsumerUnit.update(unitId, { 
        power_plant_name: plantName 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['consumer-units']);
      setShowLinkDialog(false);
      setSelectedUnit(null);
      toast.success('Unidade vinculada com sucesso!');
    }
  });

  const unlinkUnitMutation = useMutation({
    mutationFn: (unitId) => 
      base44.entities.ConsumerUnit.update(unitId, { 
        power_plant_name: null 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['consumer-units']);
      toast.success('Unidade desvinculada!');
    }
  });

  const linkedUnits = allUnits.filter(u => u.power_plant_name === selectedPlant?.name);
  const unlinkedUnits = allUnits.filter(u => !u.power_plant_name && 
    u.unit_name?.toLowerCase().includes(searchTerm.toLowerCase()));

  const getCustomerName = (email) => {
    const customer = customers.find(c => c.email === email);
    return customer?.name || email;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Vincular Unidades às Usinas</h1>
          <p className="text-slate-600">Gerencie quais unidades consumidoras estão vinculadas a cada usina</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Lista de Usinas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usinas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {powerPlants.map((plant) => {
                const unitCount = allUnits.filter(u => u.power_plant_name === plant.name).length;
                return (
                  <button
                    key={plant.id}
                    onClick={() => setSelectedPlant(plant)}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      selectedPlant?.id === plant.id
                        ? 'bg-amber-50 border-amber-300'
                        : 'hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-amber-600" />
                      <p className="font-semibold">{plant.name}</p>
                    </div>
                    <p className="text-sm text-slate-500">{plant.capacity_kw} kW</p>
                    <Badge className="mt-2">{unitCount} unidades</Badge>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Unidades Vinculadas */}
          {selectedPlant && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Unidades Vinculadas</span>
                  <Badge>{linkedUnits.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {linkedUnits.map((unit) => (
                  <div key={unit.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="w-4 h-4 text-green-600" />
                          <p className="font-semibold text-sm">{unit.unit_name || unit.unit_number}</p>
                        </div>
                        <p className="text-xs text-slate-600">
                          <Users className="w-3 h-3 inline mr-1" />
                          {getCustomerName(unit.customer_email)}
                        </p>
                        <p className="text-xs text-slate-500">{unit.monthly_consumption_kwh} kWh/mês</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => unlinkUnitMutation.mutate(unit.id)}
                        className="h-8 w-8"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {linkedUnits.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Zap className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm">Nenhuma unidade vinculada</p>
                  </div>
                )}
                <Button
                  onClick={() => setShowLinkDialog(true)}
                  className="w-full"
                  variant="outline"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Vincular Unidade
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Preview do Fluxo */}
          {selectedPlant && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fluxo de Energia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <Building2 className="w-6 h-6 text-amber-600 mb-2" />
                    <p className="font-semibold">{selectedPlant.name}</p>
                    <p className="text-sm text-slate-600">{selectedPlant.capacity_kw} kW instalados</p>
                  </div>

                  <div className="flex justify-center">
                    <ArrowRight className="w-6 h-6 text-slate-400" />
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <Zap className="w-6 h-6 text-green-600 mb-2" />
                    <p className="font-semibold">{linkedUnits.length} Unidades</p>
                    <p className="text-sm text-slate-600">
                      {linkedUnits.reduce((sum, u) => sum + (u.monthly_consumption_kwh || 0), 0).toFixed(0)} kWh/mês
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <ArrowRight className="w-6 h-6 text-slate-400" />
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600 mb-2" />
                    <p className="font-semibold">{new Set(linkedUnits.map(u => u.customer_email)).size} Clientes</p>
                    <p className="text-sm text-slate-600">Ativos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialog para Vincular Unidade */}
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Vincular Unidade a {selectedPlant?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Buscar unidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
              <div className="max-h-96 overflow-y-auto space-y-2">
                {unlinkedUnits.map((unit) => (
                  <button
                    key={unit.id}
                    onClick={() => {
                      linkUnitMutation.mutate({
                        unitId: unit.id,
                        plantName: selectedPlant.name
                      });
                    }}
                    className="w-full p-3 border rounded-lg hover:bg-slate-50 text-left"
                  >
                    <p className="font-semibold">{unit.unit_name || unit.unit_number}</p>
                    <p className="text-sm text-slate-600">{getCustomerName(unit.customer_email)}</p>
                    <p className="text-xs text-slate-500">{unit.monthly_consumption_kwh} kWh/mês</p>
                  </button>
                ))}
                {unlinkedUnits.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    Nenhuma unidade disponível
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}