import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";

export default function NotificationBell({ userEmail }) {
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', userEmail],
    queryFn: () => base44.entities.SystemNotification.filter({ recipient_email: userEmail }),
    enabled: !!userEmail,
    refetchInterval: 30000 // Recarregar a cada 30 segundos
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const recentNotifications = notifications.slice(0, 5);

  const priorityColors = {
    low: 'text-slate-600',
    medium: 'text-blue-600',
    high: 'text-orange-600',
    urgent: 'text-red-600'
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-2 border-b">
          <p className="font-semibold">Notificações</p>
          {unreadCount > 0 && (
            <p className="text-xs text-slate-500">{unreadCount} não lidas</p>
          )}
        </div>
        
        {recentNotifications.length > 0 ? (
          <>
            {recentNotifications.map((notif) => (
              <DropdownMenuItem key={notif.id} className="flex-col items-start p-3 cursor-pointer">
                <div className="flex items-start gap-2 w-full">
                  <div className={`w-2 h-2 rounded-full mt-2 ${notif.read ? 'bg-slate-300' : 'bg-blue-500'}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${priorityColors[notif.priority]}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {format(new Date(notif.created_date), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            
            <div className="p-2 border-t">
              <Link to={createPageUrl('NotificationCenter')}>
                <Button variant="ghost" size="sm" className="w-full">
                  Ver todas
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <div className="p-6 text-center text-slate-500 text-sm">
            Nenhuma notificação
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}