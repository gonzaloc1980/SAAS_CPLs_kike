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
  const [instanceName, setInstanceName] = useState<string>('');

  const EVOLUTION_API_URL = 'https://agendador-evolution-api.6qgqpv.easypanel.host';
  const EVOLUTION_API_KEY = '429683C4C977415CAAFCCE10F7D57E11';

  useEffect(() => {
    const fetchInstanceName = async () => {
      if (userId) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('api_key')
            .eq('user_id', userId)
            .single();

          if (error) {
            console.error('Error fetching instance name:', error);
            return;
          }

          if (data?.api_key) {
            setInstanceName(data.api_key);
          }
        } catch (err) {
          console.error('Error fetching instance name:', err);
        }
      }
    };

    fetchInstanceName();
  }, [userId]);

  const generateQR = async () => {
    if (!instanceName.trim()) {
      toast.error('No se ha encontrado nombre de instancia');
      return;
    }

    setGeneratingQr(true);

    try {
      const endpoint = `${EVOLUTION_API_URL}/instance/connect/${instanceName}`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al generar QR: ${response.status} - ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      let qrData = null;

      if (contentType?.includes('application/json')) {
        const responseData = await response.json();

        if (responseData.base64) {
          qrData = responseData.base64.startsWith('data:image') 
            ? responseData.base64 
            : `data:image/png;base64,${responseData.base64}`;
        } else if (responseData.qrcode) {
          qrData = responseData.qrcode.startsWith('data:image')
            ? responseData.qrcode
            : `data:image/png;base64,${responseData.qrcode}`;
        } else if (responseData.qr) {
          qrData = responseData.qr.startsWith('data:image')
            ? responseData.qr
            : `data:image/png;base64,${responseData.qr}`;
        } else {
          throw new Error('No se encontró QR válido en la respuesta JSON');
        }
      } else if (contentType?.includes('image')) {
        const blob = await response.blob();
        qrData = URL.createObjectURL(blob);
      } else {
        const raw = await response.text();
        qrData = raw.startsWith('data:image')
          ? raw
          : `data:image/png;base64,${raw}`;
      }

      console.log('QR BASE64:', qrData);
      setQrImage(qrData);
      toast.success('QR generado exitosamente');
    } catch (error) {
      console.error(error);
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
          nombre,
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Vinculación completada exitosamente');
      setTimeout(() => {
        window.location.href = '/';
      }, 4500);
    } catch (err) {
      console.error(err);
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
            Vincular Dispositivo WhatsApp
          </CardTitle>
          <CardDescription className="text-gray-400">
            Genera un código QR para vincular tu WhatsApp al sistema Evolution API
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
                  alt="Código QR de vinculación WhatsApp" 
                  className="max-w-xs max-h-xs"
                />
              </div>
              <p className="text-sm text-gray-400 text-center">
                Escanea este código QR con WhatsApp Web desde tu teléfono.
              </p>
              <p className="text-xs text-gray-500">
                Instancia: <code className="bg-gray-800 px-1 rounded">{instanceName}</code>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VincularManager;