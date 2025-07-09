import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VincularManagerProps {
  userId: string;
  userEmail?: string;
}

const VincularManager = ({ userId, userEmail }: VincularManagerProps) => {
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);

  const generateQR = async () => {
    setGeneratingQr(true);
    try {
      const response = await fetch('https://mywhinlite.p.rapidapi.com/getqr', {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'mywhinlite.p.rapidapi.com',
          'x-rapidapi-key': 'b9fdaab62fmsh0de18e5562aca92p142eecjsn084728bcc9c3'
        }
      });

      if (!response.ok) {
        throw new Error('Error al generar QR');
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setQrImage(imageUrl);
      toast.success('QR generado exitosamente');
    } catch (error) {
      console.error('Error generating QR:', error);
      toast.error('Error al generar el código QR');
    } finally {
      setGeneratingQr(false);
    }
  };

  const markAsVinculado = async () => {
    setLoading(true);
    try {
      const nombre = userEmail?.split('@')[0] || 'Usuario';
      const { error } = await supabase
        .from('profiles')
        .update({ 
          vinculado: true,
          api_key: 'b9fdaab62fmsh0de18e5562aca92p142eecjsn084728bcc9c3',
          nombre: nombre
        })
        .eq('user_id', userId);

      if (error) throw error;
      
      toast.success('Vinculación completada exitosamente');
      
      // Refresh de la página después de completar la vinculación
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error al completar la vinculación');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <QrCode className="h-5 w-5 text-blue-400" />
            Vincular Dispositivo
          </CardTitle>
          <CardDescription className="text-gray-400">
            Genera un código QR para vincular tu dispositivo al sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Button
              onClick={generateQR}
              disabled={generatingQr}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {generatingQr ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando QR...
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4 mr-2" />
                  Obtener QR
                </>
              )}
            </Button>
          </div>

          {qrImage && (
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <img 
                  src={qrImage} 
                  alt="Código QR de vinculación" 
                  className="max-w-xs max-h-xs"
                />
              </div>
              <div className="text-center space-y-2">
                <p className="text-gray-400 text-sm">
                  Escanea este código QR con tu dispositivo
                </p>
                <Button
                  onClick={markAsVinculado}
                  disabled={loading}
                  variant="outline"
                  className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Completando...
                    </>
                  ) : (
                    'Marcar como Vinculado'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VincularManager;