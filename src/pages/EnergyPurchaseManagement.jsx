import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ArrowLeft, DollarSign, Zap, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from 'date-fns';

export default function EnergyPurchaseManagement() {
  const queryClient = useQueryClient();
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showOwnerDialog, setShowOwnerDialog] = useState(false);
  const [purchaseData, setPurchaseData] = useState({
    power_plant_id: '',
    plant_owner_id: '',
    purchase_type: 'monthly_generation',
    reference_month: format(new Date(), 'yyyy-MM'),
    energy_kwh: 0,
    price_per_kwh: 0
  });
  const [ownerData, setOwnerData] = useState({
    name: '',
    document: '',
    email: '',
    price_per_kwh: 0.08
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['energy-purchases'],
    queryFn: () => base44.entities.EnergyPurchase.list('-created_date')
  });

  const { data: owners = [] } = useQuery({
    queryKey: ['plant-owners'],
    queryFn: () => base44.entities.PlantOwner.list()
  });

  const { data: plants = [] } = useQuery({
    queryKey: ['plants'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const createPurchase = useMutation({
    mutationFn: async (data) => {
      const total = data.energy_kwh * data.price_per_kwh;
      const purchase = await base44.entities.EnergyPurchase.create({
        ...data,
        total_amount: total,
        status: 'pending'
      });
      // Create financial transaction
      await base44.entities.FinancialTransaction.create({
        transaction_type: 'expense',
        category: 'energy_purchase',
        description: `Compra de energia - ${plants.find(p => p.id === data.power_plant_id)?.name}`,
        amount: total,
        reference_id: purchase.id,
        reference_type: 'energy_purchase',
        transaction_date: new Date().toISOString().split('T')[0],
        status: 'pending'
      });
      // Create accounts payable
      await base44.entities.AccountsPayable.create({
        supplier_name: owners.find(o => o.id === data.plant_owner_id)?.name,
        description: `Compra de energia - ${data.energy_kwh} kWh`,
        amount: total,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'energy_purchase',
        reference_id: purchase.id,
        status: 'pending'
      });
      return purchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['energy-purchases']);
      queryClient.invalidateQueries(['financial-transactions']);
      queryClient.invalidateQueries(['accounts-payable']);
      setShowPurchaseDialog(false);
    }
  });

  const createOwner = useMutation({
    mutationFn: (data) => base44.entities.PlantOwner.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['plant-owners']);
      setShowOwnerDialog(false);
    }
  });

  const totalPurchases = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
  const pendingPurchases = purchases.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.total_amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('FinancialDashboard')}>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Compra de Energia</h1>
                <p className="text-amber-400 text-sm">Gestão de aquisição de energia dos geradores</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setShowOwnerDialog(true)} variant="outline" className="border-white/20 text-white">
                <Users className="w-4 h-4 mr-2" />
                Novo Proprietário
              </Button>
              <Button onClick={() => setShowPurchaseDialog(true)} className="bg-amber-500 hover:bg-amber-600">
                <Plus className="w-4 h-4 mr-2" />
                Nova Compra
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid sm:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Comprado</p>
                  <p className="text-2xl font-bold">R$ {totalPurchases.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pendente</p>
                  <p className="text-2xl font-bold">R$ {pendingPurchases.toFixed(2)}</p>
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
                  <p className="text-sm text-slate-500">Proprietários</p>
                  <p className="text-2xl font-bold">{owners.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Histórico de Compras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Usina</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Proprietário</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Tipo</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Energia (kWh)</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Preço/kWh</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Total</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-4 font-medium">{plants.find(p => p.id === purchase.power_plant_id)?.name}</td>
                      <td className="py-4 px-4">{owners.find(o => o.id === purchase.plant_owner_id)?.name}</td>
                      <td className="py-4 px-4 text-sm">{purchase.purchase_type === 'monthly_generation' ? 'Mensal' : 'Saldo'}</td>
                      <td className="py-4 px-4">{purchase.energy_kwh}</td>
                      <td className="py-4 px-4">R$ {purchase.price_per_kwh?.toFixed(3)}</td>
                      <td className="py-4 px-4 font-semibold">R$ {purchase.total_amount?.toFixed(2)}</td>
                      <td className="py-4 px-4">
                        <Badge className={purchase.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {purchase.status === 'paid' ? 'Pago' : 'Pendente'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Compra de Energia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Usina *</Label>
              <Select value={purchaseData.power_plant_id} onValueChange={(v) => setPurchaseData(prev => ({ ...prev, power_plant_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {plants.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Proprietário *</Label>
              <Select value={purchaseData.plant_owner_id} onValueChange={(v) => setPurchaseData(prev => ({ ...prev, plant_owner_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {owners.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo *</Label>
              <Select value={purchaseData.purchase_type} onValueChange={(v) => setPurchaseData(prev => ({ ...prev, purchase_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly_generation">Geração Mensal</SelectItem>
                  <SelectItem value="accumulated_balance">Saldo Acumulado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Energia (kWh) *</Label>
                <Input type="number" value={purchaseData.energy_kwh} onChange={(e) => setPurchaseData(prev => ({ ...prev, energy_kwh: parseFloat(e.target.value) }))} />
              </div>
              <div>
                <Label>Preço/kWh *</Label>
                <Input type="number" step="0.001" value={purchaseData.price_per_kwh} onChange={(e) => setPurchaseData(prev => ({ ...prev, price_per_kwh: parseFloat(e.target.value) }))} />
              </div>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl">
              <p className="text-sm text-slate-600 mb-1">Total</p>
              <p className="text-2xl font-bold">R$ {(purchaseData.energy_kwh * purchaseData.price_per_kwh).toFixed(2)}</p>
            </div>
            <Button className="w-full bg-amber-500 hover:bg-amber-600" onClick={() => createPurchase.mutate(purchaseData)}>Registrar Compra</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showOwnerDialog} onOpenChange={setShowOwnerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Proprietário de Usina</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={ownerData.name} onChange={(e) => setOwnerData(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <Label>CPF/CNPJ *</Label>
              <Input value={ownerData.document} onChange={(e) => setOwnerData(prev => ({ ...prev, document: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={ownerData.email} onChange={(e) => setOwnerData(prev => ({ ...prev, email: e.target.value }))} />
            </div>
            <div>
              <Label>Preço de Compra (R$/kWh) *</Label>
              <Input type="number" step="0.001" value={ownerData.price_per_kwh} onChange={(e) => setOwnerData(prev => ({ ...prev, price_per_kwh: parseFloat(e.target.value) }))} />
            </div>
            <Button className="w-full bg-amber-500 hover:bg-amber-600" onClick={() => createOwner.mutate(ownerData)}>Cadastrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}