import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileCheck, Clock, CheckCircle, XCircle, ArrowLeft, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner';

export default function OnboardingManager() {
  const queryClient = useQueryClient();
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [showDialog, setShowDialog] = useState(false);

  const { data: processes = [] } = useQuery({
    queryKey: ['onboarding-processes'],
    queryFn: () => base44.entities.OnboardingProcess.list('-created_date')
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions-onboarding'],
    queryFn: () => base44.entities.Subscription.list()
  });

  const updateProcess = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OnboardingProcess.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['onboarding-processes']);
      setShowDialog(false);
      toast.success('Processo atualizado');
    }
  });

  const stepLabels = {
    documents_pending: 'Documentos Pendentes',
    documents_submitted: 'Documentos Enviados',
    distributor_analysis: 'Em Análise',
    approved: 'Aprovado',
    active: 'Ativo',
    rejected: 'Rejeitado'
  };

  const stepColors = {
    documents_pending: 'bg-yellow-100 text-yellow-800',
    documents_submitted: 'bg-blue-100 text-blue-800',
    distributor_analysis: 'bg-purple-100 text-purple-800',
    approved: 'bg-green-100 text-green-800',
    active: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800'
  };

  const pending = processes.filter(p => p.step === 'documents_pending').length;
  const inAnalysis = processes.filter(p => p.step === 'distributor_analysis').length;
  const active = processes.filter(p => p.step === 'active').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Processo de Onboarding</h1>
                <p className="text-cyan-100 text-sm">Acompanhamento de migração na distribuidora</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pendentes</p>
                  <p className="text-2xl font-bold">{pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <FileCheck className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Em Análise</p>
                  <p className="text-2xl font-bold">{inAnalysis}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Ativos</p>
                  <p className="text-2xl font-bold">{active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Processos de Onboarding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {processes.map((process) => {
                const subscription = subscriptions.find(s => s.id === process.subscription_id);
                return (
                  <Card key={process.id} className="border border-slate-200">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{subscription?.customer_name}</h3>
                          <p className="text-sm text-slate-500">{process.customer_email}</p>
                          {process.distributor && (
                            <p className="text-sm text-slate-500 mt-1">
                              {process.distributor} - {process.installation_number}
                            </p>
                          )}
                        </div>
                        <Badge className={stepColors[process.step]}>
                          {stepLabels[process.step]}
                        </Badge>
                      </div>

                      {process.protocol_number && (
                        <p className="text-sm text-slate-600 mb-2">
                          Protocolo: <strong>{process.protocol_number}</strong>
                        </p>
                      )}

                      {process.documents_uploaded && process.documents_uploaded.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-slate-500 mb-1">Documentos ({process.documents_uploaded.length})</p>
                          <div className="flex gap-2">
                            {process.documents_uploaded.map((doc, idx) => (
                              <Badge key={idx} variant="outline">Doc {idx + 1}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {process.notes && (
                        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg mb-3">
                          {process.notes}
                        </p>
                      )}

                      {process.rejection_reason && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                          <p className="text-sm text-red-800">
                            <strong>Motivo da rejeição:</strong> {process.rejection_reason}
                          </p>
                        </div>
                      )}

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => { setSelectedProcess(process); setShowDialog(true); }}
                      >
                        Atualizar Status
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}

              {processes.length === 0 && (
                <div className="text-center py-12">
                  <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhum processo de onboarding</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Processo</DialogTitle>
          </DialogHeader>
          {selectedProcess && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select 
                  value={selectedProcess.step} 
                  onValueChange={(v) => setSelectedProcess({...selectedProcess, step: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="documents_pending">Documentos Pendentes</SelectItem>
                    <SelectItem value="documents_submitted">Documentos Enviados</SelectItem>
                    <SelectItem value="distributor_analysis">Em Análise</SelectItem>
                    <SelectItem value="approved">Aprovado</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="rejected">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Número do Protocolo</label>
                <Input 
                  value={selectedProcess.protocol_number || ''}
                  onChange={(e) => setSelectedProcess({...selectedProcess, protocol_number: e.target.value})}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Observações</label>
                <Textarea
                  value={selectedProcess.notes || ''}
                  onChange={(e) => setSelectedProcess({...selectedProcess, notes: e.target.value})}
                  rows={3}
                />
              </div>

              <Button 
                onClick={() => updateProcess.mutate({ 
                  id: selectedProcess.id, 
                  data: selectedProcess 
                })}
                className="w-full"
              >
                Salvar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}