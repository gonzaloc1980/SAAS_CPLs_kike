
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Send } from 'lucide-react';

const ContactForm = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    whatsapp: '',
    mensaje: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Insertar en la base de datos
      const { error } = await supabase
        .from('contact_requests')
        .insert([formData]);

      if (error) throw error;

      // Llamar al webhook (opcional - el administrador puede configurar la URL en Supabase)
      try {
        const { data: webhookData } = await supabase.functions.invoke('contact-webhook', {
          body: formData
        });
      } catch (webhookError) {
        // El webhook es opcional, no fallar si no está configurado
        console.log('Webhook no configurado o falló:', webhookError);
      }

      toast.success('¡Solicitud enviada exitosamente! Nos pondremos en contacto contigo pronto.');
      
      // Limpiar formulario
      setFormData({
        nombre: '',
        correo: '',
        whatsapp: '',
        mensaje: ''
      });
    } catch (error: any) {
      toast.error('Error al enviar la solicitud. Por favor intenta nuevamente.');
      console.error('Error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800 max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-white">
          Solicita una Asesoría
        </CardTitle>
        <CardDescription className="text-gray-400">
          Déjanos tus datos y nos pondremos en contacto contigo para brindarte más información sobre CPL Manager
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre" className="text-gray-200">Nombre completo *</Label>
            <Input
              id="nombre"
              name="nombre"
              type="text"
              value={formData.nombre}
              onChange={handleChange}
              required
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              placeholder="Tu nombre completo"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="correo" className="text-gray-200">Correo electrónico *</Label>
            <Input
              id="correo"
              name="correo"
              type="email"
              value={formData.correo}
              onChange={handleChange}
              required
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              placeholder="tu@email.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="whatsapp" className="text-gray-200">WhatsApp *</Label>
            <Input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              value={formData.whatsapp}
              onChange={handleChange}
              required
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              placeholder="+1234567890"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="mensaje" className="text-gray-200">Mensaje (opcional)</Label>
            <Textarea
              id="mensaje"
              name="mensaje"
              value={formData.mensaje}
              onChange={handleChange}
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 min-h-[100px]"
              placeholder="Cuéntanos más sobre tus necesidades o cualquier pregunta específica..."
            />
          </div>
          
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? (
              'Enviando...'
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Solicitar Asesoría
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ContactForm;
