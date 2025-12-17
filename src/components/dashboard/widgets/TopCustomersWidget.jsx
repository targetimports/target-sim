import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, TrendingUp } from 'lucide-react';

export default function TopCustomersWidget({ subscriptions }) {
  const topCustomers = subscriptions
    .filter(s => s.status === 'active' && s.average_bill_value)
    .sort((a, b) => (b.average_bill_value || 0) - (a.average_bill_value || 0))
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" />
          Top 5 Clientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topCustomers.map((customer, index) => (
            <div key={customer.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  index === 0 ? 'bg-amber-100 text-amber-600' :
                  index === 1 ? 'bg-slate-200 text-slate-600' :
                  index === 2 ? 'bg-orange-100 text-orange-600' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-sm">{customer.customer_name}</p>
                  <p className="text-xs text-slate-500">{customer.city}/{customer.state}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600">R$ {customer.average_bill_value?.toFixed(2)}</p>
                <p className="text-xs text-slate-500">valor médio</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}