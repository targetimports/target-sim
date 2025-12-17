import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

export default function SubscriptionTrendsWidget({ subscriptions }) {
  // Agrupar por mês
  const monthlyData = subscriptions.reduce((acc, sub) => {
    const month = new Date(sub.created_date).toISOString().substring(0, 7);
    if (!acc[month]) {
      acc[month] = { month, count: 0, active: 0 };
    }
    acc[month].count++;
    if (sub.status === 'active') acc[month].active++;
    return acc;
  }, {});

  const data = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Tendência de Assinaturas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Total" strokeWidth={2} />
            <Line type="monotone" dataKey="active" stroke="#10b981" name="Ativas" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}