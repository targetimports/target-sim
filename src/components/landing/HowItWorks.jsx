import React from 'react';
import { motion } from 'framer-motion';
import { Calculator, FileCheck, Wallet, Sun } from 'lucide-react';

const steps = [
  {
    icon: Calculator,
    title: 'Simule seu desconto',
    description: 'Informe o valor da sua conta de luz e descubra quanto você pode economizar.',
    color: 'emerald'
  },
  {
    icon: FileCheck,
    title: 'Faça sua adesão',
    description: 'Contratação 100% digital, sem burocracia e sem necessidade de obras.',
    color: 'violet'
  },
  {
    icon: Sun,
    title: 'Receba energia limpa',
    description: 'Sua cota de energia solar é injetada na rede e creditada na sua conta.',
    color: 'yellow'
  },
  {
    icon: Wallet,
    title: 'Economize todo mês',
    description: 'Receba o desconto automaticamente em sua fatura de energia.',
    color: 'emerald'
  }
];

const colorClasses = {
  emerald: {
    bg: 'bg-amber-500/10',
    icon: 'text-amber-500',
    border: 'border-amber-500/20',
    gradient: 'from-amber-500'
  },
  violet: {
    bg: 'bg-amber-600/10',
    icon: 'text-amber-600',
    border: 'border-amber-600/20',
    gradient: 'from-amber-600'
  },
  yellow: {
    bg: 'bg-yellow-500/10',
    icon: 'text-yellow-500',
    border: 'border-yellow-500/20',
    gradient: 'from-yellow-500'
  }
};

export default function HowItWorks() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 bg-amber-100 text-amber-900 rounded-full text-sm font-medium mb-4">
            Como funciona
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Energia limpa em 4 passos simples
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Processo rápido, digital e sem complicação. Comece a economizar em minutos.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, idx) => {
            const colors = colorClasses[step.color];
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="relative"
              >
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-slate-200 to-transparent"></div>
                )}
                
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-14 h-14 ${colors.bg} rounded-2xl flex items-center justify-center`}>
                      <step.icon className={`w-7 h-7 ${colors.icon}`} />
                    </div>
                    <span className="text-4xl font-bold text-slate-200">0{idx + 1}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                  <p className="text-slate-600">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}