import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Plus, ArrowLeft, TrendingUp, TrendingDown, History } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function CreditAdjustments() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    customer_email: '',
    subscription_id: '',
    adjustment_type: 'add',
    amount_kwh: '',
    reason: '',
    notes: ''
  });

  const { data: adjustments = [] } = useQuery({
    queryKey: ['credit-adjustments'],
    queryFn: () => base44.entities.CreditAdjustment.list('-created_date', 100)
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions-adjustments'],
    queryFn: () => base44.entities.Subscription.filter({ status: 'active' })
  });

  const { data: balances = [] } = useQuery({
    queryKey: ['credit-balances-adjustments'],
    queryFn: () => base44.entities.CreditBalance.list()
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const createAdjustmentMutation = useMutation({
    mutationFn: async (data) => {
      const balance = balances.find(b => b.customer_email === data.customer_email);
      const previousBalance = balance?.balance_kwh || 0;
      const newBalance = data.adjustment_type === 'add' 
        ? previousBalance + parseFloat(data.amount_kwh)
        : previousBalance - parseFloat(data.amount_kwh);

      const adjustment = await base44.entities.CreditAdjustment.create({
        ...data,
        amount_kwh: parseFloat(data.amount_kwh),
        adjusted_by: user?.email || 'system',
        previous_balance: previousBalance,
        new_balance: newBalance
      });

      if (balance) {
        await base44.entities.CreditBalance.update(balance.id, {
          balance_kwh: newBalance
        });
      }

      await base44.entities.CreditTransaction.create({
        customer_email: data.customer_email,
        subscription_id: data.subscription_id,
        transaction_type: 'adjustment',
        amount_kwh: parseFloat(data.amount_kwh),
        balance_before: previousBalance,
        balance_after: newBalance,
        reference_id: adjustment.id,
        description: `Ajuste: ${data.reason}`
      });

      return adjustment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['credit-adjustments']);
      queryClient.invalidateQueries(['credit-balances-adjustments']);
      setShowDialog(false);
      setFormData({
        customer_email: '',
        subscription_id: '',
        adjustment_type: 'add',
        amount_kwh: '',
        reason: '',
        notes: ''
      });
      toast.success('Ajuste realizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao realizar ajuste');
    }
  });

  const totalAdded = adjustments.filter(a => a.adjustment_type === 'add').reduce((sum, a) => sum + a.amount_kwh, 0);
  const totalSubtracted = adjustments.filter(a => a.adjustment_type === 'subtract').reduce((sum, a) => sum + a.amount_kwh, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">⚖️ Ajustes Manuais de Crédito</h1>
                <p className="text-purple-200 text-sm">Correções e ajustes excepcionais</p>
              </div>
            </div>
            <Button onClick={() => setShowDialog(true)} className="bg-white text-purple-900 hover:bg-purple-50">
              <Plus className="w-4 h-4 mr-2" />
              Novo Ajuste
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <History className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Ajustes</p>
                  <p className="text-2xl font-bold">{adjustments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Créditos Adicionados</p>
                  <p className="text-2xl font-bold text-green-600">{totalAdded.toFixed(0)} kWh</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Créditos Subtraídos</p>
                  <p className="text-2xl font-bold text-red-600">{totalSubtracted.toFixed(0)} kWh</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Ajustes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {adjustments.map((adj) => (
                <div key={adj.id} className="p-4 bg-slate-50 rounded-xl border">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={adj.adjustment_type === 'add' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {adj.adjustment_type === 'add' ? '+ Adição' : '- Subtração'}
                        </Badge>
                        <span className="font-bold text-lg">
                          {adj.amount_kwh.toFixed(2)} kWh
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-1">
                        <strong>Cliente:</strong> {adj.customer_email}
                      </p>
                      <p className="text-sm text-slate-600 mb-1">
                        <strong>Motivo:</strong> {adj.reason}
                      </p>
                      <p className="text-sm text-slate-600 mb-1">
                        <strong>Saldo:</strong> {adj.previous_balance?.toFixed(2)} → {adj.new_balance?.toFixed(2)} kWh
                      </p>
                      {adj.notes && (
                        <p className="text-sm text-slate-500 italic mt-2">{adj.notes}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
                        Por: {adj.adjusted_by} • {format(new Date(adj.created_date), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                    <Edit className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              ))}
              {adjustments.length === 0 && (
                <div className="text-center py-12">
                  <Edit className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhum ajuste realizado ainda</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Ajuste de Crédito</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createAdjustmentMutation.mutate(formData); }} className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <Select value={formData.customer_email} onValueChange={(v) => {
                const sub = subscriptions.find(s => s.customer_email === v);
                setFormData(prev => ({ ...prev, customer_email: v, subscription_id: sub?.id || '' }));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptions.map(sub => (
                    <SelectItem key={sub.id} value={sub.customer_email}>
                      {sub.customer_name} ({sub.customer_email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Ajuste</Label>
              <Select value={formData.adjustment_type} onValueChange={(v) => setFormData(prev => ({ ...prev, adjustment_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">➕ Adicionar Créditos</SelectItem>
                  <SelectItem value="subtract">➖ Subtrair Créditos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantidade (kWh)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount_kwh}
                onChange={(e) => setFormData(prev => ({ ...prev, amount_kwh: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label>Motivo *</Label>
              <Input
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Ex: Erro no rateio, compensação acordada"
                required
              />
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Detalhes adicionais..."
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
                Aplicar Ajuste
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}