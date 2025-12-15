import React from 'react';
import { Sun, Mail, Phone, MapPin, Facebook, Instagram, Linkedin, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-violet-500 rounded-xl flex items-center justify-center">
                <Sun className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">EnergiaSolar</span>
            </div>
            <p className="text-sm mb-6">
              Energia solar por assinatura. Economize na conta de luz com energia 100% limpa e renovável.
            </p>
            <div className="flex gap-4">
              {[Facebook, Instagram, Linkedin, Youtube].map((Icon, idx) => (
                <a 
                  key={idx} 
                  href="#" 
                  className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-6">Links rápidos</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Como funciona</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Vantagens</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Perguntas frequentes</a></li>
              <li><Link to={createPageUrl('Subscribe')} className="hover:text-emerald-400 transition-colors">Assinar agora</Link></li>
              <li><Link to={createPageUrl('Login')} className="hover:text-emerald-400 transition-colors">Área do cliente</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-6">Institucional</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Sobre nós</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Nossas usinas</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Política de privacidade</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Termos de uso</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Trabalhe conosco</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-6">Contato</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">0800 123 4567</p>
                  <p>Seg a Sex, 8h às 18h</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <a href="mailto:contato@energiasolar.com" className="hover:text-emerald-400 transition-colors">
                  contato@energiasolar.com
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span>São Paulo, SP - Brasil</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-center md:text-left">
            © 2024 EnergiaSolar. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-emerald-400 transition-colors">Privacidade</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Termos</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}