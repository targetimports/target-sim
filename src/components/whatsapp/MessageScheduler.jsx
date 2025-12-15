import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function MessageScheduler({ phoneNumber, message, onScheduled }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [scheduling, setScheduling] = useState(false);

  const handleSchedule = async () => {
    if (!phoneNumber || !message) {
      toast.error('Preencha o número e a mensagem');
      return;
    }

    if (!date || !time) {
      toast.error('Selecione data e hora');
      return;
    }

    const scheduledTime = new Date(`${date}T${time}`);
    if (scheduledTime <= new Date()) {
      toast.error('Selecione uma data/hora futura');
      return;
    }

    setScheduling(true);
    try {
      const res = await base44.functions.invoke('whatsappScheduler', {
        action: 'schedule',
        phone_number: phoneNumber,
        message: message,
        scheduled_time: scheduledTime.toISOString()
      });

      toast.success('Mensagem agendada com sucesso!');
      if (onScheduled) {
        onScheduled(res.data);
      }
      setDate('');
      setTime('');
    } catch (error) {
      toast.error('Erro ao agendar mensagem');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Agendar Envio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Data</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <Label>Hora</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700" 
          onClick={handleSchedule}
          disabled={scheduling || !phoneNumber || !message}
        >
          <Calendar className="w-4 h-4 mr-2" />
          {scheduling ? 'Agendando...' : 'Agendar Mensagem'}
        </Button>
      </CardContent>
    </Card>
  );
}