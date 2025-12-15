import React from 'react';
import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: 'Como funciona a assinatura de energia solar?',
    answer: 'A energia é gerada em nossas usinas solares e injetada na rede da distribuidora. Os créditos de energia são aplicados automaticamente na sua conta de luz, gerando o desconto mensal. Você não precisa instalar nada no seu imóvel.'
  },
  {
    question: 'Preciso fazer alguma instalação no meu imóvel?',
    answer: 'Não! Essa é uma das grandes vantagens da assinatura. Toda a geração acontece em nossas usinas solares, e os créditos são compensados diretamente na sua conta de luz.'
  },
  {
    question: 'Qual o valor mínimo da conta de luz para participar?',
    answer: 'O valor mínimo é de R$ 200,00 mensais. Isso garante que você tenha uma economia significativa e que o processo seja vantajoso para você.'
  },
  {
    question: 'O desconto é garantido todos os meses?',
    answer: 'Sim! O desconto é aplicado automaticamente em sua fatura todos os meses, independente do seu consumo. Você sempre terá a economia garantida.'
  },
  {
    question: 'Existe fidelidade ou multa de cancelamento?',
    answer: 'Não cobramos multa de cancelamento. Você pode cancelar sua assinatura quando quiser, com aviso prévio de 30 dias, sem nenhum custo adicional.'
  },
  {
    question: 'Como funciona o programa de indicação?',
    answer: 'A cada amigo que você indicar e fechar contrato, você ganha R$ 100,00 de desconto na sua próxima fatura. E seu amigo também ganha benefícios ao se cadastrar pela sua indicação!'
  },
  {
    question: 'Em quais estados o serviço está disponível?',
    answer: 'Estamos presentes em diversos estados do Brasil, principalmente nas regiões Sul, Sudeste e Nordeste. Na página de cadastro, você pode verificar a disponibilidade para sua região.'
  },
  {
    question: 'Quanto tempo leva para começar a economizar?',
    answer: 'Após a aprovação do seu cadastro, que leva de 1 a 3 dias úteis, os créditos começam a ser aplicados já na próxima fatura de energia.'
  }
];

export default function FAQ() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
            Dúvidas frequentes
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Perguntas frequentes
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Tire suas dúvidas sobre nossa assinatura de energia solar.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
              >
                <AccordionItem 
                  value={`item-${idx}`} 
                  className="bg-white rounded-xl border border-slate-200 px-6 shadow-sm"
                >
                  <AccordionTrigger className="text-left text-slate-900 font-medium hover:no-underline py-5">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-600 pb-5">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}