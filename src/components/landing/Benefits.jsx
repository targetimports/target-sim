import React from 'react';
import { motion } from 'framer-motion';
import { 
  Leaf, 
  Wallet, 
  Shield, 
  Smartphone, 
  Users, 
  Clock,
  CreditCard,
  HeartHandshake
} from 'lucide-react';

const benefits = [
  {
    icon: Wallet,
    title: 'Economia garantida',
    description: 'Até 20% de desconto na conta de luz, todos os meses, sem variações.'
  },
  {
    icon: Leaf,
    title: 'Energia 100% limpa',
    description: 'Energia solar renovável que contribui para um futuro sustentável.'
  },
  {
    icon: Shield,
    title: 'Sem investimento',
    description: 'Nenhum custo de instalação ou equipamento. Zero obras no seu imóvel.'
  },
  {
    icon: Smartphone,
    title: 'Contratação digital',
    description: 'Processo 100% online, rápido e sem burocracia.'
  },
  {
    icon: Clock,
    title: 'Sem fidelidade',
    description: 'Você pode cancelar quando quiser, sem multas ou taxas.'
  },
  {
    icon: CreditCard,
    title: 'Pagamento flexível',
    description: 'Pague com cartão de crédito, PIX ou boleto bancário.'
  },
  {
    icon: Users,
    title: 'Indique e ganhe',
    description: 'Ganhe R$100 por cada amigo que assinar nossa energia.'
  },
  {
    icon: HeartHandshake,
    title: 'Atendimento premium',
    description: 'Suporte dedicado via WhatsApp, telefone ou e-mail.'
  }
];

export default function Benefits() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 bg-violet-100 text-violet-700 rounded-full text-sm font-medium mb-4">
            Vantagens
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Por que escolher nossa energia?
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Benefícios exclusivos que fazem a diferença no seu bolso e no planeta.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="group"
            >
              <div className="h-full p-6 rounded-2xl bg-slate-50 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-violet-50 border border-transparent hover:border-emerald-100 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-violet-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <benefit.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{benefit.title}</h3>
                <p className="text-slate-600 text-sm">{benefit.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}