import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Users, TrendingUp, ArrowLeft, Shield } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from 'sonner';

export default function AllocationPriorities() {
  const queryClient = useQueryClient();

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions-priorities'],
    queryFn: () => base44.entities.Subscription.filter({ status: 'active' })
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async ({ id, priority, weight }) => {
      return await base44.entities.Subscription.update(id, {
        allocation_priority: priority,
        priority_weight: weight
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['subscriptions-priorities']);
      toast.success('Prioridade atualizada!');
    }
  });

  const priorityConfig = {
    vip: { label: 'VIP', color: 'bg-purple-100 text-purple-800', weight: 2, icon: Star },
    high: { label: 'Alta', color: 'bg-blue-100 text-blue-800', weight: 1.5, icon: TrendingUp },
    normal: { label: 'Normal', color: 'bg-slate-100 text-slate-800', weight: 1, icon: Users },
    low: { label: 'Baixa', color: 'bg-slate-100 text-slate-500', weight: 0.5, icon: Shield }
  };

  const groupedByPriority = {
    vip: subscriptions.filter(s => s.allocation_priority === 'vip'),
    high: subscriptions.filter(s => s.allocation_priority === 'high'),
    normal: subscriptions.filter(s => s.allocation_priority === 'normal' || !s.allocation_priority),
    low: subscriptions.filter(s => s.allocation_priority === 'low')
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-purple-900 to-pink-900 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">⭐ Gestão de Prioridades</h1>
              <p className="text-purple-100 text-sm">Define ordem de alocação de energia</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {Object.entries(groupedByPriority).map(([key, subs]) => {
            const config = priorityConfig[key];
            const Icon = config.icon;
            return (
              <Card key={key}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${config.color} rounded-xl flex items-center justify-center`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">{config.label}</p>
                      <p className="text-2xl font-bold">{subs.length}</p>
                      <p className="text-xs text-slate-500">Peso: {config.weight}x</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">ℹ️ Como funciona a priorização:</h3>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>• <strong>VIP (2x):</strong> Recebem o dobro de energia proporcional</li>
              <li>• <strong>Alta (1.5x):</strong> Recebem 50% a mais de energia proporcional</li>
              <li>• <strong>Normal (1x):</strong> Recebem energia proporcional ao valor da conta</li>
              <li>• <strong>Baixa (0.5x):</strong> Recebem metade da energia proporcional</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clientes e Prioridades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Cliente</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Valor Conta</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Prioridade Atual</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Alterar Prioridade</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => {
                    const currentPriority = sub.allocation_priority || 'normal';
                    const config = priorityConfig[currentPriority];
                    return (
                      <tr key={sub.id} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm font-medium">{sub.customer_name}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{sub.customer_email}</td>
                        <td className="py-3 px-4 text-sm">R$ {sub.average_bill_value?.toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <Badge className={config.color}>
                            {config.label} ({config.weight}x)
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Select
                            value={currentPriority}
                            onValueChange={(value) => updatePriorityMutation.mutate({
                              id: sub.id,
                              priority: value,
                              weight: priorityConfig[value].weight
                            })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(priorityConfig).map(([key, cfg]) => (
                                <SelectItem key={key} value={key}>
                                  {cfg.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}