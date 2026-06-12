
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit, Trash2, X, Phone, Download, Loader2, Search, Users, Copy, Link2, MessageSquare } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useOrganization } from '@/contexts/OrganizationContext';

interface Grupo {
  id: string;
  nombre: string;
  id_grupo: string | null;
  estado: string;
  numeros_whatsapp: string[];
  created_at: string;
  identificador_meta: string | null;
  mensaje_bienvenida: string | null;
  enlace_invitacion: string | null;
}

interface EvolutionGroup {
  id: string;
  subject: string;
  owner?: string;
  subjectOwner?: string;
  participants?: Array<{
    id: string;
    admin: 'admin' | 'superadmin' | null;
    phoneNumber?: string;
  }>;
}

interface GruposManagerProps {
  userId: string;
}

const EVOLUTION_API_URL = 'https://agendador-evolution-api.6qgqpv.easypanel.host';
const EVOLUTION_API_KEY = '429683C4C977415CAAFCCE10F7D57E11';

const extractNumberFromJid = (jid: string): string => {
  return jid.replace(/@.*$/, '').replace(/\D/g, '');
};

const GruposManager = ({ userId }: GruposManagerProps) => {
  const { selectedOrganization } = useOrganization();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState<Grupo | null>(null);
  const [nombre, setNombre] = useState('');
  const [numerosWhatsapp, setNumerosWhatsapp] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);

  // Import from WhatsApp states
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [loadingEvolutionGroups, setLoadingEvolutionGroups] = useState(false);
  const [importingGroups, setImportingGroups] = useState(false);
  const [evolutionGroups, setEvolutionGroups] = useState<EvolutionGroup[]>([]);
  const [selectedEvolutionGroups, setSelectedEvolutionGroups] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');

  // Org data for building landing links
  const [orgApiKey, setOrgApiKey] = useState('');

  // Per-grupo meta link state
  const [generatingMeta, setGeneratingMeta] = useState<Record<string, boolean>>({});


  useEffect(() => {
    if (selectedOrganization) {
      fetchGrupos();
    }
  }, [userId, selectedOrganization]);

  useEffect(() => {
    if (selectedOrganization) {
      fetchOrgData();
    }
  }, [selectedOrganization?.id]);

  const fetchGrupos = async () => {
    if (!selectedOrganization) return;
    
    try {
      const { data, error } = await supabase
        .from('grupos')
        .select('*')
        .eq('organization_id', selectedOrganization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGrupos(data || []);
    } catch (error: any) {
      toast.error('Error al cargar grupos: ' + error.message);
    }
  };

  const addNumeroWhatsapp = () => {
    setNumerosWhatsapp([...numerosWhatsapp, '']);
  };

  const removeNumeroWhatsapp = (index: number) => {
    if (numerosWhatsapp.length > 1) {
      setNumerosWhatsapp(numerosWhatsapp.filter((_, i) => i !== index));
    }
  };

  const updateNumeroWhatsapp = (index: number, value: string) => {
    const newNumeros = [...numerosWhatsapp];
    newNumeros[index] = value;
    setNumerosWhatsapp(newNumeros);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    
    // Validar números de WhatsApp
    const numerosValidos = numerosWhatsapp.filter(num => num.trim() !== '');
    if (numerosValidos.length === 0 && !editingGrupo) {
      toast.error('Debes agregar al menos un número de WhatsApp');
      return;
    }

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
            organization_id: selectedOrganization?.id,
            estado: 'Creando...',
            numeros_whatsapp: numerosValidos
          })
          .select()
          .single();

        if (error) throw error;
        
        // Llamar al webhook después de crear el grupo exitosamente
        try {
          const webhookResponse = await fetch('https://agendador-n8n.6qgqpv.easypanel.host/webhook/f548d0ac-d7d1-4667-84ea-99b5640aba24', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: userId,
              id: data.id,
              numeros_whatsapp: numerosValidos
            }),
          });

          if (webhookResponse.ok) {
            const webhookData = await webhookResponse.json();
            console.log('Webhook Data como string:', JSON.stringify(webhookData, null, 2));
            if (webhookData.JID) {
              // Actualizar el grupo con el JID recibido
              await supabase
                .from('grupos')
                .update({ 
                  id_grupo: webhookData.JID,
                  estado: 'Creado'
                })
                .eq('id', data.id);
            }
          }
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
    setNumerosWhatsapp(grupo.numeros_whatsapp?.length > 0 ? grupo.numeros_whatsapp : ['']);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
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
    setNumerosWhatsapp(['']);
  };

  const fetchOrgData = async () => {
    if (!selectedOrganization?.id) return;
    const { data } = await supabase
      .from('organizations')
      .select('whatsapp_api_key')
      .eq('id', selectedOrganization.id)
      .single();
    if (data) {
      setOrgApiKey(data.whatsapp_api_key || '');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  const generateMetaLink = async (grupo: Grupo) => {
    setGeneratingMeta(prev => ({ ...prev, [grupo.id]: true }));
    try {
      // 1. Generate a unique identifier if not already set
      let identificador = grupo.identificador_meta;
      if (!identificador) {
        let found = false;
        for (let i = 0; i < 10 && !found; i++) {
          const hex = Math.random().toString(16).slice(2, 8);
          const candidate = `GRP-${hex}`;
          const { data: existing } = await supabase
            .from('grupos')
            .select('id')
            .eq('identificador_meta', candidate)
            .maybeSingle();
          if (!existing) {
            identificador = candidate;
            found = true;
          }
        }
        if (!identificador) throw new Error('No se pudo generar un identificador único');
      }

      // 2. Fetch the group invite link from Evolution API
      let enlace = grupo.enlace_invitacion;
      if (!enlace && orgApiKey && grupo.id_grupo) {
        try {
          const inviteRes = await fetch(
            `${EVOLUTION_API_URL}/group/inviteCode/${encodeURIComponent(orgApiKey)}?groupJid=${encodeURIComponent(grupo.id_grupo)}`,
            { headers: { 'apikey': EVOLUTION_API_KEY } }
          );
          if (inviteRes.ok) {
            const inviteData = await inviteRes.json();
            enlace = inviteData.inviteUrl ||
              (inviteData.inviteCode ? `https://chat.whatsapp.com/${inviteData.inviteCode}` : enlace);
          }
        } catch {
          // Continue without invite link if the fetch fails
        }
      }

      // 3. Persist to DB
      const { error } = await supabase
        .from('grupos')
        .update({ identificador_meta: identificador, enlace_invitacion: enlace })
        .eq('id', grupo.id);
      if (error) throw error;

      toast.success('Enlace generado exitosamente');
      await fetchGrupos();
    } catch (error: any) {
      toast.error('Error al generar enlace: ' + error.message);
    } finally {
      setGeneratingMeta(prev => ({ ...prev, [grupo.id]: false }));
    }
  };

  const fetchEvolutionGroups = async () => {
    setLoadingEvolutionGroups(true);
    setEvolutionGroups([]);
    setSelectedEvolutionGroups(new Set());
    setSearchFilter('');

    try {
      // 1. Get instanceName from organization's whatsapp_api_key
      if (!selectedOrganization?.id) {
        toast.error('Selecciona una organización primero.');
        return;
      }

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('whatsapp_api_key')
        .eq('id', selectedOrganization.id)
        .single();

      if (orgError || !orgData?.whatsapp_api_key) {
        toast.error('No se encontró instancia configurada para esta organización.');
        return;
      }

      const instanceName = orgData.whatsapp_api_key;

      // 2. Get connected instance info to obtain ownerJid
      const instancesRes = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
        headers: { 'apikey': EVOLUTION_API_KEY }
      });

      if (!instancesRes.ok) throw new Error('Error al obtener instancias');

      const instances = await instancesRes.json();

      const connectedInstance = instances.find((inst: any) =>
        inst.name === instanceName && inst.connectionStatus === 'open'
      );

      if (!connectedInstance) {
        toast.error('No hay instancia conectada. Vincula tu WhatsApp primero.');
        return;
      }

      const ownerJid = connectedInstance.ownerJid || '';
      const ownerNumber = ownerJid ? extractNumberFromJid(ownerJid) : '';

      // 3. Fetch all groups with participants
      const groupsRes = await fetch(
        `${EVOLUTION_API_URL}/group/fetchAllGroups/${encodeURIComponent(instanceName)}?getParticipants=true`,
        { headers: { 'apikey': EVOLUTION_API_KEY } }
      );

      if (!groupsRes.ok) throw new Error('Error al obtener grupos de WhatsApp');

      const allGroups: EvolutionGroup[] = await groupsRes.json();

      // 4. Filter groups where user is admin
      const adminGroups = allGroups.filter(group => {
        // Check if the instance owns the group (owner may be @lid or @s.whatsapp.net)
        if (ownerJid && (group.owner === ownerJid || group.subjectOwner === ownerJid)) {
          return true;
        }

        // Check participants for admin role — id is @lid format, phoneNumber has the real JID
        if (group.participants) {
          return group.participants.some(p => {
            if (p.admin !== 'admin' && p.admin !== 'superadmin') return false;
            // Direct JID match on phoneNumber field
            if (p.phoneNumber === ownerJid) return true;
            // Number-only comparison against phoneNumber
            if (ownerNumber && p.phoneNumber) {
              return extractNumberFromJid(p.phoneNumber) === ownerNumber;
            }
            return false;
          });
        }

        return false;
      });

      // 5. Deduplicate by id
      const uniqueGroups = Array.from(
        new Map(adminGroups.map(g => [g.id, g])).values()
      );

      // 6. Exclude already imported groups
      const existingJids = new Set(
        grupos.filter(g => g.id_grupo).map(g => g.id_grupo)
      );
      const newGroups = uniqueGroups.filter(g => !existingJids.has(g.id));

      setEvolutionGroups(newGroups);
      setShowImportDialog(true);

      if (newGroups.length === 0) {
        toast.info('No se encontraron grupos nuevos donde seas administrador');
      }
    } catch (error: any) {
      toast.error('Error al cargar grupos de WhatsApp: ' + error.message);
    } finally {
      setLoadingEvolutionGroups(false);
    }
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedEvolutionGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const filtered = filteredEvolutionGroups;
    if (selectedEvolutionGroups.size === filtered.length && filtered.length > 0) {
      setSelectedEvolutionGroups(new Set());
    } else {
      setSelectedEvolutionGroups(new Set(filtered.map(g => g.id)));
    }
  };

  const filteredEvolutionGroups = evolutionGroups.filter(g =>
    g.subject.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const importSelectedGroups = async () => {
    if (selectedEvolutionGroups.size === 0) {
      toast.error('Selecciona al menos un grupo para importar');
      return;
    }

    setImportingGroups(true);
    try {
      const groupsToImport = evolutionGroups.filter(g => selectedEvolutionGroups.has(g.id));

      const inserts = groupsToImport.map(g => ({
        nombre: g.subject,
        id_grupo: g.id,
        user_id: userId,
        organization_id: selectedOrganization?.id,
        estado: 'Creado',
        numeros_whatsapp: [] as string[]
      }));

      const { error } = await supabase
        .from('grupos')
        .insert(inserts);

      if (error) throw error;

      toast.success(`${groupsToImport.length} grupo(s) importado(s) exitosamente`);
      setShowImportDialog(false);
      setEvolutionGroups([]);
      setSelectedEvolutionGroups(new Set());
      fetchGrupos();
    } catch (error: any) {
      toast.error('Error al importar grupos: ' + error.message);
    } finally {
      setImportingGroups(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Gestión de Grupos</h2>
        {selectedOrganization && (
          <div className="flex gap-2">
            <Button
              onClick={fetchEvolutionGroups}
              disabled={loadingEvolutionGroups}
              variant="outline"
              className="border-green-700 text-green-400 hover:bg-green-900"
            >
              {loadingEvolutionGroups ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cargando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Importar desde WhatsApp
                </>
              )}
            </Button>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Grupo
            </Button>
          </div>
        )}
      </div>

      {/* Dialog para importar grupos desde WhatsApp */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-green-400" />
              Importar Grupos de WhatsApp
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Selecciona los grupos donde eres administrador para importarlos.
            </DialogDescription>
          </DialogHeader>

          {evolutionGroups.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar grupo..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white pl-9"
              />
            </div>
          )}

          {evolutionGroups.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <Checkbox
                id="select-all"
                checked={filteredEvolutionGroups.length > 0 && selectedEvolutionGroups.size === filteredEvolutionGroups.length}
                onCheckedChange={toggleSelectAll}
              />
              <Label htmlFor="select-all" className="text-sm text-gray-300 cursor-pointer">
                Seleccionar todos ({filteredEvolutionGroups.length})
              </Label>
              {selectedEvolutionGroups.size > 0 && (
                <Badge className="bg-blue-600 text-white ml-auto">
                  {selectedEvolutionGroups.size} seleccionado(s)
                </Badge>
              )}
            </div>
          )}

          <ScrollArea className="max-h-[350px] pr-2">
            <div className="space-y-1">
              {filteredEvolutionGroups.length === 0 ? (
                <p className="text-gray-500 text-center py-6 text-sm">
                  {evolutionGroups.length === 0
                    ? 'No se encontraron grupos donde seas administrador.'
                    : 'No hay grupos que coincidan con la búsqueda.'}
                </p>
              ) : (
                filteredEvolutionGroups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors"
                    onClick={() => toggleGroupSelection(group.id)}
                  >
                    <Checkbox
                      checked={selectedEvolutionGroups.has(group.id)}
                      onCheckedChange={() => toggleGroupSelection(group.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {group.subject}
                      </p>
                      <p className="text-gray-500 text-xs truncate">
                        {group.id}
                      </p>
                    </div>
                    {group.participants && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {group.participants.length}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(false)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={importSelectedGroups}
              disabled={selectedEvolutionGroups.size === 0 || importingGroups}
              className="bg-green-600 hover:bg-green-700"
            >
              {importingGroups ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Importar ({selectedEvolutionGroups.size})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              
              {!editingGrupo && (
                <div className="space-y-2">
                  <Label className="text-gray-200 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Números de WhatsApp
                  </Label>
                  <div className="space-y-2">
                    {numerosWhatsapp.map((numero, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          value={numero}
                          onChange={(e) => updateNumeroWhatsapp(index, e.target.value)}
                          placeholder="Ej: 5212345678901"
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                        {numerosWhatsapp.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeNumeroWhatsapp(index)}
                            className="border-red-700 text-red-400 hover:bg-red-900"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addNumeroWhatsapp}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar número
                    </Button>
                  </div>
                  <p className="text-sm text-gray-400">
                    Se requiere al menos un número para formar el grupo
                  </p>
                </div>
              )}
              
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
        {!selectedOrganization ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="text-center py-8">
              <p className="text-gray-400">Selecciona una organización para ver los grupos.</p>
            </CardContent>
          </Card>
        ) : grupos.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="text-center py-8">
              <p className="text-gray-400">No hay grupos creados en esta organización.</p>
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
                     {grupo.numeros_whatsapp && grupo.numeros_whatsapp.length > 0 && (
                       <div className="mb-2">
                         <p className="text-sm text-gray-300 mb-1 flex items-center gap-1">
                           <Phone className="h-3 w-3" />
                           Números WhatsApp:
                         </p>
                         <p className="text-sm text-gray-400 break-all">
                           {grupo.numeros_whatsapp.join(', ')}
                         </p>
                       </div>
                     )}
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
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-700 text-red-400 hover:bg-red-900"
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
                            ¿Estás seguro de que deseas eliminar el grupo "{grupo.nombre}"? Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700">
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(grupo.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Meta Ads link section — only for grupos that are fully created */}
                {grupo.estado === 'Creado' && grupo.id_grupo && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-blue-400 flex items-center gap-1.5">
                        <Link2 className="h-4 w-4" />
                        Enlace para Meta Ads
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateMetaLink(grupo)}
                        disabled={generatingMeta[grupo.id]}
                        className="border-blue-700 text-blue-400 hover:bg-blue-900 h-7 text-xs px-2"
                      >
                        {generatingMeta[grupo.id] ? (
                          <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Generando...</>
                        ) : grupo.identificador_meta ? 'Generar Enlace Meta' : 'Generar Enlace Meta'}
                      </Button>
                    </div>

                    {!grupo.identificador_meta && (
                      <p className="text-xs text-gray-500">
                        Genera un enlace único para usar en formularios de Meta cuando no permiten enlaces directos de grupos de WhatsApp.
                      </p>
                    )}

                    {grupo.identificador_meta && (
                      <>
                        <div className="bg-gray-800 rounded-lg p-3 mb-3">
                          <p className="text-xs text-gray-400 mb-1.5">🔗 Enlace para formularios de Meta Ads:</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-green-300 break-all flex-1 font-mono">
                              {`${window.location.origin}/join/${grupo.identificador_meta}`}
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(`${window.location.origin}/join/${grupo.identificador_meta}`)}
                              className="text-gray-400 hover:text-white shrink-0 h-7 w-7 p-0"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>


                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default GruposManager;
