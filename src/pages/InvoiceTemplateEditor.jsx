import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Save, Eye, Copy, FileText, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const AVAILABLE_FIELDS = {
  customer: [
    { key: '{{customer_name}}', label: 'Nome do Cliente' },
    { key: '{{customer_email}}', label: 'Email do Cliente' },
    { key: '{{customer_cpf_cnpj}}', label: 'CPF/CNPJ' },
    { key: '{{customer_phone}}', label: 'Telefone' },
    { key: '{{customer_address}}', label: 'Endereço' }
  ],
  invoice: [
    { key: '{{invoice_number}}', label: 'Número da Fatura' },
    { key: '{{reference_month}}', label: 'Mês de Referência' },
    { key: '{{due_date}}', label: 'Data de Vencimento' },
    { key: '{{total_amount}}', label: 'Valor Total' },
    { key: '{{discount_amount}}', label: 'Valor do Desconto' },
    { key: '{{final_amount}}', label: 'Valor Final' },
    { key: '{{payment_link}}', label: 'Link de Pagamento' }
  ],
  energy: [
    { key: '{{kwh_consumed}}', label: 'kWh Consumidos' },
    { key: '{{kwh_saved}}', label: 'kWh Economizados' },
    { key: '{{discount_percentage}}', label: 'Percentual de Desconto' },
    { key: '{{power_plant_name}}', label: 'Nome da Usina' },
    { key: '{{energy_credit_balance}}', label: 'Saldo de Créditos' }
  ],
  system: [
    { key: '{{current_date}}', label: 'Data Atual' },
    { key: '{{company_name}}', label: 'Nome da Empresa' },
    { key: '{{company_logo}}', label: 'Logo da Empresa' },
    { key: '{{support_email}}', label: 'Email de Suporte' },
    { key: '{{support_phone}}', label: 'Telefone de Suporte' }
  ]
};

const DEFAULT_TEMPLATE = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    {{company_logo}}
    <h1 style="color: #2563eb; margin-top: 20px;">Fatura de Energia - {{reference_month}}</h1>
  </div>
  
  <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #334155; font-size: 18px;">Olá, {{customer_name}}!</h2>
    <p style="color: #64748b;">Sua fatura de energia está disponível.</p>
  </div>
  
  <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 10px 0; color: #64748b;">Consumo do mês:</td>
        <td style="padding: 10px 0; text-align: right; font-weight: bold;">{{kwh_consumed}} kWh</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; color: #64748b;">Economia GD:</td>
        <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #10b981;">{{kwh_saved}} kWh</td>
      </tr>
      <tr style="border-top: 2px solid #e2e8f0;">
        <td style="padding: 10px 0; color: #64748b;">Valor com desconto:</td>
        <td style="padding: 10px 0; text-align: right; font-weight: bold; font-size: 20px; color: #2563eb;">R$ {{final_amount}}</td>
      </tr>
    </table>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{payment_link}}" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
      Pagar Fatura
    </a>
  </div>
  
  <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px;">
    <p>Vencimento: {{due_date}}</p>
    <p>Dúvidas? {{support_email}} | {{support_phone}}</p>
  </div>
