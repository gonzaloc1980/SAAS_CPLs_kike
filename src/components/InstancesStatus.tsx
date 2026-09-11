import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

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
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

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
      setLastRefresh(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInstances();
    const interval = setInterval(fetchInstances, INSTANCES_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchInstances]);

  if (loading) {
    return <div className="text-gray-400 text-center py-8">Cargando estado de instancias...</div>;
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
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold text-white">Estado de instancias de WhatsApp</h2>
          <p className="text-sm text-gray-400">
            Todas las organizaciones · se actualiza solo cada 60s
            {lastRefresh && ` · última actualización ${lastRefresh.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' })}`}
          </p>
        </div>
        <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-800" onClick={fetchInstances}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar ahora
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-3">
            <div className="text-gray-400 text-xs uppercase tracking-wide">Total instancias</div>
            <div className="text-2xl font-bold text-white mt-1">{(instances || []).length}</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-green-400 text-xs uppercase tracking-wide">
              <Wifi className="h-3.5 w-3.5" /> Conectadas
            </div>
            <div className="text-2xl font-bold text-white mt-1">{conectadas.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-red-400 text-xs uppercase tracking-wide">
              <WifiOff className="h-3.5 w-3.5" /> Desconectadas
            </div>
            <div className="text-2xl font-bold text-white mt-1">{desconectadas.length}</div>
          </CardContent>
        </Card>
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

      {conectadas.length > 0 && (
        <details className="text-sm text-gray-400">
          <summary className="cursor-pointer hover:text-gray-300">Ver las {conectadas.length} conectadas</summary>
          <div className="space-y-2 mt-2">
            {conectadas.map((i) => (
              <Card key={i.name} className="bg-gray-900 border-gray-800">
                <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <Wifi className="h-4 w-4 text-green-400 shrink-0" />
                    <span className="text-white text-sm font-medium truncate">{i.name}</span>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{i.messageCount.toLocaleString('es-CO')} mensajes</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

export default InstancesStatus;
