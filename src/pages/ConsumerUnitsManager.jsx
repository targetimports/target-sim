import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, Edit, Trash2, ArrowLeft, Zap, Building2, Search, FileText, Download
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';

const DISTRIBUTORS = ['neoenergiabahia', 'coelba', 'cemig', 'enel', 'cpfl'];
const UNIT_TYPES = ['residential', 'commercial', 'industrial'];
const TARIFF_MODALITIES = ['B1', 'B2', 'B3', 'B4'];
const CONNECTION_TYPES = ['Monofásica', 'Bifásica', 'Trifásica'];

export default function ConsumerUnitsManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [pastedData, setPastedData] = useState('');
  const [formData, setFormData] = useState({
    subscription_id: '',
    customer_email: '',
    unit_name: '',
    unit_type: 'commercial',
    installation_code: '',
    customer_code: '',
    monthly_consumption_kwh: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    installation_number: '',
    distributor: '',
    meter_number: '',
    consumption_limit_kwh: '',
    status: 'active',
    installation_date: '',
    notes: ''
  });

  const { data: units = [] } = useQuery({
    queryKey: ['consumer-units'],
    queryFn: () => base44.entities.ConsumerUnit.list()
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => base44.entities.Subscription.list()
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list()
  });

  const createUnit = useMutation({
    mutationFn: (data) => base44.entities.ConsumerUnit.create({
      ...data,
      monthly_consumption_kwh: data.monthly_consumption_kwh ? parseFloat(data.monthly_consumption_kwh) : undefined,
      consumption_limit_kwh: data.consumption_limit_kwh ? parseFloat(data.consumption_limit_kwh) : undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['consumer-units']);
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const updateUnit = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ConsumerUnit.update(id, {
      ...data,
      monthly_consumption_kwh: data.monthly_consumption_kwh ? parseFloat(data.monthly_consumption_kwh) : undefined,
      consumption_limit_kwh: data.consumption_limit_kwh ? parseFloat(data.consumption_limit_kwh) : undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['consumer-units']);
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const deleteUnit = useMutation({
    mutationFn: (id) => base44.entities.ConsumerUnit.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['consumer-units']);
      setDeleteConfirmOpen(false);
      setUnitToDelete(null);
    }
  });

  const bulkCreateUnits = useMutation({
    mutationFn: async (units) => {
      return await base44.entities.ConsumerUnit.bulkCreate(units);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['consumer-units']);
      toast.success(`${data.length} unidades importadas com sucesso!`);
      setImportDialogOpen(false);
      setPastedData('');
    },
    onError: () => {
      toast.error('Erro ao importar unidades');
    }
  });

  const resetForm = () => {
    setFormData({
      subscription_id: '',
      customer_email: '',
      unit_name: '',
      unit_type: 'commercial',
      installation_code: '',
      customer_code: '',
      monthly_consumption_kwh: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      installation_number: '',
      distributor: '',
      meter_number: '',
      consumption_limit_kwh: '',
      status: 'active',
      installation_date: '',
      notes: ''
    });
    setEditingUnit(null);
  };

  const openEditDialog = (unit) => {
    setEditingUnit(unit);
    setFormData({
      subscription_id: unit.subscription_id || '',
      customer_email: unit.customer_email || '',
      unit_name: unit.unit_name || '',
      unit_type: unit.unit_type || 'commercial',
      installation_code: unit.installation_code || '',
      customer_code: unit.customer_code || '',
      monthly_consumption_kwh: unit.monthly_consumption_kwh?.toString() || '',
      address: unit.address || '',
      city: unit.city || '',
      state: unit.state || '',
      zip_code: unit.zip_code || '',
      installation_number: unit.installation_number || '',
      distributor: unit.distributor || '',
      meter_number: unit.meter_number || '',
      consumption_limit_kwh: unit.consumption_limit_kwh?.toString() || '',
      status: unit.status || 'active',
      installation_date: unit.installation_date || '',
      notes: unit.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingUnit) {
      updateUnit.mutate({ id: editingUnit.id, data: formData });
    } else {
      createUnit.mutate(formData);
    }
  };

  const handleDeleteClick = (unit) => {
    setUnitToDelete(unit);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (unitToDelete) {
      deleteUnit.mutate(unitToDelete.id);
    }
  };

  const filteredUnits = units.filter(unit => 
    unit.unit_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.installation_number?.includes(searchTerm)
  );

  const totalConsumption = filteredUnits.reduce((sum, u) => sum + (u.monthly_consumption_kwh || 0), 0);
  const activeUnits = filteredUnits.filter(u => u.status === 'active').length;

  const handlePasteImport = () => {
    try {
      const lines = pastedData.trim().split('\n');
      if (lines.length < 2) {
        toast.error('Cole pelo menos o cabeçalho e uma linha de dados');
        return;
      }

      const headers = lines[0].split('\t');
      const unitsToCreate = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('\t');
        if (values.length < 3) continue;

        const customerName = values[2]?.trim() || '';
        
        // Buscar cliente existente pelo nome
        const matchingCustomer = customers.find(cust => 
          cust.name?.toLowerCase() === customerName.toLowerCase()
        );

        const unit = {
          subscription_id: matchingCustomer?.id || values[0]?.trim() || '',
          customer_id: matchingCustomer?.id || values[1]?.trim() || '',
          customer_name: customerName,
          customer_email: matchingCustomer?.email || '',
          power_plant_name: values[3]?.trim() || '',
          unit_number: values[4]?.trim() || '',
          new_unit_number: values[5]?.trim() || '',
          unit_name: values[6]?.trim() || `UC ${values[4]?.trim()}`,
          distributor: values[7]?.trim() || '',
          generator_unit: values[8]?.trim() || '',
          compensation_percentage: values[9] ? parseFloat(values[9]) : undefined,
          connection_type: values[10]?.trim() || '',
          tariff_mode: values[11]?.trim() || '',
          subclass: values[12]?.trim() || '',
          average_consumption_kwh: values[13] ? parseFloat(values[13]) : undefined,
          balance_kwh: values[14] ? parseFloat(values[14]) : undefined,
          discount_percentage: values[15] ? parseFloat(values[15]) : undefined,
          grace_period_months: values[16] ? parseInt(values[16]) : undefined,
          contract_end_date: values[17]?.trim() || '',
          contract_start_date: values[18]?.trim() || '',
          grace_period_discount: values[19] ? parseFloat(values[19]) : undefined,
          total_savings: values[20] ? parseFloat(values[20]) : undefined,
          projected_savings_12months: values[21] ? parseFloat(values[21]) : undefined,
          installation_number: values[4]?.trim() || '',
          monthly_consumption_kwh: values[13] ? parseFloat(values[13]) : undefined,
          status: 'active'
        };

        unitsToCreate.push(unit);
      }

      if (unitsToCreate.length === 0) {
        toast.error('Nenhuma unidade válida encontrada nos dados colados');
        return;
      }

      const unitsWithoutCustomer = unitsToCreate.filter(u => !u.customer_email);
      if (unitsWithoutCustomer.length > 0) {
        toast.warning(`${unitsWithoutCustomer.length} UCs sem cliente vinculado serão importadas sem vinculação`);
      }

      bulkCreateUnits.mutate(unitsToCreate);
    } catch (error) {
      console.error('Erro ao processar dados:', error);
      toast.error('Erro ao processar dados colados');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-900 to-blue-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Unidades Consumidoras</h1>
                  <p className="text-xs text-slate-400">Gerencie todas as UCs dos clientes</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setImportDialogOpen(true)} variant="outline" className="text-white border-white/20 hover:bg-white/10">
                <FileText className="w-4 h-4 mr-2" />
                Importar Dados
              </Button>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nova UC
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total de UCs</p>
                  <p className="text-2xl font-bold">{units.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">UCs Ativas</p>
                  <p className="text-2xl font-bold">{activeUnits}</p>
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
                  <p className="text-sm text-slate-500">Consumo Total Mensal</p>
                  <p className="text-2xl font-bold">{(totalConsumption / 1000).toFixed(1)}k kWh</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Pesquisar por nome, email ou número da UC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Nome</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Cliente</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Número UC</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Concessionária</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Consumo Mensal</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map((unit) => (
                  <motion.tr
                    key={unit.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{unit.unit_name}</div>
                      <div className="text-xs text-slate-500">{unit.address}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{unit.customer_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm bg-slate-100 px-2 py-1 rounded">{unit.installation_number}</code>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{unit.distributor}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{(unit.monthly_consumption_kwh || 0).toLocaleString()} kWh</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={
                        unit.status === 'active' ? 'bg-green-100 text-green-800' :
                        unit.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-slate-100 text-slate-800'
                      }>
                        {unit.status === 'active' ? 'Ativa' : unit.status === 'suspended' ? 'Suspensa' : 'Inativa'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(unit)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(unit)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUnits.length === 0 && (
            <CardContent className="p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma UC encontrada</h3>
              <p className="text-slate-500 mb-6">Cadastre sua primeira unidade consumidora</p>
              <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nova UC
              </Button>
            </CardContent>
          )}
        </Card>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'Editar UC' : 'Nova Unidade Consumidora'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da UC *</Label>
                <Input
                  value={formData.unit_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit_name: e.target.value }))}
                  placeholder="Ex: Sala 101"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Email do Cliente *</Label>
                <Input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                  placeholder="cliente@email.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Número UC *</Label>
                <Input
                  value={formData.installation_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, installation_number: e.target.value }))}
                  placeholder="Ex: 1234567"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Código da Instalação</Label>
                <Input
                  value={formData.installation_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, installation_code: e.target.value }))}
                  placeholder="Código"
                />
              </div>

              <div className="space-y-2">
                <Label>Código do Cliente</Label>
                <Input
                  value={formData.customer_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_code: e.target.value }))}
                  placeholder="Código"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Concessionária *</Label>
                <Select value={formData.distributor} onValueChange={(v) => setFormData(prev => ({ ...prev, distributor: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTRIBUTORS.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Unidade</Label>
                <Select value={formData.unit_type} onValueChange={(v) => setFormData(prev => ({ ...prev, unit_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t === 'residential' ? 'Residencial' : t === 'commercial' ? 'Comercial' : 'Industrial'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Consumo Mensal (kWh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.monthly_consumption_kwh}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthly_consumption_kwh: e.target.value }))}
                  placeholder="Ex: 1000"
                />
              </div>

              <div className="space-y-2">
                <Label>Limite de Consumo (kWh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.consumption_limit_kwh}
                  onChange={(e) => setFormData(prev => ({ ...prev, consumption_limit_kwh: e.target.value }))}
                  placeholder="Ex: 1500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Endereço *</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Endereço completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Cidade"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="BA"
                  maxLength="2"
                />
              </div>

              <div className="space-y-2">
                <Label>CEP</Label>
                <Input
                  value={formData.zip_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                  placeholder="00000-000"
                />
              </div>

              <div className="space-y-2">
                <Label>Número do Medidor</Label>
                <Input
                  value={formData.meter_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, meter_number: e.target.value }))}
                  placeholder="Número"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Instalação</Label>
                <Input
                  type="date"
                  value={formData.installation_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, installation_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="suspended">Suspensa</SelectItem>
                    <SelectItem value="inactive">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                {editingUnit ? 'Salvar alterações' : 'Cadastrar UC'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Unidades Consumidoras</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📋 Como importar:</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Copie os dados de uma planilha (Excel, Google Sheets, etc.)</li>
                <li>Cole no campo abaixo (incluindo o cabeçalho)</li>
                <li>Clique em "Importar" para processar</li>
              </ol>
            </div>

            <div className="space-y-2">
              <Label>Cole aqui os dados da planilha (Ctrl+V)</Label>
              <Textarea
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                placeholder="ID da UC	ID do cliente	Nome do cliente	Nome da usina	Número UC	Novo Número UC	Nome	Concessionária	Unidade Geradora	Percentual de compensação	Tipo de conexão	Modalidade Tarifária	Subclasse	Média de consumo	Saldo	Percentual de desconto	Carência em meses	Data de fim do contrato	Data de inicio do contrato	Desconto na carência	Economia total	Economia prevista em 12 meses"
                rows={12}
                className="font-mono text-xs"
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="text-sm text-slate-600">
                <strong>Colunas esperadas:</strong> ID da UC, ID do cliente, Nome do cliente, Nome da usina, Número UC, 
                Novo Número UC, Nome, Concessionária, Unidade Geradora, % compensação, Tipo de conexão, 
                Modalidade Tarifária, Subclasse, Média consumo, Saldo, % desconto, Carência (meses), 
                Data fim contrato, Data início contrato, Desconto carência, Economia total, Economia 12 meses
              </p>
            </div>

            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1" 
                onClick={() => {
                  setImportDialogOpen(false);
                  setPastedData('');
                }}
              >
                Cancelar
              </Button>
              <Button 
                type="button" 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handlePasteImport}
                disabled={!pastedData.trim() || bulkCreateUnits.isPending}
              >
                <Download className="w-4 h-4 mr-2" />
                {bulkCreateUnits.isPending ? 'Importando...' : 'Importar Dados'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir UC?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a UC <strong>{unitToDelete?.unit_name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUnitToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}