</div>
`;

export default function InvoiceTemplateEditor() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    html_content: DEFAULT_TEMPLATE,
    template_type: 'monthly_invoice',
    is_active: false
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['invoice-templates'],
    queryFn: () => base44.entities.InvoiceTemplate.list('-created_date')
  });

  const createTemplate = useMutation({
    mutationFn: (data) => base44.entities.InvoiceTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoice-templates']);
      setIsDialogOpen(false);
      resetForm();
      toast.success('Template criado!');
    }
  });

  const updateTemplate = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InvoiceTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoice-templates']);
      setIsDialogOpen(false);
      resetForm();
      toast.success('Template atualizado!');
    }
  });

  const handleSave = () => {
    if (editingTemplate) {
      updateTemplate.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createTemplate.mutate(formData);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      subject: template.subject || '',
      html_content: template.html_content,
      template_type: template.template_type,
      is_active: template.is_active
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      subject: '',
      html_content: DEFAULT_TEMPLATE,
      template_type: 'monthly_invoice',
      is_active: false
    });
    setEditingTemplate(null);
  };

  const copyField = (field) => {
    navigator.clipboard.writeText(field);
    toast.success('Campo copiado!');
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ]
  };

  const getPreviewWithData = () => {
    const sampleData = {
      '{{customer_name}}': 'João Silva',
      '{{customer_email}}': 'joao@example.com',
      '{{customer_cpf_cnpj}}': '123.456.789-00',
      '{{invoice_number}}': 'INV-2024-001',
      '{{reference_month}}': 'Dezembro/2024',
      '{{due_date}}': '15/01/2025',
      '{{total_amount}}': '850,00',
      '{{discount_amount}}': '127,50',
      '{{final_amount}}': '722,50',
      '{{kwh_consumed}}': '450',
      '{{kwh_saved}}': '67',
      '{{discount_percentage}}': '15%',
      '{{power_plant_name}}': 'Usina Solar Central',
      '{{current_date}}': new Date().toLocaleDateString('pt-BR'),
      '{{company_name}}': 'Target Sim',
      '{{company_logo}}': '<img src="https://via.placeholder.com/150x50?text=Logo" alt="Logo" style="max-width: 150px;">',
      '{{support_email}}': 'suporte@targetsim.com',
      '{{support_phone}}': '(11) 9999-9999',
      '{{payment_link}}': '#'
    };

    let preview = formData.html_content;
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replaceAll(key, value);
    });
    return preview;
  };

  const activeTemplate = templates.find(t => t.is_active);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">Modelos de Fatura</h1>
                  <p className="text-sm text-white/80">Configure o layout das faturas enviadas aos clientes</p>
                </div>
              </div>
            </div>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-white text-indigo-600 hover:bg-white/90">
              <Plus className="w-4 h-4 mr-2" />
              Novo Template
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Templates</p>
                  <p className="text-2xl font-bold">{templates.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Template Ativo</p>
                  <p className="text-lg font-bold truncate">{activeTemplate?.name || 'Nenhum'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Copy className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Campos Disponíveis</p>
                  <p className="text-2xl font-bold">
                    {Object.values(AVAILABLE_FIELDS).reduce((sum, arr) => sum + arr.length, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Templates Criados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div key={template.id} className="p-4 border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">{template.name}</span>
                            {template.is_active && (
                              <Badge className="bg-green-600">Ativo</Badge>
                            )}
                            <Badge variant="outline">{template.template_type}</Badge>
                          </div>
                          {template.description && (
                            <p className="text-sm text-slate-600 mb-2">{template.description}</p>
                          )}
                          {template.subject && (
                            <p className="text-xs text-slate-500">
                              <strong>Assunto:</strong> {template.subject}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setEditingTemplate(template);
                            setFormData(template);
                            setPreviewDialogOpen(true);
                          }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                            Editar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {templates.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>Nenhum template criado ainda</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Campos Dinâmicos</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="customer">
                  <TabsList className="grid grid-cols-2 mb-4">
                    <TabsTrigger value="customer">Cliente</TabsTrigger>
                    <TabsTrigger value="invoice">Fatura</TabsTrigger>
                  </TabsList>
                  <TabsList className="grid grid-cols-2 mb-4">
                    <TabsTrigger value="energy">Energia</TabsTrigger>
                    <TabsTrigger value="system">Sistema</TabsTrigger>
                  </TabsList>

                  {Object.entries(AVAILABLE_FIELDS).map(([category, fields]) => (
                    <TabsContent key={category} value={category} className="space-y-2">
                      {fields.map((field) => (
                        <div key={field.key} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{field.label}</p>
                            <code className="text-xs text-indigo-600">{field.key}</code>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => copyField(field.key)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Editor Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Editar Template' : 'Novo Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={formData.template_type} onValueChange={(v) => setFormData({...formData, template_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly_invoice">Fatura Mensal</SelectItem>
                    <SelectItem value="credit_statement">Extrato de Créditos</SelectItem>
                    <SelectItem value="payment_receipt">Comprovante de Pagamento</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} />
            </div>

            <div>
              <Label>Assunto do Email</Label>
              <Input 
                value={formData.subject} 
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                placeholder="Ex: Sua fatura de {{reference_month}} está disponível"
              />
            </div>

            <div>
              <Label className="mb-2 block">Conteúdo HTML</Label>
              <ReactQuill
                theme="snow"
                value={formData.html_content}
                onChange={(content) => setFormData({...formData, html_content: content})}
                modules={quillModules}
                style={{ height: '400px', marginBottom: '50px' }}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <Label>Definir como template ativo</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview do Template</DialogTitle>
          </DialogHeader>
          <div className="border border-slate-200 rounded-lg p-4 bg-white">
            <div dangerouslySetInnerHTML={{ __html: getPreviewWithData() }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}