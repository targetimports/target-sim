import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Download, Share2, ArrowLeft, Leaf } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function Certificates() {
  const certificateRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates', user?.email],
    queryFn: () => base44.entities.Certificate.filter({ user_email: user.email }, '-created_date'),
    enabled: !!user
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['impact-reports', user?.email],
    queryFn: () => base44.entities.ImpactReport.filter({ customer_email: user.email }),
    enabled: !!user
  });

  const downloadCertificate = async (certificate) => {
    const element = document.getElementById(`certificate-${certificate.id}`);
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4');
    const imgWidth = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`certificado-${certificate.period}.pdf`);
  };

  const totalCO2 = certificates.reduce((sum, c) => sum + (c.co2_avoided_kg || 0), 0);
  const totalEnergy = certificates.reduce((sum, c) => sum + (c.renewable_energy_kwh || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('CustomerDashboard')}>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Award className="w-6 h-6 text-amber-400" />
              <div>
                <h1 className="text-2xl font-bold">Certificados de Energia Limpa</h1>
                <p className="text-amber-400 text-sm">Seus certificados mensais de sustentabilidade</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Leaf className="w-12 h-12" />
                <div>
                  <p className="text-sm text-green-100">Total de CO2 Evitado</p>
                  <p className="text-3xl font-bold">{totalCO2.toFixed(1)} kg</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Award className="w-12 h-12" />
                <div>
                  <p className="text-sm text-amber-100">Energia Renovável Total</p>
                  <p className="text-3xl font-bold">{totalEnergy.toFixed(0)} kWh</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {certificates.map((certificate) => (
            <Card key={certificate.id} className="border-0 shadow-lg overflow-hidden">
              <div
                id={`certificate-${certificate.id}`}
                className="bg-gradient-to-br from-slate-50 to-amber-50 p-8"
              >
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Award className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">
                      Certificado de Energia Limpa
                    </h2>
                    <p className="text-slate-600">Certificado Nº {certificate.certificate_number || certificate.id.substring(0, 8).toUpperCase()}</p>
                  </div>

                  <div className="bg-white rounded-xl p-8 border-2 border-amber-200 shadow-sm">
                    <p className="text-center text-lg text-slate-700 mb-6">
                      Certificamos que
                    </p>
                    <p className="text-center text-2xl font-bold text-slate-900 mb-6">
                      {user?.full_name}
                    </p>
                    <p className="text-center text-slate-600 mb-8">
                      Utilizou energia 100% renovável durante o período de <strong>{certificate.period}</strong>
                    </p>

                    <div className="grid sm:grid-cols-3 gap-6 mb-8">
                      <div className="text-center p-4 bg-green-50 rounded-xl">
                        <p className="text-sm text-slate-500 mb-1">Energia Renovável</p>
                        <p className="text-2xl font-bold text-green-600">{certificate.renewable_energy_kwh} kWh</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-xl">
                        <p className="text-sm text-slate-500 mb-1">CO2 Evitado</p>
                        <p className="text-2xl font-bold text-blue-600">{certificate.co2_avoided_kg} kg</p>
                      </div>
                      <div className="text-center p-4 bg-amber-50 rounded-xl">
                        <p className="text-sm text-slate-500 mb-1">Árvores Equivalentes</p>
                        <p className="text-2xl font-bold text-amber-600">{certificate.trees_equivalent}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-8 pt-6 border-t border-slate-200">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-slate-900 rounded-full mx-auto mb-2"></div>
                        <p className="text-xs text-slate-500">Energia Solar Brasil</p>
                        <p className="text-xs font-semibold">Diretor Executivo</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-slate-500">Data de Emissão</p>
                        <p className="font-semibold">
                          {certificate.issued_date
                            ? format(new Date(certificate.issued_date), 'dd/MM/yyyy')
                            : format(new Date(certificate.created_date), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <CardContent className="p-6 bg-white">
                <div className="flex items-center justify-between">
                  <Badge className="bg-green-100 text-green-800">Verificado</Badge>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => downloadCertificate(certificate)}
                      className="bg-amber-500 hover:bg-amber-600"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Baixar PDF
                    </Button>
                    <Button variant="outline">
                      <Share2 className="w-4 h-4 mr-2" />
                      Compartilhar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {certificates.length === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-2">Nenhum certificado disponível ainda</p>
                <p className="text-sm text-slate-400">Seus certificados mensais aparecerão aqui</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}