import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, CheckCircle2, XCircle, AlertTriangle, Hourglass, TimerOff, Wifi, WifiOff } from 'lucide-react';

interface InstanceStatus {
  name: string;
  connectionStatus: string;
  messageCount: number;
  disconnectionAt: string | null;
  updatedAt: string | null;
}

const INSTANCES_REFRESH_MS = 60000;

const formatearFechaRelativa = (iso: string | null) => {
  if (!iso) return null;
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'hace 1 día';
  return `hace ${dias} días`;
};

const InstancesStatus = () => {
  const [instances, setInstances] = useState<InstanceStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInstances = useCallback(async () => {
    const { data, error: invokeError } = await supabase.functions.invoke<any>('evolution-instances-status');
    if (invokeError) {
      setError('No se pudo cargar el estado de las instancias.');
      console.error('Error cargando instancias:', invokeError);
    } else if (data?.error) {
      setError(data.error);
    } else {
      const list: InstanceStatus[] = data?.instances || [];
      setInstances(list);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInstances();
    const interval = setInterval(fetchInstances, INSTANCES_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchInstances]);

  if (loading) {
    return <div className="text-gray-400 text-sm py-4">Cargando estado de instancias...</div>;
  }

  if (error) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4 text-sm text-red-400">{error}</CardContent>
      </Card>
    );
  }

  const desconectadas = (instances || [])
    .filter((i) => i.connectionStatus !== 'open')
    .sort((a, b) => b.messageCount - a.messageCount);
  const conectadas = (instances || []).filter((i) => i.connectionStatus === 'open');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Estado de instancias de WhatsApp</h3>
        <span className="text-xs text-gray-500">
          {conectadas.length} conectadas · {desconectadas.length} desconectadas de {(instances || []).length} totales
        </span>
      </div>

      {desconectadas.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4 text-sm text-green-400 flex items-center gap-2">
            <Wifi className="h-4 w-4" /> Todas las instancias están conectadas.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {desconectadas.map((i) => (
            <Card key={i.name} className="bg-gray-900 border-gray-800">
              <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <WifiOff className="h-4 w-4 text-red-400 shrink-0" />
                  <span className="text-white text-sm font-medium truncate">{i.name}</span>
                  {i.messageCount > 0 && (
                    <span className="text-xs text-gray-500 whitespace-nowrap">{i.messageCount.toLocaleString('es-CO')} mensajes históricos</span>
                  )}
                </div>
                <Badge className="bg-red-900/40 text-red-300 border border-red-700 whitespace-nowrap">
                  Desconectada {formatearFechaRelativa(i.disconnectionAt) ? `· ${formatearFechaRelativa(i.disconnectionAt)}` : ''}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

interface CplMonitorRow {
  id: string;
  hora_colombia: string;
  tipo_cpl: string[];
  mensaje_x_dia: string | null;
  imagen_texto: string | null;
  texto_video: string | null;
  audio_texto: string | null;
  destinatario_persona_grupo: string | null;
  estado: string;
  ultimo_resultado: string | null;
  ultimo_motivo: string | null;
  ultimo_intento_at: string | null;
  ultimo_envio_fecha: string | null;
  organization_id: string;
  organizations: { name: string } | null;
}

type EstadoCalculado = 'enviado' | 'error' | 'saltado' | 'atrasado' | 'pendiente';

const REFRESH_MS = 30000;

const obtenerDiaYFechaBogota = () => {
  const ahora = new Date();
  const diaCrudo = ahora.toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'America/Bogota' });
  const dia = diaCrudo.charAt(0).toUpperCase() + diaCrudo.slice(1);
  const fechaISO = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(ahora); // YYYY-MM-DD
  const horaActual = ahora.toLocaleTimeString('es-ES', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return { dia, fechaISO, horaActual };
};

const calcularEstado = (row: CplMonitorRow, fechaHoyISO: string, horaActual: string): EstadoCalculado => {
  const yaIntentadoHoy = row.ultimo_envio_fecha === fechaHoyISO;
  if (yaIntentadoHoy && row.ultimo_resultado === 'enviado') return 'enviado';
  if (yaIntentadoHoy && row.ultimo_resultado === 'error') return 'error';
  if (yaIntentadoHoy && row.ultimo_resultado === 'saltado') return 'saltado';
  // Todavia no se ha intentado hoy: pendiente si la hora no ha llegado, atrasado si ya paso de largo
  if (row.hora_colombia < horaActual) return 'atrasado';
  return 'pendiente';
};

const ESTADO_CONFIG: Record<EstadoCalculado, { label: string; className: string; icon: JSX.Element }> = {
  enviado: { label: 'Enviado', className: 'bg-green-900/40 text-green-300 border-green-700', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  error: { label: 'Error', className: 'bg-red-900/40 text-red-300 border-red-700', icon: <XCircle className="h-3.5 w-3.5" /> },
  saltado: { label: 'Saltado', className: 'bg-yellow-900/40 text-yellow-300 border-yellow-700', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  atrasado: { label: 'Atrasado', className: 'bg-orange-900/40 text-orange-300 border-orange-700', icon: <TimerOff className="h-3.5 w-3.5" /> },
  pendiente: { label: 'Pendiente', className: 'bg-gray-800 text-gray-300 border-gray-600', icon: <Hourglass className="h-3.5 w-3.5" /> },
};

const CplMonitor = () => {
  const [rows, setRows] = useState<CplMonitorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [orgFilter, setOrgFilter] = useState<string>('todas');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const { dia: diaHoy, fechaISO: fechaHoyISO } = obtenerDiaYFechaBogota();

  const fetchRows = useCallback(async () => {
    const { dia } = obtenerDiaYFechaBogota();
    const { data, error } = await (supabase.from('cpls') as any)
      .select(
        'id, hora_colombia, tipo_cpl, mensaje_x_dia, imagen_texto, texto_video, audio_texto, destinatario_persona_grupo, estado, ultimo_resultado, ultimo_motivo, ultimo_intento_at, ultimo_envio_fecha, organization_id, organizations(name)'
      )
      .eq('dia_semana', dia)
      .eq('estado', 'activo')
      .order('hora_colombia', { ascending: true });

    if (error) {
      console.error('Error cargando monitoreo de CPLs:', error);
    } else {
      setRows((data as unknown as CplMonitorRow[]) || []);
      setLastRefresh(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRows();
    const interval = setInterval(fetchRows, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchRows]);

  const { horaActual } = obtenerDiaYFechaBogota();

  const rowsConEstado = rows.map((r) => ({ ...r, estadoCalc: calcularEstado(r, fechaHoyISO, horaActual) }));

  const organizaciones = Array.from(
    new Map(rows.map((r) => [r.organization_id, r.organizations?.name || '(sin nombre)'])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const filtradas = rowsConEstado.filter((r) => {
    if (orgFilter !== 'todas' && r.organization_id !== orgFilter) return false;
    if (estadoFilter !== 'todos' && r.estadoCalc !== estadoFilter) return false;
    return true;
  });

  const conteo = rowsConEstado.reduce(
    (acc, r) => {
      acc[r.estadoCalc] = (acc[r.estadoCalc] || 0) + 1;
      return acc;
    },
    {} as Record<EstadoCalculado, number>
  );

  const contenidoDe = (r: CplMonitorRow) =>
    r.mensaje_x_dia || r.imagen_texto || r.texto_video || r.audio_texto || '(sin contenido)';

  if (loading) {
    return <div className="text-gray-400 text-center py-8">Cargando monitoreo...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold text-white">Monitoreo de CPLs — Hoy ({diaHoy})</h2>
          <p className="text-sm text-gray-400">
            Todas las organizaciones · se actualiza solo cada 30s
            {lastRefresh && ` · última actualización ${lastRefresh.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' })}`}
          </p>
        </div>
        <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-800" onClick={fetchRows}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar ahora
        </Button>
      </div>

      <InstancesStatus />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['enviado', 'pendiente', 'atrasado', 'error', 'saltado'] as EstadoCalculado[]).map((key) => (
          <Card key={key} className="bg-gray-900 border-gray-800">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide">
                {ESTADO_CONFIG[key].icon}
                {ESTADO_CONFIG[key].label}
              </div>
              <div className="text-2xl font-bold text-white mt-1">{conteo[key] || 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={orgFilter} onValueChange={setOrgFilter}>
          <SelectTrigger className="w-[220px] bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Organización" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="todas" className="text-white focus:bg-gray-700">Todas las organizaciones</SelectItem>
            {organizaciones.map(([id, name]) => (
              <SelectItem key={id} value={id} className="text-white focus:bg-gray-700">{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="todos" className="text-white focus:bg-gray-700">Todos los estados</SelectItem>
            {(Object.keys(ESTADO_CONFIG) as EstadoCalculado[]).map((key) => (
              <SelectItem key={key} value={key} className="text-white focus:bg-gray-700">{ESTADO_CONFIG[key].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtradas.length === 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 text-center text-gray-400">
              No hay CPLs que coincidan con el filtro para hoy.
            </CardContent>
          </Card>
        )}

        {filtradas.map((r) => {
          const cfg = ESTADO_CONFIG[r.estadoCalc];
          return (
            <Card key={r.id} className="bg-gray-900 border-gray-800">
              <CardContent className="p-4 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex items-center gap-1 text-gray-300 text-sm font-mono whitespace-nowrap pt-0.5">
                    <Clock className="h-3.5 w-3.5" />
                    {r.hora_colombia?.slice(0, 5)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium">{r.organizations?.name || '(sin organización)'}</span>
                      <Badge variant="outline" className="border-gray-600 text-gray-300 text-xs">
                        {r.tipo_cpl?.[0] || '—'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400 truncate max-w-xl">{contenidoDe(r)}</p>
                    {r.ultimo_motivo && (
                      <p className="text-xs text-gray-500 mt-1">Motivo: {r.ultimo_motivo}</p>
                    )}
                  </div>
                </div>
                <Badge className={`border ${cfg.className} flex items-center gap-1.5 shrink-0`}>
                  {cfg.icon}
                  {cfg.label}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CplMonitor;
