import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Eye, EyeOff, GripVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

export default function DashboardCustomizer({ 
  availableWidgets, 
  visibleWidgets, 
  onSave 
}) {
  const [tempVisible, setTempVisible] = useState(visibleWidgets);

  const toggleWidget = (widgetId) => {
    if (tempVisible.includes(widgetId)) {
      setTempVisible(tempVisible.filter(id => id !== widgetId));
    } else {
      setTempVisible([...tempVisible, widgetId]);
    }
  };

  const handleSave = () => {
    onSave(tempVisible);
    toast.success('Preferências salvas!');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Personalizar Dashboard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Personalizar Widgets do Dashboard</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Selecione quais widgets você deseja visualizar no seu dashboard
          </p>
          
          <div className="grid gap-3 max-h-96 overflow-y-auto">
            {availableWidgets.map((widget) => (
              <div
                key={widget.id}
                className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                  tempVisible.includes(widget.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => toggleWidget(widget.id)}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-medium">{widget.title}</p>
                    <p className="text-sm text-slate-500">{widget.description}</p>
                  </div>
                </div>
                <div>
                  {tempVisible.includes(widget.id) ? (
                    <Eye className="w-5 h-5 text-blue-600" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={() => setTempVisible(visibleWidgets)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              Salvar Preferências
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}