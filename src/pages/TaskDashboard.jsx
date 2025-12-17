import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, ArrowLeft, AlertTriangle, Clock, TrendingUp, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, isAfter, isBefore, addDays } from 'date-fns';

export default function TaskDashboard() {
  const [selectedUser, setSelectedUser] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 500)
  });

  // Filter tasks by selected user
  const tasks = selectedUser === 'all' 
    ? allTasks 
    : allTasks.filter(t => t.assigned_to === selectedUser);

  const myTasks = allTasks.filter(t => t.assigned_to === user?.email);

  // Statistics
  const now = new Date();
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.status !== 'completed' && t.due_date && isBefore(new Date(t.due_date), now)).length,
    urgent: tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length,
    dueSoon: tasks.filter(t => 
      t.status !== 'completed' && 
      t.due_date && 
      isAfter(new Date(t.due_date), now) && 
      isBefore(new Date(t.due_date), addDays(now, 3))
    ).length
  };

  // My urgent tasks
  const myUrgentTasks = myTasks.filter(t => 
    (t.priority === 'urgent' || t.priority === 'high') && 
    t.status !== 'completed' && 
    t.status !== 'cancelled'
  ).slice(0, 5);

  // Tasks due soon
  const tasksDueSoon = myTasks.filter(t => 
    t.status !== 'completed' && 
    t.due_date && 
    isAfter(new Date(t.due_date), now) && 
    isBefore(new Date(t.due_date), addDays(now, 3))
  ).sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).slice(0, 5);

  // Chart data - Status distribution
  const statusData = [
    { name: 'Pendentes', value: stats.pending, color: '#fbbf24' },
    { name: 'Em Progresso', value: stats.inProgress, color: '#3b82f6' },
    { name: 'Concluídas', value: stats.completed, color: '#10b981' },
    { name: 'Canceladas', value: tasks.filter(t => t.status === 'cancelled').length, color: '#94a3b8' }
  ].filter(d => d.value > 0);

  // Priority distribution
  const priorityData = [
    { name: 'Baixa', value: tasks.filter(t => t.priority === 'low').length, color: '#3b82f6' },
    { name: 'Média', value: tasks.filter(t => t.priority === 'medium').length, color: '#fbbf24' },
    { name: 'Alta', value: tasks.filter(t => t.priority === 'high').length, color: '#f97316' },
    { name: 'Urgente', value: tasks.filter(t => t.priority === 'urgent').length, color: '#ef4444' }
  ].filter(d => d.value > 0);

  // Tasks by assignee
  const assigneeMap = {};
  allTasks.forEach(t => {
    if (t.assigned_to) {
      assigneeMap[t.assigned_to] = (assigneeMap[t.assigned_to] || 0) + 1;
    }
  });
  const assigneeData = Object.entries(assigneeMap)
    .map(([name, count]) => ({ name: name.split('@')[0], value: count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const uniqueAssignees = [...new Set(allTasks.map(t => t.assigned_to).filter(Boolean))];

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <CheckSquare className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">Dashboard de Tarefas</h1>
                  <p className="text-sm text-white/80">Visão geral e métricas</p>
                </div>
              </div>
            </div>
            <Link to={createPageUrl('TaskManager')}>
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/20">
                Gerenciar Tarefas
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filter */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Visualizar tarefas de:</span>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="all">Todos os usuários</option>
                {uniqueAssignees.map(email => (
                  <option key={email} value={email}>{email}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-2 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pendentes</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Em Progresso</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Atrasadas</p>
                  <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckSquare className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Concluídas</p>
                  <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-slate-500">
                  Sem dados
                </div>
              )}
            </CardContent>
          </Card>

          {/* Priority Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuição por Prioridade</CardTitle>
            </CardHeader>
            <CardContent>
              {priorityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-slate-500">
                  Sem dados
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks by Assignee */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tarefas por Pessoa</CardTitle>
            </CardHeader>
            <CardContent>
              {assigneeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={assigneeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#6366f1" name="Tarefas" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-slate-500">
                  Sem dados
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* My Urgent Tasks */}
          <Card className="border-2 border-red-200">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                Minhas Tarefas Urgentes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {myUrgentTasks.length > 0 ? (
                <div className="space-y-3">
                  {myUrgentTasks.map((task) => (
                    <Card key={task.id} className="p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={priorityColors[task.priority]}>
                              {task.priority === 'urgent' ? '🔴 Urgente' : '🟠 Alta'}
                            </Badge>
                            {task.due_date && (
                              <span className="text-xs text-slate-500">
                                Vence: {format(new Date(task.due_date), 'dd/MM HH:mm')}
                              </span>
                            )}
                          </div>
                        </div>
                        <Link to={createPageUrl('TaskManager')}>
                          <Button size="sm" variant="outline">Ver</Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500">
                  <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm">Nenhuma tarefa urgente</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks Due Soon */}
          <Card className="border-2 border-orange-200">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50">
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <Clock className="w-5 h-5" />
                Tarefas Próximas do Vencimento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {tasksDueSoon.length > 0 ? (
                <div className="space-y-3">
                  {tasksDueSoon.map((task) => {
                    const daysUntilDue = Math.ceil((new Date(task.due_date) - now) / (1000 * 60 * 60 * 24));
                    return (
                      <Card key={task.id} className="p-3 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{task.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className={priorityColors[task.priority]}>
                                {task.priority === 'urgent' ? 'Urgente' :
                                 task.priority === 'high' ? 'Alta' :
                                 task.priority === 'medium' ? 'Média' : 'Baixa'}
                              </Badge>
                              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                                ⏰ {daysUntilDue === 0 ? 'Hoje' : `${daysUntilDue}d`}
                              </Badge>
                            </div>
                          </div>
                          <Link to={createPageUrl('TaskManager')}>
                            <Button size="sm" variant="outline">Ver</Button>
                          </Link>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500">
                  <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm">Nenhuma tarefa vencendo nos próximos 3 dias</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}