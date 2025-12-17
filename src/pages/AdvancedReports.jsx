import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, Download, FileText, ArrowLeft, Calendar, Filter
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { toast } from 'sonner';
import SalesPerformanceReport from '../components/reports/SalesPerformanceReport';
import ChurnAnalysisReport from '../components/reports/ChurnAnalysisReport';
import RevenueReport from '../components/reports/RevenueReport';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import jsPDF from 'jspdf';

export default function AdvancedReports() {
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().setMonth(new Date().getMonth() - 6)), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  // Buscar dados
  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions-reports'],
    queryFn: () => base44.entities.Subscription.list('-created_date', 1000)
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-reports'],
    queryFn: () => base44.entities.MonthlyInvoice.list('-created_date', 1000)
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals-reports'],
    queryFn: () => base44.entities.Referral.list('-created_date', 500)
  });

  const { data: creditBalances = [] } = useQuery({
    queryKey: ['credits-reports'],
    queryFn: () => base44.entities.CreditBalance.list()
  });

  // Filtrar por data
  const filteredData = {
    subscriptions: subscriptions.filter(s => {
      const date = new Date(s.created_date);
      return date >= new Date(dateRange.start) && date <= new Date(dateRange.end);
    }),
    invoices: invoices.filter(i => {
      const date = new Date(i.created_date);
      return date >= new Date(dateRange.start) && date <= new Date(dateRange.end);
    }),
    referrals: referrals.filter(r => {
      const date = new Date(r.created_date);
      return date >= new Date(dateRange.start) && date <= new Date(dateRange.end);
    })
  };

  const handleExportCSV = (reportType) => {
    let headers, rows;

    switch (reportType) {
      case 'sales':
        headers = ['Data', 'Cliente', 'Valor', 'Status', 'Tipo'];
        rows = filteredData.subscriptions.map(s => [
          format(new Date(s.created_date), 'dd/MM/yyyy'),
          s.customer_name,
          s.average_bill_value,
          s.status,
          s.customer_type
        ]);
        break;
      case 'revenue':
        headers = ['Mês', 'Fatura', 'Valor Original', 'Desconto', 'Valor Final', 'Status'];
        rows = filteredData.invoices.map(i => [
          i.month_reference,
          i.customer_email,
          i.original_amount,
          i.discount_amount,
          i.final_amount,
          i.status
        ]);
        break;
      case 'churn':
        const churnData = filteredData.subscriptions.filter(s => 
          s.status === 'cancelled' || s.status === 'suspended'
        );
        headers = ['Data', 'Cliente', 'Email', 'Status', 'Motivo'];
        rows = churnData.map(s => [
          format(new Date(s.updated_date || s.created_date), 'dd/MM/yyyy'),
          s.customer_name,
          s.customer_email,
          s.status,
          s.notes || '-'
        ]);
        break;
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${reportType}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Relatório exportado em CSV!');
  };

  const handleExportPDF = async (reportType) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Título
    doc.setFontSize(20);
    doc.text('Relatório ' + reportType.toUpperCase(), pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Período: ${format(new Date(dateRange.start), 'dd/MM/yyyy')} - ${format(new Date(dateRange.end), 'dd/MM/yyyy')}`, pageWidth / 2, 30, { align: 'center' });
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, 36, { align: 'center' });

    let y = 50;

    switch (reportType) {
      case 'sales':
        doc.setFontSize(12);
        doc.text('Desempenho de Vendas', 20, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.text(`Total de Assinaturas: ${filteredData.subscriptions.length}`, 20, y);
        y += 6;
        doc.text(`Ativas: ${filteredData.subscriptions.filter(s => s.status === 'active').length}`, 20, y);
        y += 6;
        doc.text(`Pendentes: ${filteredData.subscriptions.filter(s => s.status === 'pending').length}`, 20, y);
        y += 6;
        
        const avgValue = filteredData.subscriptions.reduce((sum, s) => sum + (s.average_bill_value || 0), 0) / filteredData.subscriptions.length;
        doc.text(`Valor Médio: R$ ${avgValue.toFixed(2)}`, 20, y);
        break;

      case 'revenue':
        doc.setFontSize(12);
        doc.text('Análise de Receita', 20, y);
        y += 10;
        
        const totalRevenue = filteredData.invoices.reduce((sum, i) => sum + (i.final_amount || 0), 0);
        const paidRevenue = filteredData.invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.final_amount || 0), 0);
        
        doc.setFontSize(10);
        doc.text(`Receita Total: R$ ${totalRevenue.toFixed(2)}`, 20, y);
        y += 6;
        doc.text(`Receita Recebida: R$ ${paidRevenue.toFixed(2)}`, 20, y);
        y += 6;
        doc.text(`Total de Faturas: ${filteredData.invoices.length}`, 20, y);
        break;

      case 'churn':
        doc.setFontSize(12);
        doc.text('Análise de Churn', 20, y);
        y += 10;
        
        const churnCount = filteredData.subscriptions.filter(s => 
          s.status === 'cancelled' || s.status === 'suspended'
        ).length;
        const churnRate = ((churnCount / filteredData.subscriptions.length) * 100).toFixed(2);
        
        doc.setFontSize(10);
        doc.text(`Total de Cancelamentos/Suspensões: ${churnCount}`, 20, y);
        y += 6;
        doc.text(`Taxa de Churn: ${churnRate}%`, 20, y);
        break;
    }

    doc.save(`relatorio_${reportType}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('Relatório exportado em PDF!');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
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
                <BarChart3 className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">Relatórios Avançados</h1>
                  <p className="text-sm text-white/80">Análises detalhadas e insights</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros de Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Data Inicial</Label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div>
                <Label>Data Final</Label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="sales" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sales">
              📈 Vendas
            </TabsTrigger>
            <TabsTrigger value="churn">
              📉 Churn
            </TabsTrigger>
            <TabsTrigger value="revenue">
              💰 Receita
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Relatório de Desempenho de Vendas</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleExportCSV('sales')}>
                      <FileText className="w-4 h-4 mr-2" />
                      Exportar CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExportPDF('sales')}>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <SalesPerformanceReport 
                  subscriptions={filteredData.subscriptions}
                  referrals={filteredData.referrals}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="churn">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Análise de Churn de Clientes</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleExportCSV('churn')}>
                      <FileText className="w-4 h-4 mr-2" />
                      Exportar CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExportPDF('churn')}>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ChurnAnalysisReport subscriptions={filteredData.subscriptions} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Relatório de Receita</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleExportCSV('revenue')}>
                      <FileText className="w-4 h-4 mr-2" />
                      Exportar CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExportPDF('revenue')}>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <RevenueReport 
                  invoices={filteredData.invoices}
                  subscriptions={filteredData.subscriptions}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}