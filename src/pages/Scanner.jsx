import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, XCircle, CheckCircle2, Zap, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";

export default function Scanner() {
  const videoRef = useRef(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [error, setError] = useState('');

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
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasCamera(true);
        setScanning(true);
      }
    } catch (err) {
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setHasCamera(false);
    setScanning(false);
  };

  const handleManualInput = () => {
    const code = prompt('Digite o código da estação de carregamento:');
    if (code) {
      setScannedData({
        type: 'manual',
        code: code,
        timestamp: new Date().toISOString()
      });
      stopCamera();
    }
  };

  const handleReset = () => {
    setScannedData(null);
    setError('');
    stopCamera();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Scanner QR Code</h1>
                <p className="text-xs text-slate-400">Estação de carregamento</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!scannedData ? (
          <div className="max-w-md mx-auto">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 overflow-hidden">
              <CardContent className="p-0">
                {/* Camera View */}
                <div className="relative bg-slate-900 aspect-square">
                  {scanning ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera className="w-24 h-24 text-slate-700" />
                    </div>
                  )}
                  
                  {/* Scanning Overlay */}
                  {scanning && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-64 h-64 border-4 border-amber-500 rounded-2xl animate-pulse">
                        <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-2xl"></div>
                        <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-2xl"></div>
                        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-2xl"></div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-2xl"></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="p-6 space-y-4">
                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  {!scanning ? (
                    <>
                      <Button
                        onClick={startCamera}
                        className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-lg rounded-xl"
                      >
                        <Camera className="w-5 h-5 mr-2" />
                        Ativar câmera
                      </Button>
                      <Button
                        onClick={handleManualInput}
                        variant="outline"
                        className="w-full h-14 border-white/10 text-white hover:bg-white/5 text-lg rounded-xl"
                      >
                        Digitar código manualmente
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-center text-slate-400 text-sm">
                        Posicione o QR Code dentro da moldura
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={stopCamera}
                          variant="outline"
                          className="border-white/10 text-white hover:bg-white/5 rounded-xl"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleManualInput}
                          className="bg-white/10 hover:bg-white/20 text-white rounded-xl"
                        >
                          Digitar código
                        </Button>
                      </div>
                    </>
                  )}

                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs text-slate-500 text-center">
                      O QR Code está localizado na estação de carregamento
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-2">
                  QR Code detectado!
                </h2>
                <p className="text-slate-400 mb-6">
                  Estação identificada com sucesso
                </p>

                <div className="p-4 bg-slate-900/50 rounded-xl mb-6">
                  <p className="text-xs text-slate-500 mb-1">Código:</p>
                  <p className="text-lg font-mono text-white break-all">
                    {scannedData.code}
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-lg rounded-xl"
                    onClick={() => {
                      // Aqui você pode adicionar a lógica para iniciar o carregamento
                      alert('Iniciar carregamento na estação: ' + scannedData.code);
                    }}
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    Iniciar carregamento
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="w-full border-white/10 text-white hover:bg-white/5 rounded-xl"
                  >
                    Escanear novamente
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}