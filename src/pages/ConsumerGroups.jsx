import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, Users, PieChart, Settings, Plus, 
  TrendingDown, Zap, DollarSign, BarChart3, ArrowLeft
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ConsumerGroups() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [formData, setFormData] = useState({
    group_name: '',
    group_type: 'condominium',
    admin_email: '',
    total_units: 1,
    allocation_method: 'equal',
    common_area_percentage: 10,
    address: ''
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['consumer-groups'],
    queryFn: () => base44.entities.ConsumerGroup.list()
  });

  const { data: units = [] } = useQuery({
    queryKey: ['consumer-units'],
    queryFn: () => base44.entities.ConsumerUnit.list()
  });

  const createGroup = useMutation({
    mutationFn: (data) => base44.entities.ConsumerGroup.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['consumer-groups']);
      setShowDialog(false);
      setFormData({
        group_name: '',
        group_type: 'condominium',
        admin_email: '',
        total_units: 1,
        allocation_method: 'equal',
        common_area_percentage: 10,
        address: ''
      });
    }
  });

  const groupTypeLabels = {
    condominium: 'Condomínio',
    cooperative: 'Cooperativa',
    community: 'Comunidade',
    consortium: 'Consórcio'
  };

  const allocationLabels = {
    area: 'Por Área',
    equal: 'Igual',
    consumption: 'Por Consumo',
    custom: 'Personalizado'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Grupos e Condomínios</h1>
                <p className="text-amber-400 text-sm">Gestão de rateio e alocação compartilhada</p>
              </div>
            </div>
            <Button onClick={() => setShowDialog(true)} className="bg-amber-500 hover:bg-amber-600">
              <Plus className="w-4 h-4 mr-2" />
              Novo Grupo
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid sm:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Grupos</p>
                  <p className="text-3xl font-bold">{groups.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Unidades</p>
                  <p className="text-3xl font-bold">{groups.reduce((sum, g) => sum + (g.total_units || 0), 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Capacidade Total</p>
                  <p className="text-3xl font-bold">{groups.reduce((sum, g) => sum + (g.total_capacity_kwh || 0), 0)} kWh</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <PieChart className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Grupos Ativos</p>
                  <p className="text-3xl font-bold">{groups.filter(g => g.status === 'active').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Groups List */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card className="border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer" onClick={() => setSelectedGroup(group)}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{group.group_name}</h3>
                        <p className="text-sm text-slate-500">{groupTypeLabels[group.group_type]}</p>
                      </div>
                    </div>
                    <Badge className={group.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {group.status === 'active' ? 'Ativo' : 'Pendente'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-slate-500">Unidades</span>
                      <span className="font-semibold">{group.total_units}</span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-slate-500">Rateio</span>
                      <span className="font-semibold">{allocationLabels[group.allocation_method]}</span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-slate-500">Área Comum</span>
                      <span className="font-semibold">{group.common_area_percentage || 0}%</span>
                    </div>
                    {group.total_capacity_kwh && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Capacidade</span>
                        <span className="font-semibold text-amber-600">{group.total_capacity_kwh} kWh</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {groups.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum grupo cadastrado</h3>
              <p className="text-slate-500 mb-6">Crie o primeiro grupo para gerenciar rateio compartilhado</p>
              <Button onClick={() => setShowDialog(true)} className="bg-amber-500 hover:bg-amber-600">
                <Plus className="w-4 h-4 mr-2" />
                Criar Grupo
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Grupo Consumidor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Grupo *</Label>
              <Input
                value={formData.group_name}
                onChange={(e) => setFormData(prev => ({ ...prev, group_name: e.target.value }))}
                placeholder="Ex: Condomínio Residencial"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo *</Label>
                <Select value={formData.group_type} onValueChange={(v) => setFormData(prev => ({ ...prev, group_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="condominium">Condomínio</SelectItem>
                    <SelectItem value="cooperative">Cooperativa</SelectItem>
                    <SelectItem value="community">Comunidade</SelectItem>
                    <SelectItem value="consortium">Consórcio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Total de Unidades *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.total_units}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_units: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <Label>Email do Administrador *</Label>
              <Input
                type="email"
                value={formData.admin_email}
                onChange={(e) => setFormData(prev => ({ ...prev, admin_email: e.target.value }))}
                placeholder="admin@exemplo.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Método de Rateio *</Label>
                <Select value={formData.allocation_method} onValueChange={(v) => setFormData(prev => ({ ...prev, allocation_method: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="area">Por Área</SelectItem>
                    <SelectItem value="equal">Igual</SelectItem>
                    <SelectItem value="consumption">Por Consumo</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Área Comum (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.common_area_percentage}
                  onChange={(e) => setFormData(prev => ({ ...prev, common_area_percentage: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <Label>Endereço</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Endereço completo do grupo"
                rows={2}
              />
            </div>

            <Button 
              className="w-full bg-amber-500 hover:bg-amber-600"
              onClick={() => createGroup.mutate(formData)}
            >
              Criar Grupo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Details Dialog */}
      {selectedGroup && (
        <Dialog open={!!selectedGroup} onOpenChange={() => setSelectedGroup(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedGroup.group_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Tipo</p>
                  <p className="font-semibold">{groupTypeLabels[selectedGroup.group_type]}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Total de Unidades</p>
                  <p className="font-semibold">{selectedGroup.total_units}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Método de Rateio</p>
                  <p className="font-semibold">{allocationLabels[selectedGroup.allocation_method]}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Área Comum</p>
                  <p className="font-semibold">{selectedGroup.common_area_percentage}%</p>
                </div>
              </div>

              {selectedGroup.address && (
                <div className="p-4 bg-amber-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Endereço</p>
                  <p className="font-medium">{selectedGroup.address}</p>
                </div>
              )}

              <div className="p-4 bg-gradient-to-br from-slate-900 to-amber-900 rounded-xl text-white">
                <h4 className="font-semibold mb-3">Simulação de Rateio</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Consumo total do grupo:</span>
                    <span className="font-semibold">1000 kWh</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Por unidade ({selectedGroup.allocation_method}):</span>
                    <span className="font-semibold">{(1000 / selectedGroup.total_units).toFixed(1)} kWh</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Área comum ({selectedGroup.common_area_percentage}%):</span>
                    <span className="font-semibold">{(1000 * selectedGroup.common_area_percentage / 100).toFixed(1)} kWh</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}