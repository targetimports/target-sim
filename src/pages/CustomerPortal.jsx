import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sun, User, FileText, CreditCard, MessageSquare, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import SubscriptionDetailsTab from '../components/portal/SubscriptionDetailsTab';
import EnergyCreditsTab from '../components/portal/EnergyCreditsTab';
import InvoicesTab from '../components/portal/InvoicesTab';
import ProfileTab from '../components/portal/ProfileTab';
import SupportTab from '../components/portal/SupportTab';

export default function CustomerPortal() {
  const [activeTab, setActiveTab] = useState('subscription');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: subscription } = useQuery({
    queryKey: ['my-subscription', user?.email],
    queryFn: () => base44.entities.Subscription.filter({ customer_email: user?.email }),
    enabled: !!user?.email,
    select: (data) => data[0]
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-amber-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Sun className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Portal do Cliente</h1>
                <p className="text-sm text-white/80">Olá, {user?.full_name || subscription?.customer_name}!</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={() => base44.auth.logout()}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1 grid grid-cols-2 md:grid-cols-5 gap-1">
            <TabsTrigger 
              value="subscription" 
              className="data-[state=active]:bg-slate-900 data-[state=active]:text-white flex items-center gap-2"
            >
              <Sun className="w-4 h-4" />
              <span className="hidden sm:inline">Assinatura</span>
            </TabsTrigger>
            <TabsTrigger 
              value="credits" 
              className="data-[state=active]:bg-slate-900 data-[state=active]:text-white flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Créditos</span>
            </TabsTrigger>
            <TabsTrigger 
              value="invoices" 
              className="data-[state=active]:bg-slate-900 data-[state=active]:text-white flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Faturas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="profile" 
              className="data-[state=active]:bg-slate-900 data-[state=active]:text-white flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger 
              value="support" 
              className="data-[state=active]:bg-slate-900 data-[state=active]:text-white flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Suporte</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="subscription">
            <SubscriptionDetailsTab subscription={subscription} userEmail={user?.email} />
          </TabsContent>

          <TabsContent value="credits">
            <EnergyCreditsTab subscription={subscription} userEmail={user?.email} />
          </TabsContent>

          <TabsContent value="invoices">
            <InvoicesTab subscription={subscription} userEmail={user?.email} />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileTab subscription={subscription} userEmail={user?.email} />
          </TabsContent>

          <TabsContent value="support">
            <SupportTab subscription={subscription} userEmail={user?.email} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}