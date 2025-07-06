
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Grupo {
  id: string;
  nombre: string;
  id_grupo: string | null;
  estado: string;
  created_at: string;
}

interface GruposManagerProps {
  userId: string;
}

const GruposManager = ({ userId }: GruposManagerProps) => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState<Grupo | null>(null);
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchGrupos();
  }, [userId]);

  const fetchGrupos = async () => {
    try {
      const { data, error } = await supabase
        .from('grupos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGrupos(data || []);
    } catch (error: any) {
      toast.error('Error al cargar grupos: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setLoading(true);
    try {
      if (editingGrupo) {
        const { error } = await supabase
          .from('grupos')
          .update({ nombre })
          .eq('id', editingGrupo.id);

        if (error) throw error;
        toast.success('Grupo actualizado exitosamente');
      } else {
        const { data, error } = await supabase
          .from('grupos')
          .insert({
            nombre,
            user_id: userId,
            estado: 'Creando...'
          })
          .select()
          .single();

        if (error) throw error;
        
        // Llamar al webhook después de crear el grupo exitosamente
        try {
          await fetch('https://agendador-n8n.6qgqpv.easypanel.host/webhook/f548d0ac-d7d1-4667-84ea-99b5640aba24', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: userId,
              id: data.id
            }),
          });
        } catch (webhookError) {
          console.error('Error al llamar al webhook:', webhookError);
          // No mostramos error al usuario para no interrumpir el flujo
        }
        
        toast.success('Grupo creado exitosamente');
        
        // Hacer refresh automático después de 20 segundos
        setTimeout(() => {
          fetchGrupos();
          toast.info('Actualizando estado de grupos...');
        }, 20000);
      }

      resetForm();
      fetchGrupos();
    } catch (error: any) {
      toast.error('Error al guardar grupo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (grupo: Grupo) => {
    setEditingGrupo(grupo);
    setNombre(grupo.nombre);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este grupo?')) return;

    try {
      const { error } = await supabase
        .from('grupos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Grupo eliminado exitosamente');
      fetchGrupos();
    } catch (error: any) {
      toast.error('Error al eliminar grupo: ' + error.message);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingGrupo(null);
    setNombre('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Gestión de Grupos</h2>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Grupo
        </Button>
      </div>

      {showForm && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">
              {editingGrupo ? 'Editar Grupo' : 'Nuevo Grupo'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre" className="text-gray-200">Nombre del Grupo</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Ingresa el nombre del grupo"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {grupos.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="text-center py-8">
              <p className="text-gray-400">No tienes grupos creados aún.</p>
            </CardContent>
          </Card>
        ) : (
          grupos.map((grupo) => (
            <Card key={grupo.id} className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {grupo.nombre}
                    </h3>
                     <div className="flex flex-wrap gap-2 mb-2">
                       <Badge
                         variant={grupo.estado === 'Creado' ? 'default' : 'secondary'}
                         className={
                           grupo.estado === 'Creado'
                             ? 'bg-green-600 text-white'
                             : grupo.estado === 'Creando...'
                             ? 'bg-yellow-600 text-white'
                             : 'bg-gray-600 text-gray-200'
                         }
                       >
                         {grupo.estado}
                       </Badge>
                     </div>
                    <p className="text-sm text-gray-400">
                      Creado: {new Date(grupo.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(grupo)}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(grupo.id)}
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

export default GruposManager;
