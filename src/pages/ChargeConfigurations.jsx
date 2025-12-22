import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings, ArrowLeft, Plus, Sparkles, CheckCircle, XCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ChargeConfigurations() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState(null);
  const [formData, setFormData] = useState({
    charge_key: '',
    charge_label: '',
    is_discountable: false,
    category: 'other',
    notes: ''
  });
  const [testFile, setTestFile] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: charges = [] } = useQuery({
    queryKey: ['charge-configurations'],
    queryFn: () => base44.entities.ChargeConfiguration.list()
  });

  const updateCharge = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChargeConfiguration.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['charge-configurations']);
      toast.success('Configuração atualizada!');
    }
  });

  const createCharge = useMutation({
    mutationFn: (data) => base44.entities.ChargeConfiguration.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['charge-configurations']);
      setIsDialogOpen(false);
      resetForm();
      toast.success('Cobrança criada!');
    }
  });

  const toggleDiscountable = (charge) => {
    updateCharge.mutate({
      id: charge.id,
      data: { is_discountable: !charge.is_discountable }
    });
  };

  const resetForm = () => {
    setFormData({
      charge_key: '',
      charge_label: '',
      is_discountable: false,
      category: 'other',
      notes: ''
    });
    setEditingCharge(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createCharge.mutate(formData);
  };

  const handleTestUpload = async () => {
    if (!testFile) return;

    setIsProcessing(true);
    setTestResults(null);

    try {
      // Upload file
      const uploadResult = await base44.integrations.Core.UploadFile({ file: testFile });
      
      // Process with OCR test (no customer/subscription)
      const processResult = await base44.functions.invoke('processUtilityBill', {
        file_url: uploadResult.file_url,
        test_mode: true
      });

      setTestResults(processResult);
      queryClient.invalidateQueries(['charge-configurations']);
      toast.success('Fatura processada! Novas cobranças foram descobertas.');
    } catch (error) {
      console.error('Erro detalhado:', error);
      toast.error('Erro ao processar fatura: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const categoryLabels = {
    energy: 'Energia',
    taxes: 'Impostos',
    fees: 'Taxas',
    fines: 'Multas/Juros',
    other: 'Outros'
  };

  const categoryColors = {
    energy: 'bg-green-100 text-green-800',
    taxes: 'bg-blue-100 text-blue-800',
    fees: 'bg-yellow-100 text-yellow-800',
    fines: 'bg-red-100 text-red-800',
    other: 'bg-slate-100 text-slate-800'
  };

  const groupedCharges = charges.reduce((acc, charge) => {
    if (!acc[charge.category]) acc[charge.category] = [];
    acc[charge.category].push(charge);
    return acc;
  }, {});

  const discountableCount = charges.filter(c => c.is_discountable).length;
  const autoDiscoveredCount = charges.filter(c => c.auto_discovered).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Settings className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">Configuração de Cobranças</h1>
                  <p className="text-sm text-white/80">Defina quais tarifas são descontáveis</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsTestDialogOpen(true)}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/20"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Testar Fatura
              </Button>
              <Button
                onClick={() => { resetForm(); setIsDialogOpen(true); }}
                className="bg-white text-purple-600 hover:bg-white/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Cobrança
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Settings className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Cobranças</p>
                  <p className="text-2xl font-bold">{charges.length}</p>
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
                  <p className="text-sm text-slate-500">Descontáveis</p>
                  <p className="text-2xl font-bold text-green-600">{discountableCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Auto-descobertas</p>
                  <p className="text-2xl font-bold text-blue-600">{autoDiscoveredCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charges by Category */}
        <div className="space-y-6">
          {Object.entries(groupedCharges).map(([category, categoryCharges]) => (
            <Card key={category}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Badge className={categoryColors[category]}>
                    {categoryLabels[category]}
                  </Badge>
                  <span className="text-sm text-slate-500">
                    {categoryCharges.length} cobrança(s)
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryCharges.map((charge) => (
                    <div key={charge.id} className="p-4 border border-slate-200 rounded-lg hover:border-purple-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">{charge.charge_label}</span>
                            {charge.auto_discovered && (
                              <Badge variant="outline" className="text-xs">
                                <Sparkles className="w-3 h-3 mr-1" />
                                Auto-descoberta
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {charge.occurrences || 0}x vista
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500">Chave: {charge.charge_key}</p>
                          {charge.notes && (
                            <p className="text-sm text-slate-600 mt-1">{charge.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-slate-500 mb-1">
                              {charge.is_discountable ? 'Descontável' : 'Não descontável'}
                            </p>
                            <Switch
                              checked={charge.is_discountable}
                              onCheckedChange={() => toggleDiscountable(charge)}
                            />
                          </div>
                          {charge.is_discountable ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : (
                            <XCircle className="w-6 h-6 text-red-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {charges.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Settings className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Nenhuma cobrança configurada</h3>
                <p className="text-slate-600 mb-6">
                  As cobranças serão criadas automaticamente ao processar faturas
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Test Upload Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Testar Mapeamento de Fatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center">
              <Input
                type="file"
                accept=".pdf"
                onChange={(e) => setTestFile(e.target.files[0])}
                className="max-w-sm mx-auto"
              />
              <p className="text-sm text-slate-500 mt-2">
                Faça upload de uma fatura PDF para descobrir automaticamente as cobranças
              </p>
            </div>

            <Button
              onClick={handleTestUpload}
              disabled={!testFile || isProcessing}
              className="w-full"
            >
              {isProcessing ? 'Processando...' : 'Processar Fatura'}
            </Button>

            {testResults && (
              <div className="space-y-4">
                {testResults.success ? (
                  <>
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4">
                        <h3 className="font-bold text-green-800 mb-2">✅ Processamento Concluído</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-slate-600">Total:</span>
                            <span className="font-bold ml-2">R$ {testResults.summary?.total?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div>
                            <span className="text-slate-600">kWh:</span>
                            <span className="font-bold ml-2">{testResults.summary?.kwh_consumed || '0'}</span>
                          </div>
                          <div>
                            <span className="text-slate-600">Descontável:</span>
                            <span className="font-bold ml-2 text-green-700">R$ {testResults.summary?.discount_base?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div>
                            <span className="text-slate-600">Não Descontável:</span>
                            <span className="font-bold ml-2 text-amber-700">R$ {testResults.summary?.non_discountable?.toFixed(2) || '0.00'}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {testResults.summary?.all_charges && testResults.summary.all_charges.length > 0 ? (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Cobranças Identificadas ({testResults.summary.all_charges.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {testResults.summary.all_charges.map((charge, i) => (
                              <div key={i} className={`p-3 rounded-lg border ${charge.is_discountable ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-semibold">{charge.label}</p>
                                    <p className="text-xs text-slate-500">{charge.key}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold">R$ {charge.value?.toFixed(2)}</p>
                                    <Badge className={charge.is_discountable ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                                      {charge.is_discountable ? 'Descontável' : 'Não Descontável'}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="bg-amber-50 border-amber-200">
                        <CardContent className="p-4 text-center">
                          <p className="text-amber-800 font-semibold">⚠️ Nenhuma cobrança identificada</p>
                          <p className="text-sm text-amber-700 mt-1">O PDF pode não ser uma fatura de energia ou estar em formato não reconhecido.</p>
                        </CardContent>
                      </Card>
                    )}

                    {testResults.extracted_data && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Dados Brutos Extraídos</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-xs bg-slate-100 p-3 rounded overflow-x-auto">
                            {JSON.stringify(testResults.extracted_data, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4">
                      <h3 className="font-bold text-red-800 mb-2">❌ Erro no Processamento</h3>
                      <p className="text-sm text-red-700">{testResults.error || 'Erro desconhecido'}</p>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setTestResults(null);
                      setTestFile(null);
                    }}
                  >
                    Testar Outra
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => setIsTestDialogOpen(false)}
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Cobrança Manual</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Chave *</Label>
              <Input
                value={formData.charge_key}
                onChange={(e) => setFormData(prev => ({ ...prev, charge_key: e.target.value }))}
                placeholder="ex: taxa_especial"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Identificador único (sem espaços)</p>
            </div>
            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.charge_label}
                onChange={(e) => setFormData(prev => ({ ...prev, charge_label: e.target.value }))}
                placeholder="ex: Taxa Especial"
                required
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="energy">Energia</SelectItem>
                  <SelectItem value="taxes">Impostos</SelectItem>
                  <SelectItem value="fees">Taxas</SelectItem>
                  <SelectItem value="fines">Multas/Juros</SelectItem>
                  <SelectItem value="other">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <Label>É descontável?</Label>
              <Switch
                checked={formData.is_discountable}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_discountable: checked }))}
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                Criar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}