import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RefreshCw, Wifi, WifiOff, Loader2, Unplug, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [orgNames, setOrgNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const [pendingLogout, setPendingLogout] = useState<InstanceStatus | null>(null);
  const [pendingDelete, setPendingDelete] = useState<InstanceStatus | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchInstances = useCallback(async () => {
    const [instancesRes, orgsRes] = await Promise.all([
      supabase.functions.invoke<any>('evolution-instances-status'),
      supabase.from('organizations').select('name, whatsapp_api_key'),
    ]);

    if (instancesRes.error) {
      setError('No se pudo cargar el estado de las instancias.');
      console.error('Error cargando instancias:', instancesRes.error);
    } else if (instancesRes.data?.error) {
      setError(instancesRes.data.error);
    } else {
      const list: InstanceStatus[] = instancesRes.data?.instances || [];
      setInstances(list);
      setError(null);
      setLastRefresh(new Date());
    }

    if (!orgsRes.error && orgsRes.data) {
      const map: Record<string, string> = {};
      for (const o of orgsRes.data as any[]) {
        if (o.whatsapp_api_key) map[o.whatsapp_api_key] = o.name;
      }
      setOrgNames(map);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInstances();
    const interval = setInterval(fetchInstances, INSTANCES_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchInstances]);

  const runAction = async (action: 'logout' | 'delete', instance: InstanceStatus) => {
    setActionLoading(instance.name);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke<any>('evolution-instance-admin', {
        body: { action, instanceName: instance.name },
      });

      if (invokeError || data?.error) {
        toast.error(data?.error || 'No se pudo completar la acción.');
        return;
      }

      if (action === 'logout') {
        toast.success(`Instancia "${instance.name}" desconectada.`);
      } else if (data.organizationDeleted) {
        const c = data.cascaded || {};
        toast.success(
          `Organización "${data.organizationName}" eliminada junto con ${c.cpls ?? 0} CPLs, ${c.cpls_lanzamientos ?? 0} lanzamientos y ${c.grupos ?? 0} grupos.`
        );
      } else {
        toast.success(`Instancia "${instance.name}" eliminada de Evolution API.`);
      }

      setPendingLogout(null);
      setPendingDelete(null);
      setDeleteConfirmText('');
      fetchInstances();
    } finally {
      setActionLoading(null);
    }
  };

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

  const nombreDe = (i: InstanceStatus) => orgNames[i.name] || i.name;

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
                  <span className="text-white text-sm font-medium truncate">{nombreDe(i)}</span>
                  {orgNames[i.name] && <span className="text-xs text-gray-600">({i.name})</span>}
                  {i.messageCount > 0 && (
                    <span className="text-xs text-gray-500 whitespace-nowrap">{i.messageCount.toLocaleString('es-CO')} mensajes históricos</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className="bg-red-900/40 text-red-300 border border-red-700 whitespace-nowrap">
                    Desconectada {formatearFechaRelativa(i.disconnectionAt) ? `· ${formatearFechaRelativa(i.disconnectionAt)}` : ''}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-700 text-red-400 hover:bg-red-900/30"
                    disabled={actionLoading === i.name}
                    onClick={() => { setDeleteConfirmText(''); setPendingDelete(i); }}
                  >
                    {actionLoading === i.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {conectadas.length > 0 && (
        <details className="text-sm text-gray-400" open>
          <summary className="cursor-pointer hover:text-gray-300">Ver las {conectadas.length} conectadas</summary>
          <div className="space-y-2 mt-2">
            {conectadas.map((i) => (
              <Card key={i.name} className="bg-gray-900 border-gray-800">
                <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <Wifi className="h-4 w-4 text-green-400 shrink-0" />
                    <span className="text-white text-sm font-medium truncate">{nombreDe(i)}</span>
                    {orgNames[i.name] && <span className="text-xs text-gray-600">({i.name})</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-500 whitespace-nowrap">{i.messageCount.toLocaleString('es-CO')} mensajes</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-orange-700 text-orange-400 hover:bg-orange-900/30"
                      disabled={actionLoading === i.name}
                      onClick={() => setPendingLogout(i)}
                    >
                      {actionLoading === i.name ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Unplug className="h-3.5 w-3.5 mr-1.5" />
                          Desconectar
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      )}

      {/* Confirmación: desconectar (logout) - reversible */}
      <AlertDialog open={!!pendingLogout} onOpenChange={(open) => !open && setPendingLogout(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desconectar esta instancia?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {pendingLogout && `"${nombreDe(pendingLogout)}"`} dejará de estar conectada a WhatsApp. El cliente
              deberá volver a escanear el código QR para reconectarse. Mientras tanto, el sistema no le enviará
              mensajes (se detecta como desconectada). Esto NO borra ningún dato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => pendingLogout && runAction('logout', pendingLogout)}
            >
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmación: eliminar - IRREVERSIBLE, borra en cascada */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => { if (!open) { setPendingDelete(null); setDeleteConfirmText(''); } }}
      >
        <AlertDialogContent className="bg-gray-900 border-red-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Eliminar permanentemente</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 space-y-2">
              <span className="block">
                Esto elimina la instancia <strong className="text-white">{pendingDelete?.name}</strong> de Evolution
                API {pendingDelete && orgNames[pendingDelete.name] && (
                  <>y la organización <strong className="text-white">{orgNames[pendingDelete.name]}</strong></>
                )}, junto con TODOS sus CPLs, lanzamientos, grupos y accesos de usuario asociados. No se puede deshacer.
              </span>
              <span className="block">
                Para confirmar, escribe <strong className="text-white">{pendingDelete?.name}</strong> abajo:
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={pendingDelete?.name}
            className="bg-gray-800 border-gray-700 text-white"
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-700 hover:bg-red-800 text-white disabled:opacity-40 disabled:pointer-events-none"
              disabled={!pendingDelete || deleteConfirmText !== pendingDelete.name}
              onClick={() => pendingDelete && runAction('delete', pendingDelete)}
            >
              Eliminar definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InstancesStatus;
