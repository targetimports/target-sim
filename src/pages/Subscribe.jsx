import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sun, ArrowLeft, ArrowRight, Check, Loader2, Shield, Leaf, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 
  'SP', 'SE', 'TO'
];

const DISTRIBUTORS = [
  'CEMIG', 'COPEL', 'CPFL', 'ENEL', 'ENERGISA', 'EQUATORIAL', 'LIGHT', 
  'NEOENERGIA', 'EDP', 'Outra'
];

export default function Subscribe() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_cpf_cnpj: '',
    customer_type: 'residential',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    distributor: '',
    installation_number: '',
    average_bill_value: '',
    referred_by: ''
  });

  const createSubscription = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Subscription.create({
        ...data,
        average_bill_value: parseFloat(data.average_bill_value),
        status: 'pending'
      });
    },
    onSuccess: () => {
      setStep(4);
    }
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
    else if (step === 3 && acceptTerms) {
      createSubscription.mutate(formData);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const discountRate = formData.customer_type === 'commercial' ? 0.20 : 0.15;
  const savings = parseFloat(formData.average_bill_value || 0) * discountRate;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link to={createPageUrl('Home')} className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-violet-500 rounded-xl flex items-center justify-center">
              <Sun className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">EnergiaSolar</span>
          </Link>
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 lg:py-16">
        <div className="max-w-4xl mx-auto">
          {/* Progress Steps */}
          {step < 4 && (
            <div className="flex items-center justify-center mb-12">
              {[1, 2, 3].map((s) => (
                <React.Fragment key={s}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    step >= s 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {step > s ? <Check className="w-5 h-5" /> : s}
                  </div>
                  {s < 3 && (
                    <div className={`w-24 h-1 mx-2 rounded transition-all ${
                      step > s ? 'bg-emerald-500' : 'bg-slate-800'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-white">Seus dados pessoais</CardTitle>
                  <p className="text-slate-400">Preencha suas informações para começar</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Tipo de conta *</Label>
                      <Select value={formData.customer_type} onValueChange={(v) => updateField('customer_type', v)}>
                        <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="residential">Pessoa Física (CPF)</SelectItem>
                          <SelectItem value="commercial">Pessoa Jurídica (CNPJ)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">{formData.customer_type === 'commercial' ? 'CNPJ' : 'CPF'} *</Label>
                      <Input 
                        value={formData.customer_cpf_cnpj}
                        onChange={(e) => updateField('customer_cpf_cnpj', e.target.value)}
                        placeholder={formData.customer_type === 'commercial' ? '00.000.000/0000-00' : '000.000.000-00'}
                        className="h-12 bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">{formData.customer_type === 'commercial' ? 'Razão Social' : 'Nome completo'} *</Label>
                    <Input 
                      value={formData.customer_name}
                      onChange={(e) => updateField('customer_name', e.target.value)}
                      placeholder="Digite seu nome"
                      className="h-12 bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-slate-300">E-mail *</Label>
                      <Input 
                        type="email"
                        value={formData.customer_email}
                        onChange={(e) => updateField('customer_email', e.target.value)}
                        placeholder="seu@email.com"
                        className="h-12 bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">WhatsApp *</Label>
                      <Input 
                        value={formData.customer_phone}
                        onChange={(e) => updateField('customer_phone', e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="h-12 bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Código de indicação (opcional)</Label>
                    <Input 
                      value={formData.referred_by}
                      onChange={(e) => updateField('referred_by', e.target.value)}
                      placeholder="Email de quem te indicou"
                      className="h-12 bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Installation Info */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-white">Dados da instalação</CardTitle>
                  <p className="text-slate-400">Informações sobre seu imóvel e conta de luz</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-slate-300">Endereço *</Label>
                      <Input 
                        value={formData.address}
                        onChange={(e) => updateField('address', e.target.value)}
                        placeholder="Rua, número, complemento"
                        className="h-12 bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">CEP *</Label>
                      <Input 
                        value={formData.zip_code}
                        onChange={(e) => updateField('zip_code', e.target.value)}
                        placeholder="00000-000"
                        className="h-12 bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Cidade *</Label>
                      <Input 
                        value={formData.city}
                        onChange={(e) => updateField('city', e.target.value)}
                        placeholder="Sua cidade"
                        className="h-12 bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Estado *</Label>
                      <Select value={formData.state} onValueChange={(v) => updateField('state', v)}>
                        <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATES.map(state => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Distribuidora *</Label>
                      <Select value={formData.distributor} onValueChange={(v) => updateField('distributor', v)}>
                        <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {DISTRIBUTORS.map(dist => (
                            <SelectItem key={dist} value={dist}>{dist}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Nº da instalação (opcional)</Label>
                      <Input 
                        value={formData.installation_number}
                        onChange={(e) => updateField('installation_number', e.target.value)}
                        placeholder="Número na fatura"
                        className="h-12 bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Valor médio da conta de luz (R$) *</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
                      <Input 
                        type="number"
                        min="200"
                        value={formData.average_bill_value}
                        onChange={(e) => updateField('average_bill_value', e.target.value)}
                        placeholder="0,00"
                        className="h-12 pl-12 bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <p className="text-xs text-slate-500">Valor mínimo: R$ 200,00</p>
                  </div>

                  {parseFloat(formData.average_bill_value) >= 200 && (
                    <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <p className="text-slate-400 text-sm mb-2">Sua economia estimada:</p>
                      <p className="text-3xl font-bold text-white">
                        R$ {savings.toFixed(2)}<span className="text-lg text-emerald-400">/mês</span>
                      </p>
                      <p className="text-emerald-400 text-sm mt-1">
                        Desconto de {(discountRate * 100).toFixed(0)}% garantido
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Review & Confirm */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-white">Confirme seus dados</CardTitle>
                  <p className="text-slate-400">Revise as informações antes de finalizar</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Dados pessoais</h3>
                      <div className="space-y-2 text-sm">
                        <p className="text-slate-400">Nome: <span className="text-white">{formData.customer_name}</span></p>
                        <p className="text-slate-400">Email: <span className="text-white">{formData.customer_email}</span></p>
                        <p className="text-slate-400">WhatsApp: <span className="text-white">{formData.customer_phone}</span></p>
                        <p className="text-slate-400">{formData.customer_type === 'commercial' ? 'CNPJ' : 'CPF'}: <span className="text-white">{formData.customer_cpf_cnpj}</span></p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Instalação</h3>
                      <div className="space-y-2 text-sm">
                        <p className="text-slate-400">Endereço: <span className="text-white">{formData.address}</span></p>
                        <p className="text-slate-400">Cidade/Estado: <span className="text-white">{formData.city}/{formData.state}</span></p>
                        <p className="text-slate-400">Distribuidora: <span className="text-white">{formData.distributor}</span></p>
                        <p className="text-slate-400">Valor médio: <span className="text-white">R$ {formData.average_bill_value}</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-gradient-to-br from-emerald-500/20 to-violet-500/20 border border-emerald-500/30 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-slate-300">Desconto mensal estimado:</span>
                      <span className="text-2xl font-bold text-white">R$ {savings.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Economia anual estimada:</span>
                      <span className="text-2xl font-bold text-emerald-400">R$ {(savings * 12).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-white/5 rounded-xl">
                    <Checkbox 
                      id="terms" 
                      checked={acceptTerms} 
                      onCheckedChange={setAcceptTerms}
                      className="mt-1 border-white/20 data-[state=checked]:bg-emerald-500"
                    />
                    <label htmlFor="terms" className="text-sm text-slate-400 cursor-pointer">
                      Li e aceito os <a href="#" className="text-emerald-400 hover:underline">Termos de Uso</a> e a <a href="#" className="text-emerald-400 hover:underline">Política de Privacidade</a>. Autorizo o processamento dos meus dados para fins de contratação do serviço.
                    </label>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8">
                <Check className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Cadastro realizado com sucesso!</h2>
              <p className="text-lg text-slate-400 mb-8 max-w-lg mx-auto">
                Recebemos sua solicitação e em breve nossa equipe entrará em contato para finalizar sua adesão.
              </p>

              <div className="grid sm:grid-cols-3 gap-6 max-w-2xl mx-auto mb-10">
                {[
                  { icon: Shield, text: 'Seus dados estão protegidos' },
                  { icon: Leaf, text: 'Energia 100% renovável' },
                  { icon: Zap, text: 'Economia garantida' }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <item.icon className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-300">{item.text}</p>
                  </div>
                ))}
              </div>

              <Link to={createPageUrl('Home')}>
                <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600">
                  Voltar para o início
                </Button>
              </Link>
            </motion.div>
          )}

          {/* Navigation Buttons */}
          {step < 4 && (
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={step === 1}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button
                onClick={nextStep}
                disabled={(step === 3 && !acceptTerms) || createSubscription.isPending}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                {createSubscription.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {step === 3 ? 'Finalizar cadastro' : 'Continuar'}
                {step < 3 && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}