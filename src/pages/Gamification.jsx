import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Award, Star, TrendingUp, ArrowLeft, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';

export default function Gamification() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: achievements = [] } = useQuery({
    queryKey: ['achievements', user?.email],
    queryFn: () => base44.entities.Achievement.filter({ user_email: user.email }, '-created_date'),
    enabled: !!user
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['impact-reports', user?.email],
    queryFn: () => base44.entities.ImpactReport.filter({ customer_email: user.email }),
    enabled: !!user
  });

  const totalPoints = achievements.reduce((sum, a) => sum + (a.points || 0), 0);
  const totalCO2Saved = reports.reduce((sum, r) => sum + (r.co2_avoided_kg || 0), 0);

  const allBadges = [
    { type: 'first_month', title: 'Primeiro Mês', description: 'Completou o primeiro mês de economia', points: 100, icon: '🎉' },
    { type: 'eco_warrior', title: 'Guerreiro Ecológico', description: 'Economizou 1000 kWh', points: 500, icon: '🌱' },
    { type: 'energy_saver', title: 'Poupador de Energia', description: 'Economizou 5000 kWh', points: 1000, icon: '⚡' },
    { type: 'co2_hero', title: 'Herói do CO2', description: 'Evitou 100kg de CO2', points: 300, icon: '🌍' },
    { type: 'referral_master', title: 'Mestre das Indicações', description: 'Indicou 5 amigos', points: 800, icon: '👥' },
    { type: 'year_anniversary', title: 'Aniversário de 1 Ano', description: 'Um ano de energia limpa', points: 2000, icon: '🎂' },
    { type: 'super_saver', title: 'Super Economizador', description: 'Economizou 10000 kWh', points: 3000, icon: '🏆' }
  ];

  const unlockedTypes = achievements.map(a => a.badge_type);
  const nextLevel = Math.floor(totalPoints / 1000) + 1;
  const pointsToNextLevel = (nextLevel * 1000) - totalPoints;
  const levelProgress = ((totalPoints % 1000) / 1000) * 100;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('CustomerDashboard')}>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-amber-400" />
              <div>
                <h1 className="text-2xl font-bold">Conquistas & Recompensas</h1>
                <p className="text-amber-400 text-sm">Nível {Math.floor(totalPoints / 1000)} • {totalPoints} pontos</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle>Progresso do Nível</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Nível {Math.floor(totalPoints / 1000)}</span>
                  <span className="text-sm font-medium text-amber-600">{pointsToNextLevel} pontos para o próximo nível</span>
                </div>
                <Progress value={levelProgress} className="h-3" />
                <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-xl">
                  <Zap className="w-5 h-5 text-amber-600" />
                  <p className="text-sm text-slate-700">
                    Continue economizando energia para desbloquear mais conquistas!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Estatísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 rounded-xl">
                <p className="text-sm text-slate-500">Total de CO2 Evitado</p>
                <p className="text-2xl font-bold text-green-600">{totalCO2Saved.toFixed(1)} kg</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-sm text-slate-500">Conquistas Desbloqueadas</p>
                <p className="text-2xl font-bold text-blue-600">{achievements.length}/{allBadges.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Suas Conquistas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {allBadges.map((badge) => {
                const unlocked = unlockedTypes.includes(badge.type);
                const achievement = achievements.find(a => a.badge_type === badge.type);

                return (
                  <div
                    key={badge.type}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      unlocked
                        ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-5xl mb-3">{badge.icon}</div>
                      <h3 className="font-bold text-lg text-slate-900 mb-1">{badge.title}</h3>
                      <p className="text-sm text-slate-600 mb-3">{badge.description}</p>
                      <Badge className={unlocked ? 'bg-amber-500' : 'bg-slate-400'}>
                        {badge.points} pontos
                      </Badge>
                      {unlocked && achievement && (
                        <p className="text-xs text-slate-500 mt-2">
                          Desbloqueado em {format(new Date(achievement.created_date), 'dd/MM/yyyy')}
                        </p>
                      )}
                      {!unlocked && (
                        <p className="text-xs text-slate-500 mt-2">🔒 Bloqueado</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}