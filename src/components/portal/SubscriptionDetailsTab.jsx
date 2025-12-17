import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sun, MapPin, Building2, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export default function SubscriptionDetailsTab({ subscription }) {
  if (!subscription) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-slate-500">Nenhuma assinatura encontrada</p>
        </CardContent>
      </Card>
    );
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    analyzing: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-red-100 text-red-800',
    cancelled: 'bg-slate-100 text-slate-800'
  };

  const statusLabels = {
    pending: 'Pendente',
    analyzing: 'Em análise',
    active: 'Ativa',
    suspended: 'Suspensa',
    cancelled: 'Cancelada'
  };

  return (
    <div className="grid gap-6">
      {/* Status Card */}
      <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-2">Status da Assinatura</p>
              <Badge className={`${statusColors[subscription.status]} text-lg px-4 py-1`}>
                {statusLabels[subscription.status]}
              </Badge>
              {subscription.contract_start_date && (
                <p className="text-sm text-slate-600 mt-3">
                  Ativo desde {format(new Date(subscription.contract_start_date), 'dd/MM/yyyy')}
                </p>
              )}
            </div>
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
              <Sun className="w-8 h-8 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Informações Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-slate-500">Nome</p>
              <p className="font-medium">{subscription.customer_name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="font-medium">{subscription.customer_email}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Telefone</p>
              <p className="font-medium">{subscription.customer_phone}</p>
            </div>
            {subscription.customer_cpf_cnpj && (
              <div>
                <p className="text-sm text-slate-500">CPF/CNPJ</p>
                <p className="font-medium">{subscription.customer_cpf_cnpj}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-slate-500">Tipo de Cliente</p>
              <Badge variant="outline">
                {subscription.customer_type === 'commercial' ? 'Pessoa Jurídica' : 'Pessoa Física'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Endereço de Instalação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Instalação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-slate-500">Endereço</p>
              <p className="font-medium">{subscription.address}</p>
            </div>
            <div className="flex gap-4">
              <div>
                <p className="text-sm text-slate-500">Cidade</p>
                <p className="font-medium">{subscription.city}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Estado</p>
                <p className="font-medium">{subscription.state}</p>
              </div>
            </div>
            {subscription.zip_code && (
              <div>
                <p className="text-sm text-slate-500">CEP</p>
                <p className="font-medium">{subscription.zip_code}</p>
              </div>
            )}
            {subscription.distributor && (
              <div>
                <p className="text-sm text-slate-500">Distribuidora</p>
                <p className="font-medium">{subscription.distributor}</p>
              </div>
            )}
            {subscription.installation_number && (
              <div>
                <p className="text-sm text-slate-500">Nº Instalação</p>
                <p className="font-medium">{subscription.installation_number}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plano e Valores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Seu Plano
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subscription.average_bill_value && (
              <div>
                <p className="text-sm text-slate-500">Valor Médio da Conta</p>
                <p className="text-2xl font-bold text-slate-900">
                  R$ {subscription.average_bill_value.toFixed(2)}
                </p>
              </div>
            )}
            {subscription.discount_percentage && (
              <div>
                <p className="text-sm text-slate-500">Desconto Aplicado</p>
                <p className="text-xl font-bold text-green-600">
                  {subscription.discount_percentage}%
                </p>
              </div>
            )}
            {subscription.average_bill_value && subscription.discount_percentage && (
              <div className="pt-3 border-t">
                <p className="text-sm text-slate-500">Economia Mensal Estimada</p>
                <p className="text-2xl font-bold text-amber-600">
                  R$ {(subscription.average_bill_value * subscription.discount_percentage / 100).toFixed(2)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contrato */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Informações do Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subscription.contract_start_date && (
              <div>
                <p className="text-sm text-slate-500">Data de Início</p>
                <p className="font-medium">
                  {format(new Date(subscription.contract_start_date), 'dd/MM/yyyy')}
                </p>
              </div>
            )}
            {subscription.contract_end_date && (
              <div>
                <p className="text-sm text-slate-500">Data de Término</p>
                <p className="font-medium">
                  {format(new Date(subscription.contract_end_date), 'dd/MM/yyyy')}
                </p>
              </div>
            )}
            {subscription.allocation_priority && (
              <div>
                <p className="text-sm text-slate-500">Prioridade de Alocação</p>
                <Badge variant="outline">
                  {subscription.allocation_priority.toUpperCase()}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {subscription.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">{subscription.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}