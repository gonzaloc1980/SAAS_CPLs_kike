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
import { CalendarIcon, Copy, Rocket } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface Grupo {
  id: string;
  nombre: string;
  id_grupo: string | null;
  estado: string;
}

interface CplLanzamiento {
  id: string;
  tipo_lanzamiento: string;
  dia_mes: number | null;
  fecha_lanzamiento: string | null;
  fecha_inicio: string | null;
  fecha_termino: string | null;
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
  estado: string;
}

interface CplLanzamientoFormProps {
  userId: string;
  grupos: Grupo[];
  editingCpl?: CplLanzamiento | null;
  duplicatingCpl?: CplLanzamiento | null;
  onClose: () => void;
  onSuccess: () => void;
}

const TIPOS_CPL = [
  { id: 'texto', label: 'Texto' },
  { id: 'video', label: 'Video' },
  { id: 'imagen', label: 'Imagen' },
  { id: 'audio', label: 'Audio' }
];

const ESTADOS_CPL = [
  { id: 'activo', label: 'Activo' },
  { id: 'pausado', label: 'Pausado' }
];

const DIAS_MES = Array.from({ length: 31 }, (_, i) => i + 1);

// Reutiliza la misma lógica de conversión de zona horaria que CplForm
const calcularHoraColombia = (horaLocal: string, paisAdmin: string): string => {
  if (!horaLocal || !paisAdmin || paisAdmin === 'Colombia') {
    return horaLocal;
  }

  const zonasHorarias: { [key: string]: string } = {
    'Puerto Rico': 'America/Puerto_Rico',
    'Estados Unidos': 'America/New_York',
    'México': 'America/Mexico_City',
    'Argentina': 'America/Argentina/Buenos_Aires',
    'Chile': 'America/Santiago',
    'Perú': 'America/Lima',
    'Ecuador': 'America/Guayaquil',
    'Venezuela': 'America/Caracas',
    'Panamá': 'America/Panama',
    'Costa Rica': 'America/Costa_Rica',
    'Guatemala': 'America/Guatemala',
    'República Dominicana': 'America/Santo_Domingo',
    'España': 'Europe/Madrid',
  };

  const zonaOrigen = zonasHorarias[paisAdmin];
  if (!zonaOrigen) {
    return horaLocal;
  }

  try {
    const [horas, minutos] = horaLocal.split(':').map(Number);

    const offsetOrigen = obtenerOffsetMinutos(zonaOrigen, new Date());
    const offsetColombia = obtenerOffsetMinutos('America/Bogota', new Date());

    const diferenciaMinutos = offsetColombia - offsetOrigen;
    const totalMinutos = horas * 60 + minutos + diferenciaMinutos;

    let minutosNormalizados = totalMinutos;
    while (minutosNormalizados < 0) minutosNormalizados += 1440;
    while (minutosNormalizados >= 1440) minutosNormalizados -= 1440;

    const horasFinal = Math.floor(minutosNormalizados / 60);
    const minutosFinal = minutosNormalizados % 60;

    return `${horasFinal.toString().padStart(2, '0')}:${minutosFinal.toString().padStart(2, '0')}`;
  } catch (error) {
    return horaLocal;
  }
};

const obtenerOffsetMinutos = (zonaHoraria: string, fecha: Date): number => {
  try {
    const utc1 = new Date(fecha.toLocaleString('en-US', { timeZone: 'UTC' }));
    const utc2 = new Date(fecha.toLocaleString('en-US', { timeZone: zonaHoraria }));
    return (utc2.getTime() - utc1.getTime()) / 60000;
  } catch {
    return 0;
  }
};

