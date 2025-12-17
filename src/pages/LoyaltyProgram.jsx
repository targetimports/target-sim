import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Star, Award, ArrowLeft, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

export default function LoyaltyProgram() {
  const { data: programs = [] } = useQuery({
    queryKey: ['loyalty-programs'],
    queryFn: () => base44.entities.LoyaltyProgram.list('-points', 100)
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => base44.entities.Subscription.list()
  });

  const tierColors = {
    bronze: 'bg-amber-100 text-amber-800',
    silver: 'bg-slate-200 text-slate-800',
    gold: 'bg-yellow-100 text-yellow-800',
    platinum: 'bg-purple-100 text-purple-800'
  };

  const tierIcons = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Programa de Fidelidade</h1>
                <p className="text-sm text-white/80">Recompense seus melhores clientes</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {programs.map((program) => {
            const subscription = subscriptions.find(s => s.customer_email === program.customer_email);
            
            return (
              <Card key={program.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-lg font-semibold">{subscription?.customer_name}</p>
                      <p className="text-sm text-slate-500">{program.customer_email}</p>
                    </div>
                    <Badge className={tierColors[program.tier]}>
                      {tierIcons[program.tier]} {program.tier.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="w-4 h-4 text-blue-600" />
                        <p className="text-xs text-slate-600">Pontos</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{program.points}</p>
                    </div>

                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <p className="text-xs text-slate-600">Indicações</p>
                      </div>
                      <p className="text-2xl font-bold text-green-600">{program.successful_referrals}/{program.total_referrals}</p>
                    </div>

                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="w-4 h-4 text-purple-600" />
                        <p className="text-xs text-slate-600">Badges</p>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">{program.badges?.length || 0}</p>
                    </div>

                    <div className="p-3 bg-amber-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Crown className="w-4 h-4 text-amber-600" />
                        <p className="text-xs text-slate-600">Economia</p>
                      </div>
                      <p className="text-2xl font-bold text-amber-600">R$ {(program.lifetime_savings || 0).toFixed(0)}</p>
                    </div>
                  </div>

                  {program.badges && program.badges.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-slate-700 mb-2">🏆 Conquistas:</p>
                      <div className="flex gap-2 flex-wrap">
                        {program.badges.map((badge, idx) => (
                          <Badge key={idx} variant="outline">{badge}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}