import React from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { ArrowRight, Phone, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";

export default function CTA() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-amber-600 to-yellow-600 p-12 lg:p-20"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
              Pronto para começar a economizar?
            </h2>
            <p className="text-xl text-amber-50 mb-10">
              Faça sua adesão agora e comece a economizar até 20% na sua conta de luz. 
              Processo 100% digital e sem burocracia.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <Link to={createPageUrl('Subscribe')}>
                <Button size="lg" className="bg-white text-slate-900 hover:bg-amber-50 px-8 h-14 text-lg rounded-xl shadow-lg w-full sm:w-auto">
                  Assinar agora
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href="tel:08001234567">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8 h-14 text-lg rounded-xl w-full sm:w-auto">
                  <Phone className="mr-2 w-5 h-5" />
                  0800 123 4567
                </Button>
              </a>
            </div>

            <div className="flex items-center justify-center gap-2 text-amber-50">
              <MessageCircle className="w-5 h-5" />
              <span>Ou fale conosco pelo WhatsApp</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}