const CplLanzamientoForm = ({ userId, grupos, editingCpl, duplicatingCpl, onClose, onSuccess }: CplLanzamientoFormProps) => {
  const baseCpl = editingCpl || duplicatingCpl;
  const isDuplicating = !!duplicatingCpl;

  const [formData, setFormData] = useState({
    tipo_lanzamiento: baseCpl?.tipo_lanzamiento || 'recurrente',
    dia_mes: baseCpl?.dia_mes?.toString() || '',
    fecha_lanzamiento: baseCpl?.fecha_lanzamiento || '',
    fecha_inicio: baseCpl?.fecha_inicio ? new Date(baseCpl.fecha_inicio + 'T00:00:00') : new Date(),
    fecha_termino: baseCpl?.fecha_termino ? new Date(baseCpl.fecha_termino + 'T00:00:00') : new Date(),
    hora: baseCpl?.hora || '',
    tipo_cpl: baseCpl?.tipo_cpl || [],
    mensaje_x_dia: baseCpl?.mensaje_x_dia || '',
    youtube_url: baseCpl?.youtube_url || '',
    texto_video: baseCpl?.texto_video || '',
    imagen_texto: baseCpl?.imagen_texto || '',
    audio_texto: baseCpl?.audio_texto || '',
    destinatario_persona_grupo: baseCpl?.destinatario_persona_grupo || '',
    estado: baseCpl?.estado || 'activo'
  });

  const [loading, setLoading] = useState(false);
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [adminCplPais, setAdminCplPais] = useState<string>('Colombia');

  useEffect(() => {
    const obtenerPaisAdmin = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: orgsData, error: orgsError } = await supabase
          .rpc('get_user_organizations', { _user_id: userData.user.id });

        if (orgsError || !orgsData || orgsData.length === 0) {
          setAdminCplPais('Colombia');
          return;
        }

        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('pais')
          .eq('id', orgsData[0].organization_id)
          .single();

        if (orgError) {
          setAdminCplPais('Colombia');
          return;
        }

        setAdminCplPais(orgData?.pais || 'Colombia');
      } catch {
        setAdminCplPais('Colombia');
      }
    };

    obtenerPaisAdmin();
  }, []);

  const handleTipoCplChange = (tipo: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => {
        const newData = { ...prev, tipo_cpl: [tipo] };
        switch (tipo) {
          case 'texto':
            newData.youtube_url = '';
            newData.texto_video = '';
            newData.imagen_texto = '';
            newData.audio_texto = '';
            break;
          case 'video':
            newData.mensaje_x_dia = '';
            newData.imagen_texto = '';
            newData.audio_texto = '';
            break;
          case 'imagen':
            newData.mensaje_x_dia = '';
            newData.youtube_url = '';
            newData.texto_video = '';
            newData.audio_texto = '';
            break;
          case 'audio':
            newData.mensaje_x_dia = '';
            newData.youtube_url = '';
            newData.texto_video = '';
            newData.imagen_texto = '';
            break;
        }
        return newData;
      });
    } else {
      setFormData(prev => ({ ...prev, tipo_cpl: [] }));
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

    if (!formData.destinatario_persona_grupo) {
      toast.error('Selecciona un grupo destinatario');
      return;
    }

    if (formData.tipo_lanzamiento === 'recurrente' && !formData.dia_mes) {
      toast.error('Selecciona el día del mes para el lanzamiento recurrente');
      return;
    }

    if (formData.tipo_lanzamiento === 'fecha_unica' && !formData.fecha_lanzamiento) {
      toast.error('Selecciona la fecha de lanzamiento');
      return;
    }

    if (!formData.hora) {
      toast.error('Ingresa una hora');
      return;
    }

    if (formData.tipo_cpl.length === 0) {
      toast.error('Selecciona al menos un tipo de CPL');
      return;
    }

    const tipoSeleccionado = formData.tipo_cpl[0];

    if (tipoSeleccionado === 'texto' && (!formData.mensaje_x_dia || formData.mensaje_x_dia.trim() === '')) {
      toast.error('El campo "Mensaje" es obligatorio para CPL de texto');
      return;
    }

    if (tipoSeleccionado === 'video') {
      if (!formData.youtube_url || formData.youtube_url.trim() === '') {
        toast.error('El campo "URL de Google Drive" es obligatorio para CPL de video');
        return;
      }
      if (!formData.texto_video || formData.texto_video.trim() === '') {
        toast.error('El campo "Texto del Video" es obligatorio para CPL de video');
        return;
      }
    }

    if (tipoSeleccionado === 'imagen') {
      if (!editingCpl && !duplicatingCpl && !imagenFile) {
        toast.error('Debes seleccionar una imagen para CPL de imagen');
        return;
      }
      if (!formData.imagen_texto || formData.imagen_texto.trim() === '') {
        toast.error('El campo "Texto de la Imagen" es obligatorio para CPL de imagen');
        return;
      }
    }

    if (tipoSeleccionado === 'audio') {
      if (!editingCpl && !duplicatingCpl && !audioFile) {
        toast.error('Debes seleccionar un audio para CPL de audio');
        return;
      }
      if (!formData.audio_texto || formData.audio_texto.trim() === '') {
        toast.error('El campo "Texto del Audio" es obligatorio para CPL de audio');
        return;
      }
    }

    setLoading(true);
    try {
      let imagen_url = (editingCpl?.imagen_url || duplicatingCpl?.imagen_url) || null;
      let audio_url = (editingCpl?.audio_url || duplicatingCpl?.audio_url) || null;

      if (imagenFile) imagen_url = await uploadFile(imagenFile, 'images');
      if (audioFile) audio_url = await uploadFile(audioFile, 'audios');

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuario no autenticado');

      const { data: orgsData } = await supabase
        .rpc('get_user_organizations', { _user_id: userData.user.id });

      if (!orgsData || orgsData.length === 0) {
        throw new Error('No tienes organizaciones asignadas');
      }

      const horaColombia = calcularHoraColombia(formData.hora, adminCplPais);

      const cplData = {
        tipo_lanzamiento: formData.tipo_lanzamiento,
        dia_mes: formData.tipo_lanzamiento === 'recurrente' ? parseInt(formData.dia_mes) : null,
        fecha_lanzamiento: formData.tipo_lanzamiento === 'fecha_unica' ? formData.fecha_lanzamiento : null,
        fecha_inicio: formData.tipo_lanzamiento === 'recurrente' ? formData.fecha_inicio.toLocaleDateString('en-CA') : null,
        fecha_termino: formData.tipo_lanzamiento === 'recurrente' ? formData.fecha_termino.toLocaleDateString('en-CA') : null,
        hora: formData.hora,
        hora_colombia: horaColombia,
        admin_cpl_pais: adminCplPais,
        tipo_cpl: formData.tipo_cpl,
        mensaje_x_dia: formData.mensaje_x_dia || null,
        youtube_url: formData.tipo_cpl.includes('video') ? formData.youtube_url || null : null,
        texto_video: formData.tipo_cpl.includes('video') ? formData.texto_video || null : null,
        imagen_url: formData.tipo_cpl.includes('imagen') ? imagen_url : null,
        imagen_texto: formData.tipo_cpl.includes('imagen') ? formData.imagen_texto || null : null,
        audio_url: formData.tipo_cpl.includes('audio') ? audio_url : null,
        audio_texto: formData.tipo_cpl.includes('audio') ? formData.audio_texto || null : null,
        destinatario_persona_grupo: formData.destinatario_persona_grupo || null,
        estado: formData.estado,
        user_id: userId,
        organization_id: orgsData[0].organization_id
      };

      if (editingCpl) {
        const { error } = await supabase
          .from('cpls_lanzamientos')
          .update(cplData)
          .eq('id', editingCpl.id);

        if (error) throw error;
        toast.success('Lanzamiento actualizado exitosamente');
      } else {
        const { error } = await supabase
          .from('cpls_lanzamientos')
          .insert(cplData);

        if (error) throw error;
        toast.success(isDuplicating ? 'Lanzamiento duplicado exitosamente' : 'Lanzamiento creado exitosamente');
      }

      onSuccess();
    } catch (error: any) {
      toast.error('Error al guardar lanzamiento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getFormTitle = () => {
    if (editingCpl) return 'Editar Lanzamiento';
    if (isDuplicating) return 'Duplicar Lanzamiento';
    return 'Nuevo Lanzamiento';
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          {isDuplicating ? (
            <Copy className="h-5 w-5 text-green-400" />
          ) : (
            <Rocket className="h-5 w-5 text-purple-400" />
          )}
          {getFormTitle()}
          {isDuplicating && (
            <span className="text-sm font-normal text-green-400 ml-2">
              (Copia del lanzamiento original)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Tipo de Programación */}
          <div className="space-y-3">
            <Label className="text-gray-200 text-base font-semibold">Tipo de Programación</Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, tipo_lanzamiento: 'recurrente', fecha_lanzamiento: '' }))}
                className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                  formData.tipo_lanzamiento === 'recurrente'
                    ? 'border-purple-500 bg-purple-900/40 text-purple-300'
                    : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
                }`}
              >
                🔄 Recurrente (cada mes)
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, tipo_lanzamiento: 'fecha_unica', dia_mes: '' }))}
                className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                  formData.tipo_lanzamiento === 'fecha_unica'
                    ? 'border-blue-500 bg-blue-900/40 text-blue-300'
                    : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
                }`}
              >
                📅 Fecha Única
              </button>
            </div>
          </div>

          {/* Campos para Recurrente */}
          {formData.tipo_lanzamiento === 'recurrente' && (
            <div className="space-y-4 p-4 bg-purple-900/20 border border-purple-800 rounded-lg">
              <div className="space-y-2">
                <Label className="text-gray-200">Día del Mes</Label>
                <Select
                  value={formData.dia_mes}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, dia_mes: value }))}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white w-48">
                    <SelectValue placeholder="Selecciona un día" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {DIAS_MES.map((dia) => (
                      <SelectItem key={dia} value={dia.toString()} className="text-white focus:bg-gray-700">
                        Día {dia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">El CPL se enviará este día de cada mes dentro del rango de fechas</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Fecha Inicio de Vigencia</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(formData.fecha_inicio, 'PPP', { locale: es })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border-gray-300">
                      <Calendar
                        mode="single"
                        selected={formData.fecha_inicio}
                        onSelect={(date) => date && setFormData(prev => ({ ...prev, fecha_inicio: date }))}
                        initialFocus
                        className="bg-white"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Fecha Fin de Vigencia</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(formData.fecha_termino, 'PPP', { locale: es })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border-gray-300">
                      <Calendar
                        mode="single"
                        selected={formData.fecha_termino}
                        onSelect={(date) => date && setFormData(prev => ({ ...prev, fecha_termino: date }))}
                        initialFocus
                        className="bg-white"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}

          {/* Campos para Fecha Única */}
          {formData.tipo_lanzamiento === 'fecha_unica' && (
            <div className="space-y-2 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
              <Label htmlFor="fecha_lanzamiento" className="text-gray-200">Fecha de Lanzamiento</Label>
              <Input
                id="fecha_lanzamiento"
                type="date"
                value={formData.fecha_lanzamiento}
                onChange={(e) => setFormData(prev => ({ ...prev, fecha_lanzamiento: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white w-56"
              />
              <p className="text-xs text-gray-400">El CPL se enviará únicamente en esta fecha</p>
            </div>
          )}

          {/* Hora y Estado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hora" className="text-gray-200">Hora de Envío</Label>
              <Input
                id="hora"
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData(prev => ({ ...prev, hora: e.target.value }))}
                required
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-200">Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) => setFormData(prev => ({ ...prev, estado: value }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {ESTADOS_CPL.map((estado) => (
                    <SelectItem key={estado.id} value={estado.id} className="text-white focus:bg-gray-700">
                      {estado.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tipo CPL */}
          <div className="space-y-2">
            <Label className="text-gray-200">Tipo de CPL</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {TIPOS_CPL.map((tipo) => (
                <div key={tipo.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`lanz-${tipo.id}`}
                    checked={formData.tipo_cpl.includes(tipo.id)}
                    onCheckedChange={(checked) => handleTipoCplChange(tipo.id, checked as boolean)}
                    className="border-gray-600 text-blue-600"
                  />
                  <Label htmlFor={`lanz-${tipo.id}`} className="text-gray-200">
                    {tipo.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Mensaje */}
          {formData.tipo_cpl.includes('texto') && (
            <div className="space-y-2">
              <Label htmlFor="lanz-mensaje" className="text-gray-200">Mensaje</Label>
              <Textarea
                id="lanz-mensaje"
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
                <Label htmlFor="lanz-youtube_url" className="text-gray-200">URL de Google Drive (CPL Video)</Label>
                <Input
                  id="lanz-youtube_url"
                  value={formData.youtube_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, youtube_url: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="https://drive.google.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lanz-texto_video" className="text-gray-200">Texto del Video</Label>
                <Textarea
                  id="lanz-texto_video"
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
                <Label htmlFor="lanz-imagen" className="text-gray-200">
                  Imagen
                  {(duplicatingCpl?.imagen_url || editingCpl?.imagen_url) && (
                    <span className="text-sm text-gray-400 ml-2">
                      (Opcional - se mantendrá la imagen actual si no seleccionas una nueva)
                    </span>
                  )}
                </Label>
                <Input
                  id="lanz-imagen"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImagenFile(e.target.files?.[0] || null)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
                {(duplicatingCpl?.imagen_url || editingCpl?.imagen_url) && (
                  <p className="text-xs text-green-400">
                    ✓ Imagen actual disponible - selecciona un archivo solo si quieres cambiarla
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lanz-imagen_texto" className="text-gray-200">Texto de la Imagen</Label>
                <Textarea
                  id="lanz-imagen_texto"
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
                <Label htmlFor="lanz-audio" className="text-gray-200">
                  Audio
                  {(duplicatingCpl?.audio_url || editingCpl?.audio_url) && (
                    <span className="text-sm text-gray-400 ml-2">
                      (Opcional - se mantendrá el audio actual si no seleccionas uno nuevo)
                    </span>
                  )}
                </Label>
                <Input
                  id="lanz-audio"
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
                {(duplicatingCpl?.audio_url || editingCpl?.audio_url) && (
                  <p className="text-xs text-green-400">
                    ✓ Audio actual disponible - selecciona un archivo solo si quieres cambiarlo
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lanz-audio_texto" className="text-gray-200">Texto del Audio</Label>
                <Textarea
                  id="lanz-audio_texto"
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

          {formData.estado === 'pausado' && (
            <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3">
              <p className="text-orange-300 text-sm">
                <strong>Nota:</strong> Este lanzamiento se creará en estado pausado y no se enviará hasta que sea activado.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? 'Guardando...' : isDuplicating ? 'Duplicar Lanzamiento' : editingCpl ? 'Actualizar Lanzamiento' : 'Guardar Lanzamiento'}
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

export default CplLanzamientoForm;
