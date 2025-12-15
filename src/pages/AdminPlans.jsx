import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Sun, Plus, Pencil, Trash2, ArrowLeft, X, Check
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminPlans() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_percentage: 15,
    min_bill_value: 200,
    contract_duration_months: 12,
    customer_type: 'both',
    is_active: true,
    features: []
  });
  const [newFeature, setNewFeature] = useState('');

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => base44.entities.Plan.list()
  });

  const createPlan = useMutation({
    mutationFn: (data) => base44.entities.Plan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['plans']);
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const updatePlan = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Plan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['plans']);
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const deletePlan = useMutation({
    mutationFn: (id) => base44.entities.Plan.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['plans'])
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      discount_percentage: 15,
      min_bill_value: 200,
      contract_duration_months: 12,
      customer_type: 'both',
      is_active: true,
      features: []
    });
    setEditingPlan(null);
    setNewFeature('');
  };

  const openEditDialog = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      discount_percentage: plan.discount_percentage,
      min_bill_value: plan.min_bill_value || 200,
      contract_duration_months: plan.contract_duration_months || 12,
      customer_type: plan.customer_type || 'both',
      is_active: plan.is_active !== false,
      features: plan.features || []
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingPlan) {
      updatePlan.mutate({ id: editingPlan.id, data: formData });
    } else {
      createPlan.mutate(formData);
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
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
              <div className="w-10 h-10 bg-gradient-to-br from-black to-amber-600 rounded-xl flex items-center justify-center">
                <Sun className="w-6 h-6 text-amber-400" />
              </div>
                <div>
                  <h1 className="text-lg font-bold">Gerenciar Planos</h1>
                  <p className="text-xs text-slate-400">Configure os planos de assinatura</p>
                </div>
              </div>
            </div>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Novo plano
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className={`border-0 shadow-sm ${!plan.is_active ? 'opacity-60' : ''}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <Badge className={plan.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}>
                        {plan.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(plan)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deletePlan.mutate(plan.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-amber-600">{plan.discount_percentage}%</span>
                      <span className="text-slate-500">de desconto</span>
                    </div>
                    
                    {plan.description && (
                      <p className="text-sm text-slate-600">{plan.description}</p>
                    )}

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-2 border-t border-slate-100">
                        <span className="text-slate-500">Conta mínima</span>
                        <span className="font-medium">R$ {plan.min_bill_value}</span>
                      </div>
                      <div className="flex justify-between py-2 border-t border-slate-100">
                        <span className="text-slate-500">Duração</span>
                        <span className="font-medium">{plan.contract_duration_months} meses</span>
                      </div>
                      <div className="flex justify-between py-2 border-t border-slate-100">
                        <span className="text-slate-500">Tipo</span>
                        <span className="font-medium">
                          {plan.customer_type === 'both' ? 'PF e PJ' : 
                           plan.customer_type === 'residential' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                        </span>
                      </div>
                    </div>

                    {plan.features?.length > 0 && (
                      <div className="pt-4 border-t border-slate-100">
                        <p className="text-sm font-medium text-slate-700 mb-2">Benefícios:</p>
                        <ul className="space-y-1">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                              <Check className="w-4 h-4 text-amber-500" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {plans.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Sun className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum plano cadastrado</h3>
              <p className="text-slate-500 mb-6">Crie seu primeiro plano de assinatura</p>
              <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                Criar plano
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Editar plano' : 'Novo plano'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Nome do plano *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Plano Residencial"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do plano"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Desconto (%) *</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount_percentage: parseInt(e.target.value) }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Conta mínima (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.min_bill_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_bill_value: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duração (meses)</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.contract_duration_months}
                  onChange={(e) => setFormData(prev => ({ ...prev, contract_duration_months: parseInt(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de cliente</Label>
                <Select 
                  value={formData.customer_type} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, customer_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">PF e PJ</SelectItem>
                    <SelectItem value="residential">Apenas PF</SelectItem>
                    <SelectItem value="commercial">Apenas PJ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Benefícios</Label>
              <div className="flex gap-2">
                <Input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="Adicionar benefício"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                />
                <Button type="button" variant="outline" onClick={addFeature}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.features.map((feature, idx) => (
                  <Badge key={idx} variant="secondary" className="pr-1">
                    {feature}
                    <button type="button" onClick={() => removeFeature(idx)} className="ml-2 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between py-4 border-t border-slate-100">
              <Label>Plano ativo</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold">
                {editingPlan ? 'Salvar alterações' : 'Criar plano'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}