import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Wrench, Clock, CheckCircle, Calendar, User,
  MapPin, FileText, AlertCircle, Filter
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ServiceOrders() {
  const [user, setUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['my-subscriptions', user?.email],
    queryFn: () => base44.entities.Subscription.filter({ customer_email: user?.email }),
    enabled: !!user?.email
  });

  const { data: serviceOrders = [] } = useQuery({
    queryKey: ['service-orders', subscriptions],
    queryFn: async () => {
      if (subscriptions.length === 0) return [];
      const allOrders = await base44.entities.ServiceOrder.list('-created_date', 50);
      return allOrders.filter(order => 
        subscriptions.some(sub => sub.id === order.subscription_id)
      );
    },
    enabled: subscriptions.length > 0
  });

  const filteredOrders = statusFilter === 'all' 
    ? serviceOrders 
    : serviceOrders.filter(o => o.status === statusFilter);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-slate-100 text-slate-800'
  };

  const statusLabels = {
    pending: 'Pendente',
    scheduled: 'Agendado',
    in_progress: 'Em Andamento',
    completed: 'Concluído',
    cancelled: 'Cancelado'
  };

  const typeLabels = {
    installation: 'Instalação',
    maintenance: 'Manutenção',
    repair: 'Reparo',
    inspection: 'Inspeção',
    uninstallation: 'Desinstalação'
  };

  const typeIcons = {
    installation: '🔧',
    maintenance: '⚙️',
    repair: '🛠️',
    inspection: '🔍',
    uninstallation: '📦'
  };

  const priorityColors = {
    low: 'border-l-blue-500',
    medium: 'border-l-yellow-500',
    high: 'border-l-orange-500',
    urgent: 'border-l-red-500'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Ordens de Serviço</h1>
              <p className="text-amber-400 text-sm">Acompanhe instalações e manutenções</p>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-amber-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              >
                <option value="all">Todos os Status</option>
                <option value="pending">Pendente</option>
                <option value="scheduled">Agendado</option>
                <option value="in_progress">Em Andamento</option>
                <option value="completed">Concluído</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid sm:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Pendentes', count: serviceOrders.filter(o => o.status === 'pending').length, icon: Clock, color: 'yellow' },
            { label: 'Agendados', count: serviceOrders.filter(o => o.status === 'scheduled').length, icon: Calendar, color: 'blue' },
            { label: 'Em Andamento', count: serviceOrders.filter(o => o.status === 'in_progress').length, icon: Wrench, color: 'purple' },
            { label: 'Concluídos', count: serviceOrders.filter(o => o.status === 'completed').length, icon: CheckCircle, color: 'green' }
          ].map((stat, idx) => (
            <Card key={idx} className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 bg-${stat.color}-100 rounded-xl flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{stat.count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className={`border-0 shadow-sm border-l-4 ${priorityColors[order.priority]}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="text-4xl">{typeIcons[order.order_type]}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-900">{typeLabels[order.order_type]}</h3>
                          <Badge className={statusColors[order.status]}>
                            {statusLabels[order.status]}
                          </Badge>
                          <Badge variant="outline" className={
                            order.priority === 'urgent' ? 'border-red-500 text-red-700' :
                            order.priority === 'high' ? 'border-orange-500 text-orange-700' :
                            'border-slate-300'
                          }>
                            {order.priority === 'urgent' ? 'Urgente' :
                             order.priority === 'high' ? 'Alta' :
                             order.priority === 'medium' ? 'Média' : 'Baixa'} Prioridade
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{order.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                          {order.scheduled_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(order.scheduled_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          )}
                          {order.assigned_technician && (
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {order.assigned_technician}
                            </span>
                          )}
                          {order.estimated_duration_hours && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {order.estimated_duration_hours}h estimadas
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {order.cost && (
                      <div className="text-right lg:text-left">
                        <p className="text-sm text-slate-500">Custo</p>
                        <p className="text-2xl font-bold text-amber-600">R$ {order.cost.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {filteredOrders.length === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma ordem de serviço encontrada</h3>
                <p className="text-slate-500">Você não possui ordens de serviço no momento</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}