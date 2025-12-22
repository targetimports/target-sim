import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Send, Clock, CheckCircle, XCircle, FileText, AlertCircle, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { format, addDays } from 'date-fns';

export default function RateioManagement() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [formData, setFormData] = useState({
    utility_company: '',
    power_plant_id: '',
    association_name: '',
    association_cnpj: '',
    request_type: 'novo',
    consumer_units: [],
    notes: ''
  });
  const [selectedSubscriptions, setSelectedSubscriptions] = useState([]);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['rateio-requests'],
    queryFn: () => base44.entities.RateioRequest.list('-created_date', 100)
  });

  const { data: powerPlants = [] } = useQuery({
    queryKey: ['power-plants'],
    queryFn: () => base44.entities.PowerPlant.list()
  });

  const { data: allSubscriptions = [] } = useQuery({
    queryKey: ['subscriptions-active'],
    queryFn: () => base44.entities.Subscription.filter({ status: 'active' })
  });

  // Filtrar apenas assinaturas vinculadas à usina selecionada
  const subscriptions = formData.power_plant_id 
    ? allSubscriptions.filter(sub => sub.power_plant_id === formData.power_plant_id)
    : [];

  const createRequest = useMutation({
    mutationFn: (data) => base44.entities.RateioRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['rateio-requests']);
      setIsDialogOpen(false);
      resetForm();
      toast.success('Solicitação criada!');
    }
  });

  const updateRequest = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RateioRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['rateio-requests']);
      toast.success('Solicitação atualizada!');
    }
  });

  const handleSubmitToUtility = async (request) => {
    const submissionDate = new Date();
    const expectedResponseDate = addDays(submissionDate, 30);
    
    await updateRequest.mutateAsync({
      id: request.id,
      data: {
        status: 'enviado',
        submission_date: format(submissionDate, 'yyyy-MM-dd'),
        expected_response_date: format(expectedResponseDate, 'yyyy-MM-dd'),
        protocol_number: `PROTO-${Date.now()}`,
        history: [
          ...(request.history || []),
          {
            date: new Date().toISOString(),
            action: 'Enviado à concessionária',
            user: user?.email,
            description: 'Solicitação enviada para análise da concessionária'
          }
        ]
      }
    });
    toast.success('Solicitação enviada! Resposta esperada em 30 dias.');
  };

  const handleApprove = async (request) => {
    await updateRequest.mutateAsync({
      id: request.id,
      data: {
        status: 'aprovado',
        approval_date: format(new Date(), 'yyyy-MM-dd'),
        history: [
          ...(request.history || []),
          {
            date: new Date().toISOString(),
            action: 'Aprovado pela concessionária',
            user: user?.email,
            description: 'Rateio aprovado e liberado para início'
          }
        ]
      }
    });
    toast.success('Rateio aprovado! Já pode iniciar a operação.');
  };

  const handleReject = async (request, reason) => {
    await updateRequest.mutateAsync({
      id: request.id,
      data: {
        status: 'rejeitado',
        rejection_reason: reason,
        history: [
          ...(request.history || []),
          {
            date: new Date().toISOString(),
            action: 'Rejeitado pela concessionária',
            user: user?.email,
            description: reason
          }
        ]
      }
    });
    toast.error('Solicitação rejeitada.');
  };

  const toggleSubscription = (sub) => {
    setSelectedSubscriptions(prev => {
      const exists = prev.find(s => s.id === sub.id);
      if (exists) {
        return prev.filter(s => s.id !== sub.id);
      } else {
        return [...prev, { ...sub, percentage: 0 }];
      }
    });
  };

  const updatePercentage = (subId, percentage) => {
    setSelectedSubscriptions(prev =>
      prev.map(s => s.id === subId ? { ...s, percentage: parseFloat(percentage) || 0 } : s)
    );
  };

  const handleSubmit = () => {
    const selectedPlant = powerPlants.find(p => p.id === formData.power_plant_id);
    const totalPercentage = selectedSubscriptions.reduce((sum, s) => sum + (s.percentage || 0), 0);

    if (totalPercentage !== 100) {
      toast.error('A soma dos percentuais deve ser 100%');
      return;
    }

    const consumerUnits = selectedSubscriptions.map(s => ({
      installation_number: s.consumer_unit_number,
      customer_name: s.customer_name,
      customer_email: s.customer_email,
      subscription_id: s.id,
      percentage: s.percentage
    }));

    createRequest.mutate({
      ...formData,
      power_plant_name: selectedPlant?.name,
      total_capacity_kw: selectedPlant?.capacity_kw,
      consumer_units: consumerUnits,
      request_number: `REQ-${Date.now()}`,
      status: 'rascunho',
      lei_14300_compliance: true,
      history: [{
        date: new Date().toISOString(),
        action: 'Solicitação criada',
        user: user?.email,
        description: 'Rascunho criado'
      }]
    });
  };

  const resetForm = () => {
    setFormData({
      utility_company: '',
      power_plant_id: '',
      association_name: '',
      association_cnpj: '',
      request_type: 'novo',
      consumer_units: [],
      notes: ''
    });
    setSelectedSubscriptions([]);
  };

  const statusConfig = {
    rascunho: { label: 'Rascunho', color: 'bg-slate-100 text-slate-800', icon: FileText },
    enviado: { label: 'Enviado', color: 'bg-blue-100 text-blue-800', icon: Send },
    em_analise: { label: 'Em Análise', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    aprovado: { label: 'Aprovado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    rejeitado: { label: 'Rejeitado', color: 'bg-red-100 text-red-800', icon: XCircle },
    cancelado: { label: 'Cancelado', color: 'bg-slate-100 text-slate-800', icon: XCircle }
  };

  const pendingRequests = requests.filter(r => ['enviado', 'em_analise'].includes(r.status));
  const approvedRequests = requests.filter(r => r.status === 'aprovado');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50">
      <header className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Zap className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">Gestão de Rateio - Lei 14.300</h1>
                  <p className="text-sm text-white/80">Geração Compartilhada junto à Concessionária</p>
                </div>
              </div>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-white text-green-600 hover:bg-white/90">
              <Plus className="w-4 h-4 mr-2" />
              Nova Solicitação
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid sm:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Send className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Aguardando</p>
                  <p className="text-2xl font-bold">{pendingRequests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Aprovados</p>
                  <p className="text-2xl font-bold text-green-600">{approvedRequests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Prazo 30 dias</p>
                  <p className="text-lg font-bold text-amber-600">Lei 14.300</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total</p>
                  <p className="text-2xl font-bold">{requests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests List */}
        <Card>
          <CardHeader>
            <CardTitle>Solicitações de Rateio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requests.map((request) => {
                const config = statusConfig[request.status];
                const Icon = config.icon;
                return (
                  <div key={request.id} className="p-4 border border-slate-200 rounded-lg hover:border-green-300 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-lg">{request.request_number}</span>
                          <Badge className={config.color}>
                            <Icon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                          <Badge variant="outline">{request.request_type}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                          <div>
                            <span className="font-medium">Usina:</span> {request.power_plant_name}
                          </div>
                          <div>
                            <span className="font-medium">Concessionária:</span> {request.utility_company}
                          </div>
                          <div>
                            <span className="font-medium">UCs:</span> {request.consumer_units?.length || 0}
                          </div>
                          <div>
                            <span className="font-medium">Associação:</span> {request.association_name}
                          </div>
                          {request.protocol_number && (
                            <div className="col-span-2">
                              <span className="font-medium text-blue-700">Protocolo:</span> {request.protocol_number}
                            </div>
                          )}
                          {request.submission_date && (
                            <div>
                              <span className="font-medium">Enviado:</span> {format(new Date(request.submission_date), 'dd/MM/yyyy')}
                            </div>
                          )}
                          {request.expected_response_date && (
                            <div>
                              <span className="font-medium">Resposta prevista:</span> {format(new Date(request.expected_response_date), 'dd/MM/yyyy')}
                            </div>
                          )}
                        </div>
                        {request.rejection_reason && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                            <AlertCircle className="w-4 h-4 inline mr-1" />
                            {request.rejection_reason}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          setSelectedRequest(request);
                          setViewDialogOpen(true);
                        }}>
                          Ver Detalhes
                        </Button>
                        {request.status === 'rascunho' && (
                          <Button size="sm" onClick={() => handleSubmitToUtility(request)}>
                            <Send className="w-4 h-4 mr-1" />
                            Enviar
                          </Button>
                        )}
                        {request.status === 'enviado' && (
                          <>
                            <Button size="sm" variant="outline" className="bg-green-50" onClick={() => handleApprove(request)}>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Aprovar
                            </Button>
                            <Button size="sm" variant="outline" className="bg-red-50" onClick={() => {
                              const reason = prompt('Motivo da rejeição:');
                              if (reason) handleReject(request, reason);
                            }}>
                              <XCircle className="w-4 h-4 mr-1" />
                              Rejeitar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {requests.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Zap className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Nenhuma solicitação de rateio criada ainda</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Solicitação de Rateio</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Solicitação *</Label>
                <Select value={formData.request_type} onValueChange={(v) => setFormData({...formData, request_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Nova Solicitação</SelectItem>
                    <SelectItem value="alteracao">Alteração</SelectItem>
                    <SelectItem value="cancelamento">Cancelamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Concessionária *</Label>
                <Select value={formData.utility_company} onValueChange={(v) => setFormData({...formData, utility_company: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Neoenergia">Neoenergia</SelectItem>
                    <SelectItem value="CEMIG">CEMIG</SelectItem>
                    <SelectItem value="CPFL">CPFL</SelectItem>
                    <SelectItem value="Enel">Enel</SelectItem>
                    <SelectItem value="Equatorial">Equatorial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome da Associação *</Label>
                <Input value={formData.association_name} onChange={(e) => setFormData({...formData, association_name: e.target.value})} />
              </div>
              <div>
                <Label>CNPJ da Associação *</Label>
                <Input value={formData.association_cnpj} onChange={(e) => setFormData({...formData, association_cnpj: e.target.value})} />
              </div>
            </div>

            <div>
              <Label>Usina Geradora *</Label>
              <Select value={formData.power_plant_id} onValueChange={(v) => setFormData({...formData, power_plant_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a usina" />
                </SelectTrigger>
                <SelectContent>
                  {powerPlants.map(plant => (
                    <SelectItem key={plant.id} value={plant.id}>
                      {plant.name} - {plant.capacity_kw} kW
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-3 block">Unidades Consumidoras no Rateio</Label>
              {!formData.power_plant_id && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 mb-3">
                  ⚠️ Selecione uma usina primeiro para ver os clientes vinculados
                </div>
              )}
              {formData.power_plant_id && subscriptions.length === 0 && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 mb-3">
                  Nenhum cliente vinculado a esta usina ainda
                </div>
              )}
              <div className="border border-slate-200 rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                {subscriptions.map(sub => {
                  const isSelected = selectedSubscriptions.find(s => s.id === sub.id);
                  return (
                    <div key={sub.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded">
                      <input
                        type="checkbox"
                        checked={!!isSelected}
                        onChange={() => toggleSubscription(sub)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{sub.customer_name}</p>
                        <p className="text-xs text-slate-500">UC: {sub.consumer_unit_number}</p>
                      </div>
                      {isSelected && (
                        <div className="w-24">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="%"
                            value={isSelected.percentage || ''}
                            onChange={(e) => updatePercentage(sub.id, e.target.value)}
                            className="text-right"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 text-sm">
                <span className="font-semibold">Total:</span>{' '}
                {selectedSubscriptions.reduce((sum, s) => sum + (s.percentage || 0), 0).toFixed(2)}%
                {selectedSubscriptions.reduce((sum, s) => sum + (s.percentage || 0), 0) === 100 ? (
                  <span className="text-green-600 ml-2">✓ OK</span>
                ) : (
                  <span className="text-red-600 ml-2">✗ Deve totalizar 100%</span>
                )}
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} />
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <p className="font-semibold text-amber-900">⚖️ Lei 14.300/2022 - Geração Compartilhada</p>
              <p className="text-amber-800 text-xs mt-1">
                Esta solicitação será enviada à concessionária conforme norma. O prazo de resposta é de até 30 dias.
                O rateio só iniciará após aprovação.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSubmit}>
                Criar Solicitação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><strong>Número:</strong> {selectedRequest.request_number}</div>
                    <div><strong>Tipo:</strong> {selectedRequest.request_type}</div>
                    <div><strong>Usina:</strong> {selectedRequest.power_plant_name}</div>
                    <div><strong>Concessionária:</strong> {selectedRequest.utility_company}</div>
                    <div><strong>Associação:</strong> {selectedRequest.association_name}</div>
                    <div><strong>CNPJ:</strong> {selectedRequest.association_cnpj}</div>
                    {selectedRequest.protocol_number && (
                      <div className="col-span-2"><strong>Protocolo:</strong> {selectedRequest.protocol_number}</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Unidades no Rateio ({selectedRequest.consumer_units?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedRequest.consumer_units?.map((uc, i) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                        <div>
                          <p className="font-medium text-sm">{uc.customer_name}</p>
                          <p className="text-xs text-slate-500">UC: {uc.installation_number}</p>
                        </div>
                        <Badge>{uc.percentage}%</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {selectedRequest.history && selectedRequest.history.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Histórico</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedRequest.history.map((h, i) => (
                        <div key={i} className="text-sm border-l-2 border-blue-500 pl-3">
                          <p className="font-semibold">{h.action}</p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(h.date), 'dd/MM/yyyy HH:mm')} - {h.user}
                          </p>
                          {h.description && <p className="text-xs text-slate-600">{h.description}</p>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}