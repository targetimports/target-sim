import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function DeyeConfiguration() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    region: 'EU',
    appId: '',
    appSecret: '',
    email: '',
    password: '',
    companyId: '',
    enabled: false
  });

  // Buscar configurações existentes
  const { data: settings } = useQuery({
    queryKey: ['deye-settings'],
    queryFn: () => base44.entities.DeyeSettings.list()
  });

  useEffect(() => {
    if (settings && settings.length > 0) {
      const config = settings[0];
      setFormData({
        region: config.region || 'EU',
        appId: config.appId || '',
        appSecret: config.appSecret || '',
        email: config.email || '',
        password: config.password || '',
        companyId: config.companyId || '',
        enabled: config.enabled || false
      });
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (settings && settings.length > 0) {
        return await base44.entities.DeyeSettings.update(settings[0].id, data);
      } else {
        return await base44.entities.DeyeSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deye-settings'] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar configurações: ' + error.message);
    }
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await mutation.mutateAsync(formData);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await base44.functions.invoke('deye_testConnection');
      if (response.data.success) {
        toast.success('Conexão bem-sucedida! ' + response.data.message);
        
        // Atualizar status do teste
        if (settings && settings.length > 0) {
          await base44.entities.DeyeSettings.update(settings[0].id, {
            lastTestStatus: 'success',
            lastTestMessage: response.data.message,
            lastTestDate: new Date().toISOString()
          });
          queryClient.invalidateQueries({ queryKey: ['deye-settings'] });
        }
      } else {
        toast.error('Falha na conexão: ' + response.data.message);
        
        if (settings && settings.length > 0) {
          await base44.entities.DeyeSettings.update(settings[0].id, {
            lastTestStatus: 'failed',
            lastTestMessage: response.data.message,
            lastTestDate: new Date().toISOString()
          });
          queryClient.invalidateQueries({ queryKey: ['deye-settings'] });
        }
      }
    } catch (error) {
      toast.error('Erro ao testar: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Configuração DeyeCloud</h1>
          <p className="text-slate-600 mt-2">Configure sua integração com a DeyeCloud API v1</p>
        </div>

        {settings && settings.length > 0 && (
          <Card className="mb-6 border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {settings[0].lastTestStatus === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : settings[0].lastTestStatus === 'failed' ? (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    Último teste: {settings[0].lastTestStatus || 'não testado'}
                  </p>
                  {settings[0].lastTestMessage && (
                    <p className="text-sm text-slate-600">{settings[0].lastTestMessage}</p>
                  )}
                  {settings[0].lastTestDate && (
                    <p className="text-xs text-slate-500">
                      {new Date(settings[0].lastTestDate).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Credenciais da DeyeCloud</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              {/* Região */}
              <div className="grid gap-2">
                <Label>Região</Label>
                <Select value={formData.region} onValueChange={(value) => setFormData({...formData, region: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EU">Europa (EU)</SelectItem>
                    <SelectItem value="US">Estados Unidos (US)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  {formData.region === 'EU' 
                    ? 'eu1-developer.deyecloud.com' 
                    : 'us1-developer.deyecloud.com'}
                </p>
              </div>

              {/* App ID */}
              <div className="grid gap-2">
                <Label htmlFor="appId">App ID</Label>
                <Input
                  id="appId"
                  type="text"
                  placeholder="Seu App ID"
                  value={formData.appId}
                  onChange={(e) => setFormData({...formData, appId: e.target.value})}
                  required
                />
              </div>

              {/* App Secret */}
              <div className="grid gap-2">
                <Label htmlFor="appSecret">App Secret</Label>
                <Input
                  id="appSecret"
                  type="password"
                  placeholder="Seu App Secret"
                  value={formData.appSecret}
                  onChange={(e) => setFormData({...formData, appSecret: e.target.value})}
                  required
                />
              </div>

              {/* Email */}
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>

              {/* Password */}
              <div className="grid gap-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Sua senha"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>

              {/* Company ID (opcional) */}
              <div className="grid gap-2">
                <Label htmlFor="companyId">Company ID (opcional)</Label>
                <Input
                  id="companyId"
                  type="text"
                  placeholder="Para conta business"
                  value={formData.companyId}
                  onChange={(e) => setFormData({...formData, companyId: e.target.value})}
                />
              </div>

              {/* Enabled */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({...formData, enabled: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label htmlFor="enabled" className="cursor-pointer">
                  Habilitar integração DeyeCloud
                </Label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTest}
                  disabled={testing || !formData.appId || !formData.appSecret || !formData.email || !formData.password}
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    'Testar Conexão'
                  )}
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Configurações'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Segurança:</strong> Nunca compartilhe seu App Secret. Esta integração usa SHA-256 para hash de senhas e JWT para autenticação.
          </p>
        </div>
      </div>
    </div>
  );
}