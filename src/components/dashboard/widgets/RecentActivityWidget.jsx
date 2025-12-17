import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, UserPlus, FileText, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function RecentActivityWidget({ subscriptions, invoices, tickets }) {
  const activities = [
    ...subscriptions.slice(0, 5).map(s => ({
      type: 'subscription',
      icon: UserPlus,
      title: `Nova assinatura: ${s.customer_name}`,
      date: s.created_date,
      color: 'text-green-600'
    })),
    ...invoices.slice(0, 5).map(i => ({
      type: 'invoice',
      icon: FileText,
      title: `Fatura criada: R$ ${i.final_amount?.toFixed(2)}`,
      date: i.created_date,
      color: 'text-blue-600'
    })),
    ...(tickets || []).slice(0, 5).map(t => ({
      type: 'ticket',
      icon: AlertCircle,
      title: `Chamado: ${t.subject}`,
      date: t.created_date,
      color: 'text-orange-600'
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Atividades Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map((activity, index) => {
            const Icon = activity.icon;
            return (
              <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50">
                <Icon className={`w-5 h-5 mt-1 ${activity.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{activity.title}</p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(activity.date), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}