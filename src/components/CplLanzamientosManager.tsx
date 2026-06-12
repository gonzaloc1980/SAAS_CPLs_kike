import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Calendar, Clock, Users, Filter, X, Copy, Pause, Play, Rocket, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import CplLanzamientoForm from './CplLanzamientoForm';
import { useOrganization } from '@/contexts/OrganizationContext';

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
  created_at: string;
}

interface Grupo {
  id: string;
  nombre: string;
  id_grupo: string | null;
  estado: string;
}

interface CplLanzamientosManagerProps {
  userId: string;
}

const CplLanzamientosManager = ({ userId }: CplLanzamientosManagerProps) => {
  const { selectedOrganization } = useOrganization();
  const [lanzamientos, setLanzamientos] = useState<CplLanzamiento[]>([]);
  const [filteredLanzamientos, setFilteredLanzamientos] = useState<CplLanzamiento[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCpl, setEditingCpl] = useState<CplLanzamiento | null>(null);
  const [duplicatingCpl, setDuplicatingCpl] = useState<CplLanzamiento | null>(null);
  const [selectedGrupoFilter, setSelectedGrupoFilter] = useState<string>('todos');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');

  const formRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () => {
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
      }
    }, 100);
  };

  const filterLanzamientos = (list: CplLanzamiento[], grupoFilter: string, estadoFilterValue: string, tipoFilterValue: string): CplLanzamiento[] => {
    let filtered = list;
    if (grupoFilter !== 'todos') {
      filtered = filtered.filter(l => l.destinatario_persona_grupo === grupoFilter);
    }
    if (estadoFilterValue !== 'todos') {
      filtered = filtered.filter(l => l.estado === estadoFilterValue);
    }
    if (tipoFilterValue !== 'todos') {
      filtered = filtered.filter(l => l.tipo_lanzamiento === tipoFilterValue);
    }
    return filtered;
  };

  useEffect(() => {
    const filtered = filterLanzamientos(lanzamientos, selectedGrupoFilter, estadoFilter, tipoFilter);
    setFilteredLanzamientos(filtered);
  }, [lanzamientos, selectedGrupoFilter, estadoFilter, tipoFilter]);

  useEffect(() => {
    if (selectedOrganization) {
      fetchLanzamientos();
      fetchGrupos();
    }
  }, [userId, selectedOrganization]);

  const fetchLanzamientos = async () => {
    if (!selectedOrganization) return;
    try {
      const { data, error } = await supabase
        .from('cpls_lanzamientos')
        .select('*')
        .eq('organization_id', selectedOrganization.id);

      if (error) throw error;
      setLanzamientos(data || []);
    } catch (error: any) {
      toast.error('Error al cargar lanzamientos: ' + error.message);
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

  const handleEdit = (lanzamiento: CplLanzamiento) => {
    setEditingCpl(lanzamiento);
    setDuplicatingCpl(null);
    setShowForm(true);
    scrollToForm();
  };

  const handleDuplicate = (lanzamiento: CplLanzamiento) => {
    setDuplicatingCpl({ ...lanzamiento, id: '', created_at: '' });
    setEditingCpl(null);
    setShowForm(true);
    scrollToForm();
  };

  const handleToggleEstado = async (lanzamiento: CplLanzamiento) => {
    const nuevoEstado = lanzamiento.estado === 'activo' ? 'pausado' : 'activo';
    try {
      const { error } = await supabase
        .from('cpls_lanzamientos')
        .update({ estado: nuevoEstado })
        .eq('id', lanzamiento.id);

      if (error) throw error;
      toast.success(`Lanzamiento ${nuevoEstado === 'activo' ? 'activado' : 'pausado'} exitosamente`);
      fetchLanzamientos();
    } catch (error: any) {
      toast.error(`Error al ${nuevoEstado === 'activo' ? 'activar' : 'pausar'} lanzamiento: ` + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cpls_lanzamientos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Lanzamiento eliminado exitosamente');
      fetchLanzamientos();
    } catch (error: any) {
      toast.error('Error al eliminar lanzamiento: ' + error.message);
    }
  };

  const getGrupoNombre = (idGrupo: string | null) => {
    if (!idGrupo) return 'Sin grupo';
    const grupo = grupos.find(g => g.id_grupo === idGrupo);
    return grupo?.nombre || 'Grupo no encontrado';
  };

  const getSelectedGrupoName = () => {
    if (selectedGrupoFilter === 'todos') return 'Todos los grupos';
    const grupo = grupos.find(g => g.id_grupo === selectedGrupoFilter);
    return grupo?.nombre || 'Grupo no encontrado';
  };

  const getEstadisticas = () => {
    const total = lanzamientos.length;
    const activos = lanzamientos.filter(l => l.estado === 'activo').length;
    const pausados = lanzamientos.filter(l => l.estado === 'pausado').length;
    const recurrentes = lanzamientos.filter(l => l.tipo_lanzamiento === 'recurrente').length;
    const fechasUnicas = lanzamientos.filter(l => l.tipo_lanzamiento === 'fecha_unica').length;
    return { total, activos, pausados, recurrentes, fechasUnicas };
  };

  const estadisticas = getEstadisticas();

  // Separar y agrupar lanzamientos
  const recurrentes = filteredLanzamientos
    .filter(l => l.tipo_lanzamiento === 'recurrente')
    .sort((a, b) => (a.dia_mes ?? 0) - (b.dia_mes ?? 0) || a.hora.localeCompare(b.hora));

  const fechasUnicas = filteredLanzamientos
    .filter(l => l.tipo_lanzamiento === 'fecha_unica')
    .sort((a, b) => (a.fecha_lanzamiento ?? '').localeCompare(b.fecha_lanzamiento ?? '') || a.hora.localeCompare(b.hora));

  // Agrupar recurrentes por dia_mes
  const groupedRecurrentes = recurrentes.reduce((acc, l) => {
    const key = (l.dia_mes ?? 0).toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(l);
    return acc;
  }, {} as Record<string, CplLanzamiento[]>);

  const diasMesOrdenados = Object.keys(groupedRecurrentes).sort((a, b) => parseInt(a) - parseInt(b));

  const formatScheduleLabel = (l: CplLanzamiento) => {
    if (l.tipo_lanzamiento === 'recurrente') {
      return `Día ${l.dia_mes} de cada mes a las ${l.hora}`;
    }
    if (l.fecha_lanzamiento) {
      const fecha = new Date(l.fecha_lanzamiento + 'T00:00:00');
      return `${fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} a las ${l.hora}`;
    }
    return `a las ${l.hora}`;
  };

  const renderLanzamientoCard = (lanzamiento: CplLanzamiento) => (
    <Card
      key={lanzamiento.id}
      className={`border-gray-800 ${lanzamiento.estado === 'pausado' ? 'bg-gray-800 opacity-75' : 'bg-gray-900'}`}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-3">
              {lanzamiento.tipo_cpl.map((tipo) => (
                <Badge key={tipo} variant="secondary" className="bg-purple-700 text-white">
                  {tipo}
                </Badge>
              ))}
              <Badge
                className={lanzamiento.estado === 'activo' ? 'bg-[#1D4ED8] text-white' : 'bg-orange-600 text-white'}
              >
                {lanzamiento.estado === 'activo' ? 'Activo' : 'Pausado'}
              </Badge>
              <Badge className={lanzamiento.tipo_lanzamiento === 'recurrente' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}>
                {lanzamiento.tipo_lanzamiento === 'recurrente' ? '🔄 Recurrente' : '📅 Fecha Única'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {/* Fecha/rango */}
              <div className="flex items-center gap-2 text-gray-300">
                <Calendar className="h-4 w-4" />
                {lanzamiento.tipo_lanzamiento === 'recurrente' && lanzamiento.fecha_inicio && lanzamiento.fecha_termino ? (
                  <span>
                    {new Date(lanzamiento.fecha_inicio + 'T00:00:00').toLocaleDateString()} -{' '}
                    {new Date(lanzamiento.fecha_termino + 'T00:00:00').toLocaleDateString()}
                  </span>
                ) : lanzamiento.tipo_lanzamiento === 'fecha_unica' && lanzamiento.fecha_lanzamiento ? (
                  <span>{new Date(lanzamiento.fecha_lanzamiento + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                ) : (
                  <span className="text-gray-500">Sin fecha</span>
                )}
              </div>

              {/* Horario */}
              <div className="flex items-center gap-2 text-gray-300">
                <Clock className="h-4 w-4" />
                <span className="font-medium">{formatScheduleLabel(lanzamiento)}</span>
              </div>

              {/* Grupo */}
              <div className="flex items-center gap-2 text-gray-300">
                <Users className="h-4 w-4" />
                <span>{getGrupoNombre(lanzamiento.destinatario_persona_grupo)}</span>
              </div>
            </div>

            {lanzamiento.mensaje_x_dia && (
              <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-300">{lanzamiento.mensaje_x_dia}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 ml-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleToggleEstado(lanzamiento)}
              className={lanzamiento.estado === 'activo'
                ? 'border-orange-700 text-orange-400 hover:bg-orange-900'
                : 'border-green-700 text-green-400 hover:bg-green-900'}
              title={lanzamiento.estado === 'activo' ? 'Pausar' : 'Activar'}
            >
              {lanzamiento.estado === 'activo' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDuplicate(lanzamiento)}
              className="border-green-700 text-green-400 hover:bg-green-900"
              title="Duplicar"
            >
              <Copy className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleEdit(lanzamiento)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
              title="Editar"
            >
              <Edit className="h-4 w-4" />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-red-700 text-red-400 hover:bg-red-900" title="Eliminar">
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
                    ¿Estás seguro de que deseas eliminar este lanzamiento? Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700">
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(lanzamiento.id)}
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
  );

  const hasResults = recurrentes.length > 0 || fechasUnicas.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Rocket className="h-6 w-6 text-purple-400" />
            CPLs Lanzamientos
          </h2>
          {selectedOrganization && (
            <div className="flex gap-4 mt-2 flex-wrap">
              <span className="text-sm text-gray-300">
                Total: <span className="font-semibold text-blue-400">{estadisticas.total}</span>
              </span>
              <span className="text-sm text-gray-300">
                Activos: <span className="font-semibold text-green-400">{estadisticas.activos}</span>
              </span>
              <span className="text-sm text-gray-300">
                Pausados: <span className="font-semibold text-orange-400">{estadisticas.pausados}</span>
              </span>
              <span className="text-sm text-gray-300">
                Recurrentes: <span className="font-semibold text-purple-400">{estadisticas.recurrentes}</span>
              </span>
              <span className="text-sm text-gray-300">
                Fechas únicas: <span className="font-semibold text-blue-400">{estadisticas.fechasUnicas}</span>
              </span>
            </div>
          )}
        </div>
        {selectedOrganization && (
          <Button
            onClick={() => {
              setEditingCpl(null);
              setDuplicatingCpl(null);
              setShowForm(true);
              scrollToForm();
            }}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Lanzamiento
          </Button>
        )}
      </div>

      {/* Filtros */}
      {selectedOrganization && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Filtros:</span>
              </div>

              {/* Filtro por tipo */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Tipo:</span>
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white w-44">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="todos" className="text-white hover:bg-gray-700">Todos</SelectItem>
                    <SelectItem value="recurrente" className="text-white hover:bg-gray-700">Recurrentes</SelectItem>
                    <SelectItem value="fecha_unica" className="text-white hover:bg-gray-700">Fechas únicas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por grupo */}
              {grupos.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Grupo:</span>
                  <Select value={selectedGrupoFilter} onValueChange={setSelectedGrupoFilter}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white w-48">
                      <SelectValue placeholder="Seleccionar grupo" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="todos" className="text-white hover:bg-gray-700">Todos los grupos</SelectItem>
                      {grupos.map((grupo) => (
                        <SelectItem key={grupo.id} value={grupo.id_grupo || ''} className="text-white hover:bg-gray-700">
                          {grupo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Filtro por estado */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Estado:</span>
                <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white w-40">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="todos" className="text-white hover:bg-gray-700">Todos</SelectItem>
                    <SelectItem value="activo" className="text-white hover:bg-gray-700">Activos</SelectItem>
                    <SelectItem value="pausado" className="text-white hover:bg-gray-700">Pausados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(selectedGrupoFilter !== 'todos' || estadoFilter !== 'todos' || tipoFilter !== 'todos') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedGrupoFilter('todos');
                    setEstadoFilter('todos');
                    setTipoFilter('todos');
                  }}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar filtros
                </Button>
              )}
            </div>

            {(selectedGrupoFilter !== 'todos' || estadoFilter !== 'todos' || tipoFilter !== 'todos') && (
              <div className="mt-3 text-sm text-blue-400 flex flex-wrap gap-3">
                {tipoFilter !== 'todos' && (
                  <span>Tipo: <strong>{tipoFilter === 'recurrente' ? 'Recurrentes' : 'Fechas únicas'}</strong></span>
                )}
                {selectedGrupoFilter !== 'todos' && (
                  <span>Grupo: <strong>{getSelectedGrupoName()}</strong></span>
                )}
                {estadoFilter !== 'todos' && (
                  <span>Estado: <strong>{estadoFilter === 'activo' ? 'Activos' : 'Pausados'}</strong></span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Formulario */}
      {showForm && (
        <div ref={formRef}>
          <CplLanzamientoForm
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
              fetchLanzamientos();
              setShowForm(false);
              setEditingCpl(null);
              setDuplicatingCpl(null);
            }}
          />
        </div>
      )}

      {/* Listado */}
      <div className="space-y-6">
        {!selectedOrganization ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="text-center py-8">
              <p className="text-gray-400">Selecciona una organización para ver los lanzamientos.</p>
            </CardContent>
          </Card>
        ) : !hasResults ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="text-center py-8">
              <p className="text-gray-400">
                {lanzamientos.length === 0
                  ? 'No hay lanzamientos creados en esta organización.'
                  : 'No se encontraron lanzamientos con los filtros aplicados.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Sección: Recurrentes */}
            {recurrentes.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white border-b border-purple-700 pb-2 flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-purple-400" />
                  Lanzamientos Recurrentes
                </h3>
                {diasMesOrdenados.map((diaKey) => (
                  <div key={diaKey} className="space-y-3">
                    <h4 className="text-lg font-medium text-purple-300 pl-2 border-l-2 border-purple-600">
                      Día {diaKey} de cada mes
                    </h4>
                    <div className="grid gap-4 pl-2">
                      {groupedRecurrentes[diaKey].map(renderLanzamientoCard)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sección: Fechas Únicas */}
            {fechasUnicas.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white border-b border-blue-700 pb-2 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-400" />
                  Lanzamientos de Fecha Única
                </h3>
                <div className="grid gap-4">
                  {fechasUnicas.map(renderLanzamientoCard)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CplLanzamientosManager;
