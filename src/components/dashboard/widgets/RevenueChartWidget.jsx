import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign } from 'lucide-react';

export default function RevenueChartWidget({ invoices }) {
  // Agrupar receita por mês
  const monthlyRevenue = invoices.reduce((acc, inv) => {
    const month = inv.month_reference || new Date(inv.created_date).toISOString().substring(0, 7);
    if (!acc[month]) {
      acc[month] = { month, paid: 0, pending: 0 };
    }
    if (inv.status === 'paid') {
      acc[month].paid += inv.final_amount || 0;
    } else {
      acc[month].pending += inv.final_amount || 0;
    }
    return acc;
  }, {});

  const data = Object.values(monthlyRevenue).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Receita Mensal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
            <Bar dataKey="paid" fill="#10b981" name="Recebido" />
            <Bar dataKey="pending" fill="#f59e0b" name="Pendente" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}