import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Maria Silva',
    role: 'Cliente Residencial',
    location: 'São Paulo, SP',
    content: 'Estou economizando R$150 por mês na minha conta de luz. O processo foi super simples e não precisei instalar nada!',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'
  },
  {
    name: 'João Santos',
    role: 'Empresário',
    location: 'Rio de Janeiro, RJ',
    content: 'Para minha empresa, a economia de 20% fez toda a diferença no fluxo de caixa. Recomendo para todos os empresários.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop'
  },
  {
    name: 'Ana Costa',
    role: 'Cliente Residencial',
    location: 'Belo Horizonte, MG',
    content: 'Adoro saber que estou usando energia limpa e ainda economizando. O atendimento é excelente e tudo é muito transparente.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop'
  }
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 bg-amber-500/10 text-amber-400 rounded-full text-sm font-medium mb-4 border border-amber-500/20">
            Depoimentos
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            O que nossos clientes dizem
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Milhares de pessoas já estão economizando com nossa energia solar.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className="h-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
                <Quote className="w-10 h-10 text-amber-500/30 mb-4" />
                
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>

                <p className="text-slate-300 mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>

                <div className="flex items-center gap-4">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-white font-semibold">{testimonial.name}</p>
                    <p className="text-slate-400 text-sm">{testimonial.role}</p>
                    <p className="text-slate-500 text-xs">{testimonial.location}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}