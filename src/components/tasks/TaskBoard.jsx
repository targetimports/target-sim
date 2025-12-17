import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, PlayCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TaskBoard({ tasks, onUpdateTask }) {
  const columns = [
    { status: 'pending', title: 'Pendentes', icon: Clock, color: 'bg-yellow-100' },
    { status: 'in_progress', title: 'Em Progresso', icon: PlayCircle, color: 'bg-blue-100' },
    { status: 'completed', title: 'Concluídas', icon: CheckCircle, color: 'bg-green-100' },
    { status: 'cancelled', title: 'Canceladas', icon: XCircle, color: 'bg-slate-100' }
  ];

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  const priorityLabels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente'
  };

  return (
    <div className="grid lg:grid-cols-4 gap-4">
      {columns.map((column) => {
        const Icon = column.icon;
        const columnTasks = tasks.filter(t => t.status === column.status);
        
        return (
          <Card key={column.status} className={column.color}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {column.title}
                <Badge className="ml-auto" variant="secondary">{columnTasks.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {columnTasks.map((task) => {
                const isOverdue = task.status !== 'completed' && task.due_date && new Date(task.due_date) < new Date();
                
                return (
                  <Card key={task.id} className="bg-white hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <span className="text-slate-400">⋮</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onUpdateTask(task.id, { status: 'pending' })}>
                                <Clock className="w-4 h-4 mr-2" />
                                Marcar como pendente
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onUpdateTask(task.id, { status: 'in_progress' })}>
                                <PlayCircle className="w-4 h-4 mr-2" />
                                Iniciar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onUpdateTask(task.id, { status: 'completed', completed_date: new Date().toISOString() })}>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Concluir
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onUpdateTask(task.id, { status: 'cancelled' })}>
                                <XCircle className="w-4 h-4 mr-2" />
                                Cancelar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={priorityColors[task.priority]} variant="outline">
                            {priorityLabels[task.priority]}
                          </Badge>
                          
                          {task.task_type && (
                            <Badge variant="outline" className="text-xs">
                              {task.task_type === 'follow_up' ? '📞' :
                               task.task_type === 'call' ? '☎️' :
                               task.task_type === 'email' ? '📧' :
                               task.task_type === 'meeting' ? '🤝' : '📋'}
                            </Badge>
                          )}
                        </div>

                        {task.due_date && (
                          <p className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                            {isOverdue && '⚠️ '}
                            Vence: {format(new Date(task.due_date), 'dd/MM/yyyy HH:mm')}
                          </p>
                        )}

                        {task.assigned_to && (
                          <p className="text-xs text-slate-500">
                            👤 {task.assigned_to.split('@')[0]}
                          </p>
                        )}

                        {task.related_to_name && (
                          <p className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
                            🔗 {task.related_to_name}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {columnTasks.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Nenhuma tarefa
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}