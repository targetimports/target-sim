import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { ArrowRight } from 'lucide-react';
import { menuCategories } from './NavigationMenu';

const colorPalette = [
  'from-amber-500 to-orange-500',
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-pink-500',
  'from-green-500 to-emerald-500',
  'from-indigo-500 to-blue-500',
  'from-red-500 to-orange-500',
  'from-teal-500 to-cyan-500',
  'from-violet-500 to-purple-500',
  'from-yellow-500 to-amber-500',
  'from-pink-500 to-rose-500',
  'from-slate-500 to-gray-500'
];

export default function QuickAccessCards({ visibleItems = [] }) {
  // Gerar mapa de todas as páginas do menu
  const allMenuItems = Object.values(menuCategories)
    .flatMap(category => 
      category.items.map((item, idx) => ({
        id: item.url,
        title: `${item.icon} ${item.name}`,
        description: category.title,
        url: item.url,
        color: colorPalette[idx % colorPalette.length]
      }))
    );

  const filteredItems = visibleItems.length > 0 
    ? allMenuItems.filter(item => visibleItems.includes(item.id))
    : [];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {filteredItems.map((item) => (
        <Link key={item.id} to={createPageUrl(item.url)}>
          <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer h-full">
            <CardContent className="p-0">
              <div className={`bg-gradient-to-br ${item.color} p-4 text-white`}>
                <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                <p className="text-sm text-white/90">{item.description}</p>
              </div>
              <div className="p-4 flex items-center justify-between bg-white">
                <span className="text-sm text-slate-600">Acessar</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}