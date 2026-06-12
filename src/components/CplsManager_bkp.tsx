import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Calendar, Clock, Users, Filter, X, Copy } from 'lucide-react';
import { toast } from 'sonner';
import CplForm from './CplForm';
import { useOrganization } from '@/contexts/OrganizationContext';

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
  const { selectedOrganization } = useOrganization();
  const [cpls, setCpls] = useState<Cpl[]>([]);
  const [filteredCpls, setFilteredCpls] = useState<Cpl[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCpl, setEditingCpl] = useState<Cpl | null>(null);
  const [duplicatingCpl, setDuplicatingCpl] = useState<Cpl | null>(null);
  const [selectedGrupoFilter, setSelectedGrupoFilter] = useState<string>('todos');

  // Función para obtener el número del día de la semana
  const getDayNumber = (dayName: string): number => {
    const days = {
      'Domingo': 0,
      'Lunes': 1,
      'Martes': 2,
      'Miércoles': 3,
      'Jueves': 4,
      'Viernes': 5,
      'Sábado': 6
    };
    return days[dayName as keyof typeof days] || 0;
  };

  // Función para filtrar CPLs por grupo
  const filterCplsByGroup = (cplList: Cpl[], grupoFilter: string): Cpl[] => {
    if (grupoFilter === 'todos') {
      return cplList;
    }
    return cplList.filter(cpl => cpl.destinatario_persona_grupo === grupoFilter);
  };

  // Efecto para actualizar CPLs filtrados cuando cambia el filtro o los CPLs
  useEffect(() => {
    const filtered = filterCplsByGroup(cpls, selectedGrupoFilter);
    const sorted = sortCplsByDayAndTime(filtered);
    setFilteredCpls(sorted);
  }, [cpls, selectedGrupoFilter]);
  
  const sortCplsByDayAndTime = (cplList: Cpl[]): Cpl[] => {
    return [...cplList].sort((a, b) => {
      const dayA = getDayNumber(a.dia_semana);
      const dayB = getDayNumber(b.dia_semana);
      
      // Primero ordenar por día de la semana
      if (dayA !== dayB) {
        return dayA - dayB;
      }
      
      // Si es el mismo día, ordenar por hora
      const timeA = a.hora;
      const timeB = b.hora;
      
      return timeA.localeCompare(timeB);
    });
  };

  useEffect(() => {
    if (selectedOrganization) {
      fetchCpls();
      fetchGrupos();
    }
  }, [userId, selectedOrganization]);

  const fetchCpls = async () => {
    if (!selectedOrganization) return;
    
    try {
      const { data, error } = await supabase
        .from('cpls')
        .select('*')
        .eq('organization_id', selectedOrganization.id);

      if (error) throw error;
      
      setCpls(data || []);
    } catch (error: any) {
      toast.error('Error al cargar CPLs: ' + error.message);
    }
  };

  const fetchGrupos = async () => {
    if (!selectedOrganization) return;
    
    try {
      const { data, error } = await supabase
        .from('grupos')
        .select('*')
        .eq('organization_id', selectedOrganization.id)
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
    setDuplicatingCpl(null);
    setShowForm(true);
  };

  const handleDuplicate = (cpl: Cpl) => {
    // Crear una copia del CPL sin el ID para que se cree uno nuevo
    const cplCopy = {
      ...cpl,
      id: '', // Limpiamos el ID para que se genere uno nuevo
      created_at: '' // Limpiamos la fecha de creación
    };
    setDuplicatingCpl(cplCopy);
    setEditingCpl(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
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

  // Función para agrupar CPLs por día de la semana
  const groupCplsByDay = (cplList: Cpl[]) => {
    const grouped = cplList.reduce((acc, cpl) => {
      const day = cpl.dia_semana;
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(cpl);
      return acc;
    }, {} as Record<string, Cpl[]>);

    // Ordenar cada grupo por hora
    Object.keys(grouped).forEach(day => {
      grouped[day].sort((a, b) => a.hora.localeCompare(b.hora));
    });

    return grouped;
  };

  const groupedCpls = groupCplsByDay(filteredCpls);
  const daysOrder = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // Obtener el nombre del grupo seleccionado para mostrar en el filtro
  const getSelectedGrupoName = () => {
    if (selectedGrupoFilter === 'todos') return 'Todos los grupos';
    const grupo = grupos.find(g => g.id_grupo === selectedGrupoFilter);
    return grupo?.nombre || 'Grupo no encontrado';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Gestión de CPLs</h2>
        {selectedOrganization && (
          <Button
            onClick={() => {
              setEditingCpl(null);
              setDuplicatingCpl(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo CPL
          </Button>
        )}
      </div>

      {/* Filtro por grupo */}
      {selectedOrganization && grupos.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Filtrar por grupo:</span>
              </div>
              <div className="flex-1 max-w-xs">
                <Select value={selectedGrupoFilter} onValueChange={setSelectedGrupoFilter}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Seleccionar grupo" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="todos" className="text-white hover:bg-gray-700">
                      Todos los grupos
                    </SelectItem>
                    {grupos.map((grupo) => (
                      <SelectItem 
                        key={grupo.id} 
                        value={grupo.id_grupo || ''}
                        className="text-white hover:bg-gray-700"
                      >
                        {grupo.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedGrupoFilter !== 'todos' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedGrupoFilter('todos')}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
            {selectedGrupoFilter !== 'todos' && (
              <div className="mt-2 text-sm text-blue-400">
                Mostrando CPLs para: <strong>{getSelectedGrupoName()}</strong>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showForm && (
        <CplForm
          userId={userId}
          grupos={grupos}
          editingCpl={editingCpl}
          duplicatingCpl={duplicatingCpl}
          onClose={() => {
            setShowForm(false);
            setEditingCpl(null);
            setDuplicatingCpl(null);
          }}
          onSuccess={() => {
            fetchCpls();
            setShowForm(false);
            setEditingCpl(null);
            setDuplicatingCpl(null);
          }}
        />
      )}

      <div className="space-y-6">
        {!selectedOrganization ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="text-center py-8">
              <p className="text-gray-400">Selecciona una organización para ver los CPLs.</p>
            </CardContent>
          </Card>
        ) : filteredCpls.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="text-center py-8">
              <p className="text-gray-400">
                {selectedGrupoFilter === 'todos' 
                  ? 'No hay CPLs creados en esta organización.' 
                  : `No hay CPLs para el grupo "${getSelectedGrupoName()}".`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          daysOrder.map((day) => {
            if (!groupedCpls[day] || groupedCpls[day].length === 0) return null;
            
            return (
              <div key={day} className="space-y-3">
                <h3 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">
                  {day}
                </h3>
                <div className="grid gap-4">
                  {groupedCpls[day].map((cpl) => (
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
                                  {new Date(cpl.fecha_inicio + 'T00:00:00').toLocaleDateString()} - {' '}
                                  {new Date(cpl.fecha_termino + 'T00:00:00').toLocaleDateString()}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2 text-gray-300">
                                <Clock className="h-4 w-4" />
                                <span className="font-medium">{cpl.dia_semana} a las {cpl.hora}</span>
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
                              onClick={() => handleDuplicate(cpl)}
                              className="border-green-700 text-green-400 hover:bg-green-900"
                              title="Duplicar CPL"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(cpl)}
                              className="border-gray-700 text-gray-300 hover:bg-gray-800"
                              title="Editar CPL"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-700 text-red-400 hover:bg-red-900"
                                  title="Eliminar CPL"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-gray-900 border-gray-700">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white flex items-center gap-2">
                                    <Trash2 className="h-5 w-5 text-red-400" />
                                    Confirmar eliminación
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-gray-300">
                                    ¿Estás seguro de que deseas eliminar este CPL? Esta acción no se puede deshacer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700">
                                    Cancelar
                                  </AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(cpl.id)}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CplsManager;