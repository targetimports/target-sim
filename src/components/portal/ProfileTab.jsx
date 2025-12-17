import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function ProfileTab({ subscription }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    customer_name: subscription?.customer_name || '',
    customer_phone: subscription?.customer_phone || '',
    address: subscription?.address || '',
    city: subscription?.city || '',
    state: subscription?.state || '',
    zip_code: subscription?.zip_code || ''
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Subscription.update(subscription.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-subscription']);
      toast.success('Informações atualizadas com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar informações');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (!subscription) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-slate-500">Nenhuma assinatura encontrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Atualizar Informações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Nome Completo</Label>
              <Input
                value={formData.customer_name}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label>Telefone</Label>
              <Input
                value={formData.customer_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label>Endereço</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>

            <div>
              <Label>Cidade</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              />
            </div>

            <div>
              <Label>Estado</Label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                maxLength={2}
              />
            </div>

            <div>
              <Label>CEP</Label>
              <Input
                value={formData.zip_code}
                onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={updateMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>

        <div className="mt-8 p-4 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-600 mb-2">
            <strong>Informações não editáveis:</strong>
          </p>
          <div className="space-y-1 text-sm text-slate-600">
            <p>• Email: {subscription.customer_email}</p>
            {subscription.customer_cpf_cnpj && <p>• CPF/CNPJ: {subscription.customer_cpf_cnpj}</p>}
            {subscription.distributor && <p>• Distribuidora: {subscription.distributor}</p>}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Para alterar essas informações, entre em contato com o suporte.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}