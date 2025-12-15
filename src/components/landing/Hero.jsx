import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Leaf, Zap, Shield, Smartphone, ArrowRight, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";

export default function Hero() {
  const [billValue, setBillValue] = useState('');
  const [customerType, setCustomerType] = useState('residential');
  
  const calculateSavings = () => {
    const value = parseFloat(billValue) || 0;
    const discountRate = customerType === 'commercial' ? 0.20 : 0.15;
    return {
      monthly: (value * discountRate).toFixed(2),
      yearly: (value * discountRate * 12).toFixed(2)
    };
  };

  const savings = calculateSavings();

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-amber-500/5 to-yellow-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Floating Elements */}
      <motion.div 
        className="absolute top-32 right-20 hidden lg:block"
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Sun className="w-16 h-16 text-yellow-400/30" />
      </motion.div>

      <div className="relative z-10 container mx-auto px-4 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-6">
              <Leaf className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 text-sm font-medium">Energia 100% Renovável</span>
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Economize até{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400">
                20%
              </span>{' '}
              na sua conta de luz
            </h1>
            
            <p className="text-lg text-slate-400 mb-8 max-w-lg">
              Energia solar por assinatura. Sem obras, sem investimento inicial, 
              contratação 100% digital. Comece a economizar hoje.
            </p>

            <div className="flex flex-wrap gap-6 mb-10">
              {[
                { icon: Zap, text: 'Desconto garantido' },
                { icon: Shield, text: 'Sem fidelidade' },
                { icon: Smartphone, text: '100% Digital' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-slate-300">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <item.icon className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-sm">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <Link to={createPageUrl('Subscribe')}>
                <Button size="lg" className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-8 h-14 text-lg rounded-xl shadow-lg shadow-amber-500/25">
                  Assinar agora
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href="#calculator">
                <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 px-8 h-14 text-lg rounded-xl">
                  Calcular economia
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Right - Calculator Card */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            id="calculator"
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Calcule sua economia
                </h2>
                <p className="text-slate-400">Descubra quanto você pode economizar</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Tipo de conta
                  </label>
                  <Select value={customerType} onValueChange={setCustomerType}>
                    <SelectTrigger className="h-14 bg-white/5 border-white/10 text-white rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Pessoa Física (até 15% de desconto)</SelectItem>
                      <SelectItem value="commercial">Pessoa Jurídica (até 20% de desconto)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Valor médio da sua conta de luz
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
                    <Input
                      type="number"
                      placeholder="0,00"
                      value={billValue}
                      onChange={(e) => setBillValue(e.target.value)}
                      className="h-14 pl-12 bg-white/5 border-white/10 text-white text-lg rounded-xl"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Valor mínimo: R$ 200,00</p>
                </div>

                {parseFloat(billValue) >= 200 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-2xl"
                  >
                    <p className="text-slate-400 text-sm mb-2">Sua economia estimada:</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-3xl font-bold text-white">R$ {savings.monthly}</p>
                        <p className="text-amber-400 text-sm">por mês</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-white">R$ {savings.yearly}</p>
                        <p className="text-amber-400 text-sm">por ano</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                <Link to={createPageUrl('Subscribe')} className="block">
                  <Button className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-lg rounded-xl shadow-lg shadow-amber-500/25">
                    Começar a economizar
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}