import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Trash2, ArrowLeft, Filter } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function NotificationCenter() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.SystemNotification.filter({ recipient_email: user?.email }),
    enabled: !!user?.email
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.SystemNotification.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.read);
      for (const notif of unread) {
        await base44.entities.SystemNotification.update(notif.id, { read: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      toast.success('Todas marcadas como lidas');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SystemNotification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      toast.success('Notificação removida');
    }
  });

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  const priorityColors = {
    low: 'bg-slate-100 text-slate-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  const typeIcons = {
    credit_allocated: '🎉',
    credit_expiring: '⏰',
    allocation_issue: '⚠️',
    reconciliation_complete: '✅',
    payment_due: '💰',
    system_alert: '🔔'
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={user?.role === 'admin' ? createPageUrl('AdminDashboard') : createPageUrl('CustomerPortal')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Bell className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">Central de Notificações</h1>
                  <p className="text-sm text-white/80">
                    {unreadCount > 0 ? `${unreadCount} não lidas` : 'Todas lidas'}
                  </p>
                </div>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                className="border-white/30 text-white hover:bg-white/20"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <Check className="w-4 h-4 mr-2" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <Button
                size="sm"
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
              >
                Todas ({notifications.length})
              </Button>
              <Button
                size="sm"
                variant={filter === 'unread' ? 'default' : 'outline'}
                onClick={() => setFilter('unread')}
              >
                Não lidas ({unreadCount})
              </Button>
              <Button
                size="sm"
                variant={filter === 'read' ? 'default' : 'outline'}
                onClick={() => setFilter('read')}
              >
                Lidas ({notifications.length - unreadCount})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Notificações */}
        <div className="space-y-3">
          {filteredNotifications.map((notif) => (
            <Card key={notif.id} className={!notif.read ? 'border-2 border-blue-200' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">
                    {typeIcons[notif.notification_type] || '🔔'}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-lg">{notif.title}</p>
                        <p className="text-sm text-slate-600 mt-1">{notif.message}</p>
                      </div>
                      <Badge className={priorityColors[notif.priority]}>
                        {notif.priority === 'low' ? 'Baixa' :
                         notif.priority === 'medium' ? 'Média' :
                         notif.priority === 'high' ? 'Alta' : 'Urgente'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-slate-400">
                        {format(new Date(notif.created_date), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        {!notif.read && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsReadMutation.mutate(notif.id)}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Marcar como lida
                          </Button>
                        )}
                        {notif.action_url && (
                          <Button size="sm" asChild>
                            <a href={notif.action_url}>Ver detalhes</a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(notif.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredNotifications.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">
                  {filter === 'unread' ? 'Nenhuma notificação não lida' :
                   filter === 'read' ? 'Nenhuma notificação lida' :
                   'Nenhuma notificação'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}