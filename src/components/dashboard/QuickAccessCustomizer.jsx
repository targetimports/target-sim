import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Settings } from 'lucide-react';

export default function QuickAccessCustomizer({ availableItems, visibleItems, onSave }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState(visibleItems);

  React.useEffect(() => {
    setSelectedItems(visibleItems);
  }, [visibleItems]);

  const handleToggle = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSave = () => {
    onSave(selectedItems);
    setIsOpen(false);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        <Settings className="w-4 h-4 mr-2" />
        Personalizar
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Personalizar Acesso Rápido</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {availableItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded">
                <Checkbox
                  id={item.id}
                  checked={selectedItems.includes(item.id)}
                  onCheckedChange={() => handleToggle(item.id)}
                />
                <Label htmlFor={item.id} className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                </Label>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}