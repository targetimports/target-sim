import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, X, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import jsQR from 'jsqr';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ScanQRCode() {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [scannedData, setScannedData] = useState(null);
  const [processing, setProcessing] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
        requestAnimationFrame(scanQRCode);
      }
    } catch (err) {
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setScanning(false);
  };

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        handleQRCodeDetected(code.data);
        return;
      }
    }

    animationRef.current = requestAnimationFrame(scanQRCode);
  };

  const handleQRCodeDetected = async (data) => {
    stopCamera();
    setProcessing(true);

    try {
      // Parse QR Code data (formato esperado: JSON ou URL)
      let qrData;
      try {
        qrData = JSON.parse(data);
      } catch {
        qrData = { raw: data };
      }

      setScannedData({
        ...qrData,
        timestamp: new Date().toISOString(),
        success: true
      });

      toast.success('QR Code escaneado com sucesso!');
      
      // Aqui você pode fazer uma chamada para registrar o uso da estação
      // await base44.entities.ChargingSession.create({ station_id: qrData.station_id, ... });
      
    } catch (err) {
      setError('Erro ao processar QR Code: ' + err.message);
      setScannedData({ success: false, error: err.message });
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setScannedData(null);
    setError('');
    setProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/20 rounded-2xl mb-4">
              <Zap className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Scanner de QR Code
            </h1>
            <p className="text-slate-400">
              Escaneie o QR Code da estação de carregamento
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="mb-6 border-red-500/50 bg-red-500/10">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Scanner Card */}
          {!scannedData && (
            <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
              <CardContent className="p-0">
                {!scanning ? (
                  <div className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-500/20 rounded-2xl mb-6">
                      <Camera className="w-10 h-10 text-amber-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Iniciar Scanner
                    </h3>
                    <p className="text-slate-400 mb-6">
                      Posicione o QR Code da estação dentro do quadro
                    </p>
                    <Button
                      onClick={startCamera}
                      size="lg"
                      className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      Abrir Câmera
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      className="w-full h-auto"
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {/* Scanning Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="relative">
                        <div className="w-64 h-64 border-4 border-amber-400 rounded-2xl animate-pulse">
                          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-400 -translate-x-1 -translate-y-1" />
                          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-400 translate-x-1 -translate-y-1" />
                          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-400 -translate-x-1 translate-y-1" />
                          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-400 translate-x-1 translate-y-1" />
                        </div>
                      </div>
                    </div>

                    {/* Stop Button */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto">
                      <Button
                        onClick={stopCamera}
                        variant="destructive"
                        size="lg"
                        className="rounded-full"
                      >
                        <X className="w-5 h-5 mr-2" />
                        Cancelar
                      </Button>
                    </div>

                    {processing && (
                      <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4" />
                          <p className="text-white font-medium">Processando...</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Success Card */}
          {scannedData && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-2xl mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    QR Code Escaneado!
                  </h3>
                </div>

                <div className="bg-slate-900/50 rounded-xl p-6 mb-6">
                  <h4 className="text-sm text-slate-400 mb-3">Dados Capturados:</h4>
                  <pre className="text-sm text-slate-300 whitespace-pre-wrap overflow-auto max-h-64">
                    {JSON.stringify(scannedData, null, 2)}
                  </pre>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={reset}
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Escanear Novamente
                  </Button>
                  <Button
                    onClick={() => {
                      // Ação pós-scan (ex: iniciar carregamento)
                      toast.success('Carregamento iniciado!');
                      reset();
                    }}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Iniciar Carregamento
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card className="mt-6 bg-slate-800/30 border-slate-700">
            <CardContent className="p-6">
              <h4 className="font-semibold text-white mb-3">Como usar:</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">1.</span>
                  <span>Clique em "Abrir Câmera" para iniciar o scanner</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">2.</span>
                  <span>Posicione o QR Code da estação dentro do quadro amarelo</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">3.</span>
                  <span>Aguarde a leitura automática do código</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">4.</span>
                  <span>Confirme os dados e inicie o carregamento</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}