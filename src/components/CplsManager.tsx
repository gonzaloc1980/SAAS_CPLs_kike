
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Calendar, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import CplForm from './CplForm';

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
  created_at: string;
}

interface Grupo {
  id: string;
  nombre: string;
  id_grupo: string | null;
  estado: string;
}

interface CplsManagerProps {
  userId: string;
}

const CplsManager = ({ userId }: CplsManagerProps) => {
  const [cpls, setCpls] = useState<Cpl[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCpl, setEditingCpl] = useState<Cpl | null>(null);

  useEffect(() => {
    fetchCpls();
    fetchGrupos();
  }, [userId]);

  const fetchCpls = async () => {
    try {
      const { data, error } = await supabase
        .from('cpls')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCpls(data || []);
    } catch (error: any) {
      toast.error('Error al cargar CPLs: ' + error.message);
    }
  };

  const fetchGrupos = async () => {
    try {
      const { data, error } = await supabase
        .from('grupos')
        .select('*')
        .eq('user_id', userId)
        .eq('estado', 'Creado')
        .order('nombre');

      if (error) throw error;
      setGrupos(data || []);
    } catch (error: any) {
      toast.error('Error al cargar grupos: ' + error.message);
    }
  };

  const handleEdit = (cpl: Cpl) => {
    setEditingCpl(cpl);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este CPL?')) return;

    try {
      const { error } = await supabase
        .from('cpls')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('CPL eliminado exitosamente');
      fetchCpls();
    } catch (error: any) {
      toast.error('Error al eliminar CPL: ' + error.message);
    }
  };

  const getGrupoNombre = (idGrupo: string | null) => {
    if (!idGrupo) return 'Sin grupo';
    const grupo = grupos.find(g => g.id_grupo === idGrupo);
    return grupo?.nombre || 'Grupo no encontrado';
  };

  const formatTipoCpl = (tipos: string[]) => {
    const tipoNames = {
      texto: 'Texto',
      video: 'Video',
      imagen: 'Imagen',
      audio: 'Audio'
    };
    return tipos.map(tipo => tipoNames[tipo as keyof typeof tipoNames]).join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Gestión de CPLs</h2>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo CPL
        </Button>
      </div>

      {showForm && (
        <CplForm
          userId={userId}
          grupos={grupos}
          editingCpl={editingCpl}
          onClose={() => {
            setShowForm(false);
            setEditingCpl(null);
          }}
          onSuccess={() => {
            fetchCpls();
            setShowForm(false);
            setEditingCpl(null);
          }}
        />
      )}

      <div className="grid gap-4">
        {cpls.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="text-center py-8">
              <p className="text-gray-400">No tienes CPLs creados aún.</p>
            </CardContent>
          </Card>
        ) : (
          cpls.map((cpl) => (
            <Card key={cpl.id} className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {cpl.tipo_cpl.map((tipo) => (
                        <Badge
                          key={tipo}
                          variant="secondary"
                          className="bg-blue-600 text-white"
                        >
                          {tipo}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(cpl.fecha_inicio).toLocaleDateString()} - {' '}
                          {new Date(cpl.fecha_termino).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-300">
                        <Clock className="h-4 w-4" />
                        <span>{cpl.dia_semana} a las {cpl.hora}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-300">
                        <Users className="h-4 w-4" />
                        <span>{getGrupoNombre(cpl.destinatario_persona_grupo)}</span>
                      </div>
                    </div>

                    {cpl.mensaje_x_dia && (
                      <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-300">{cpl.mensaje_x_dia}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(cpl)}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(cpl.id)}
                      className="border-red-700 text-red-400 hover:bg-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default CplsManager;
