
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface Grupo {
  id: string;
  nombre: string;
  id_grupo: string | null;
  estado: string;
}

interface Cpl {
  id: string;
  fecha_inicio: string;
  fecha_termino: string;
  dia_semana: string;
  hora: string;
  tipo_cpl: string[];
  mensaje_x_dia: string | null;
  youtube_url: string | null;
  texto_video: string | null;
  imagen_url: string | null;
  imagen_texto: string | null;
  audio_url: string | null;
  audio_texto: string | null;
  destinatario_persona_grupo: string | null;
}

interface CplFormProps {
  userId: string;
  grupos: Grupo[];
  editingCpl: Cpl | null;
  onClose: () => void;
  onSuccess: () => void;
}

const DIAS_SEMANA = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
];

const TIPOS_CPL = [
  { id: 'texto', label: 'Texto' },
  { id: 'video', label: 'Video' },
  { id: 'imagen', label: 'Imagen' },
  { id: 'audio', label: 'Audio' }
];

const CplForm = ({ userId, grupos, editingCpl, onClose, onSuccess }: CplFormProps) => {
  const [formData, setFormData] = useState({
    fecha_inicio: editingCpl ? new Date(editingCpl.fecha_inicio) : new Date(),
    fecha_termino: editingCpl ? new Date(editingCpl.fecha_termino) : new Date(),
    dia_semana: editingCpl?.dia_semana || '',
    hora: editingCpl?.hora || '',
    tipo_cpl: editingCpl?.tipo_cpl || [],
    mensaje_x_dia: editingCpl?.mensaje_x_dia || '',
    youtube_url: editingCpl?.youtube_url || '',
    texto_video: editingCpl?.texto_video || '',
    imagen_texto: editingCpl?.imagen_texto || '',
    audio_texto: editingCpl?.audio_texto || '',
    destinatario_persona_grupo: editingCpl?.destinatario_persona_grupo || ''
  });

  const [loading, setLoading] = useState(false);
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const handleTipoCplChange = (tipo: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        tipo_cpl: [...prev.tipo_cpl, tipo]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        tipo_cpl: prev.tipo_cpl.filter(t => t !== tipo)
      }));
    }
  };

  const uploadFile = async (file: File, bucket: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.tipo_cpl.length === 0) {
      toast.error('Selecciona al menos un tipo de CPL');
      return;
    }

    setLoading(true);
    try {
      let imagen_url = editingCpl?.imagen_url || null;
      let audio_url = editingCpl?.audio_url || null;

      // Upload imagen if selected
      if (imagenFile) {
        imagen_url = await uploadFile(imagenFile, 'images');
      }

      // Upload audio if selected
      if (audioFile) {
        audio_url = await uploadFile(audioFile, 'audios');
      }

      const cplData = {
        fecha_inicio: formData.fecha_inicio.toISOString().split('T')[0],
        fecha_termino: formData.fecha_termino.toISOString().split('T')[0],
        dia_semana: formData.dia_semana,
        hora: formData.hora,
        tipo_cpl: formData.tipo_cpl,
        mensaje_x_dia: formData.mensaje_x_dia || null,
        youtube_url: formData.tipo_cpl.includes('video') ? formData.youtube_url || null : null,
        texto_video: formData.tipo_cpl.includes('video') ? formData.texto_video || null : null,
        imagen_url: formData.tipo_cpl.includes('imagen') ? imagen_url : null,
        imagen_texto: formData.tipo_cpl.includes('imagen') ? formData.imagen_texto || null : null,
        audio_url: formData.tipo_cpl.includes('audio') ? audio_url : null,
        audio_texto: formData.tipo_cpl.includes('audio') ? formData.audio_texto || null : null,
        destinatario_persona_grupo: formData.destinatario_persona_grupo || null,
        user_id: userId
      };

      if (editingCpl) {
        const { error } = await supabase
          .from('cpls')
          .update(cplData)
          .eq('id', editingCpl.id);

        if (error) throw error;
        toast.success('CPL actualizado exitosamente');
      } else {
        const { error } = await supabase
          .from('cpls')
          .insert(cplData);

        if (error) throw error;
        toast.success('CPL creado exitosamente');
      }

      onSuccess();
    } catch (error: any) {
      toast.error('Error al guardar CPL: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">
          {editingCpl ? 'Editar CPL' : 'Nuevo CPL'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-200">Fecha Inicio</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-gray-800 border-gray-700 text-white"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.fecha_inicio, 'PPP', { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                  <Calendar
                    mode="single"
                    selected={formData.fecha_inicio}
                    onSelect={(date) => date && setFormData(prev => ({ ...prev, fecha_inicio: date }))}
                    initialFocus
                    className="bg-gray-800"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-200">Fecha Término</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-gray-800 border-gray-700 text-white"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.fecha_termino, 'PPP', { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                  <Calendar
                    mode="single"
                    selected={formData.fecha_termino}
                    onSelect={(date) => date && setFormData(prev => ({ ...prev, fecha_termino: date }))}
                    initialFocus
                    className="bg-gray-800"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Día y Hora */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-200">Día de la Semana</Label>
              <Select
                value={formData.dia_semana}
                onValueChange={(value) => setFormData(prev => ({ ...prev, dia_semana: value }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Selecciona un día" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {DIAS_SEMANA.map((dia) => (
                    <SelectItem key={dia} value={dia} className="text-white focus:bg-gray-700">
                      {dia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hora" className="text-gray-200">Hora</Label>
              <Input
                id="hora"
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData(prev => ({ ...prev, hora: e.target.value }))}
                required
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          {/* Tipo CPL */}
          <div className="space-y-2">
            <Label className="text-gray-200">Tipo de CPL</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {TIPOS_CPL.map((tipo) => (
                <div key={tipo.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={tipo.id}
                    checked={formData.tipo_cpl.includes(tipo.id)}
                    onCheckedChange={(checked) => handleTipoCplChange(tipo.id, checked as boolean)}
                    className="border-gray-600 text-blue-600"
                  />
                  <Label htmlFor={tipo.id} className="text-gray-200">
                    {tipo.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Mensaje por día */}
          {formData.tipo_cpl.includes('texto') && (
            <div className="space-y-2">
              <Label htmlFor="mensaje" className="text-gray-200">Mensaje por Día</Label>
              <Textarea
                id="mensaje"
                value={formData.mensaje_x_dia}
                onChange={(e) => setFormData(prev => ({ ...prev, mensaje_x_dia: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
                rows={4}
                placeholder="Escribe tu mensaje aquí..."
              />
            </div>
          )}

          {/* Campos de Video */}
          {formData.tipo_cpl.includes('video') && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="youtube_url" className="text-gray-200">URL de YouTube</Label>
                <Input
                  id="youtube_url"
                  value={formData.youtube_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, youtube_url: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="texto_video" className="text-gray-200">Texto del Video</Label>
                <Textarea
                  id="texto_video"
                  value={formData.texto_video}
                  onChange={(e) => setFormData(prev => ({ ...prev, texto_video: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  rows={3}
                  placeholder="Descripción del video..."
                />
              </div>
            </div>
          )}

          {/* Campos de Imagen */}
          {formData.tipo_cpl.includes('imagen') && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="imagen" className="text-gray-200">Imagen</Label>
                <Input
                  id="imagen"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImagenFile(e.target.files?.[0] || null)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imagen_texto" className="text-gray-200">Texto de la Imagen</Label>
                <Textarea
                  id="imagen_texto"
                  value={formData.imagen_texto}
                  onChange={(e) => setFormData(prev => ({ ...prev, imagen_texto: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  rows={3}
                  placeholder="Descripción de la imagen..."
                />
              </div>
            </div>
          )}

          {/* Campos de Audio */}
          {formData.tipo_cpl.includes('audio') && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="audio" className="text-gray-200">Audio</Label>
                <Input
                  id="audio"
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="audio_texto" className="text-gray-200">Texto del Audio</Label>
                <Textarea
                  id="audio_texto"
                  value={formData.audio_texto}
                  onChange={(e) => setFormData(prev => ({ ...prev, audio_texto: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  rows={3}
                  placeholder="Descripción del audio..."
                />
              </div>
            </div>
          )}

          {/* Grupo destinatario */}
          <div className="space-y-2">
            <Label className="text-gray-200">Grupo Destinatario</Label>
            <Select
              value={formData.destinatario_persona_grupo}
              onValueChange={(value) => setFormData(prev => ({ ...prev, destinatario_persona_grupo: value }))}
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Selecciona un grupo" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {grupos.map((grupo) => (
                  <SelectItem
                    key={grupo.id}
                    value={grupo.id_grupo!}
                    className="text-white focus:bg-gray-700"
                  >
                    {grupo.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Guardando...' : 'Guardar CPL'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CplForm;
