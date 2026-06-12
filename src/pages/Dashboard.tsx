
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Plus, Play, Loader2, Database } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import GruposManager from '@/components/GruposManager';
import CplsManager from '@/components/CplsManager';
import VincularManager from '@/components/VincularManager';
import OrganizationsManager from '@/components/OrganizationsManager';
import OrganizationSelector from '@/components/OrganizationSelector';
import UsersManager from '@/components/UsersManager';
import CplLanzamientosManager from '@/components/CplLanzamientosManager';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import blasterLogo from '../assets/blaster_transparente.png';

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [selectedOrganization, setSelectedOrganization] = useState<{
    id: string | null;
    name: string;
    role: string;
  }>({ id: null, name: '', role: 'user' });
  const [hotmartDialogOpen, setHotmartDialogOpen] = useState(false);
  const [hotmartLoading, setHotmartLoading] = useState(false);
  const [hotmartResult, setHotmartResult] = useState<{ success: boolean; message: string; url?: string; inserted?: number; skipped?: number; total?: number; errors?: string[] } | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session?.user) {
          fetchUserProfile(session.user.id);
          fetchUserRole(session.user.id);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
        fetchUserRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
        return;
      }

      if (!data) {
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({ user_id: userId })
          .select()
          .single();

        if (createError) {
          console.error('Error creating user profile:', createError);
          return;
        }
        setUserProfile(newProfile);
      } else {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  const fetchUserRole = async (userId: string) => {
    try {
      // Verificar si es super admin
      const { data: superAdminData, error: superAdminError } = await supabase
        .rpc('is_super_admin', { _user_id: userId });

      if (superAdminError) {
        console.error('Error checking super admin:', superAdminError);
        return;
      }

      if (superAdminData) {
        setUserRole('super_admin');
        return;
      }

      // Obtener organizaciones del usuario
      const { data: orgsData, error: orgsError } = await supabase
        .rpc('get_user_organizations', { _user_id: userId });

      if (orgsError) {
        console.error('Error fetching user organizations:', orgsError);
        return;
      }

      if (orgsData && orgsData.length > 0) {
        // Establecer la primera organización como seleccionada
        const firstOrg = orgsData[0];
        setSelectedOrganization({
          id: firstOrg.organization_id,
          name: firstOrg.organization_name,
          role: firstOrg.user_role
        });
        setUserRole(firstOrg.user_role);
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
    }
  };

  const handleOrganizationChange = (orgId: string, orgName: string, role: string) => {
    setSelectedOrganization({
      id: orgId,
      name: orgName,
      role: role
    });
  };

  const getTabsGridCols = () => {
    if (userRole === 'super_admin') {
      return selectedOrganization.id 
        ? (userProfile?.vinculado === false ? 'grid-cols-6' : 'grid-cols-5')
        : 'grid-cols-1';
    }
    if (userRole === 'admin') {
      return userProfile?.vinculado === false ? 'grid-cols-5' : 'grid-cols-4';
    }
    return userProfile?.vinculado === false ? 'grid-cols-4' : 'grid-cols-3';
  };

  const handleHotmartLogin = async () => {
    setHotmartLoading(true);
    setHotmartResult(null);
    try {
      const SCRIPTS_SERVER_URL = import.meta.env.VITE_SCRIPTS_SERVER_URL || 'http://localhost:3001';
      const response = await fetch(`${SCRIPTS_SERVER_URL}/run-hotmart-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      setHotmartResult(data);
      if (data.success) {
        toast.success('Login en Hotmart exitoso');
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (err: any) {
      const msg = err.message?.includes('Failed to fetch')
        ? 'No se pudo conectar al servidor local. Asegúrate de que esté corriendo: cd scripts && node server.js'
        : err.message;
      setHotmartResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setHotmartLoading(false);
    }
  };

  const handleHotmartScrape = async () => {
    setHotmartLoading(true);
    setHotmartResult(null);
    try {
      const SCRIPTS_SERVER_URL = import.meta.env.VITE_SCRIPTS_SERVER_URL || 'http://localhost:3001';
      const response = await fetch(`${SCRIPTS_SERVER_URL}/run-hotmart-scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      setHotmartResult(data);
      if (data.success) {
        toast.success(`✅ ${data.inserted ?? 0} ventas guardadas en la base de datos`);
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (err: any) {
      const msg = err.message?.includes('Failed to fetch')
        ? 'No se pudo conectar al servidor local. Asegúrate de que esté corriendo: cd scripts && node server.js'
        : err.message;
      setHotmartResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setHotmartLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Sesión cerrada exitosamente');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <OrganizationProvider user={user}>
      <div className="min-h-screen bg-black text-white">
        <header className="bg-gray-900 border-b border-gray-800 p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <img src={blasterLogo} alt="Blaster" className="h-12 md:h-14 w-auto object-contain" />
            <div className="flex items-center gap-4">
              {userRole !== 'super_admin' && selectedOrganization.id && (
                <OrganizationSelector
                  selectedOrgId={selectedOrganization.id}
                  onOrganizationChange={handleOrganizationChange}
                  userRole={userRole}
                />
              )}
              {userRole === 'super_admin' && (
                <Button
                  onClick={() => { setHotmartResult(null); setHotmartDialogOpen(true); }}
                  variant="outline"
                  size="sm"
                  className="border-orange-600 text-orange-400 hover:bg-orange-900/30"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Hotmart Login
                </Button>
              )}
              <span className="text-gray-400">{user.email}</span>
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-4">
          <Tabs defaultValue={userRole === 'super_admin' ? 'organizations' : 'cpls'} className="w-full">
            <TabsList className={`grid w-full ${getTabsGridCols()} bg-gray-900 border-gray-800`}>
              {userRole === 'super_admin' && (
                <TabsTrigger 
                  value="organizations" 
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  Organizaciones
                </TabsTrigger>
              )}
              {selectedOrganization.id && (
                <>
                  <TabsTrigger 
                    value="cpls" 
                    className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                  >
                    CPLs
                  </TabsTrigger>
                  <TabsTrigger 
                    value="lanzamientos" 
                    className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                  >
                    Lanzamientos
                  </TabsTrigger>
                  <TabsTrigger 
                    value="grupos" 
                    className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                  >
                    Grupos
                  </TabsTrigger>
                  {(userRole === 'super_admin' || userRole === 'admin') && (
                    <TabsTrigger 
                      value="users" 
                      className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                    >
                      Usuarios
                    </TabsTrigger>
                  )}
                  {userProfile?.vinculado === false && (
                    <TabsTrigger 
                      value="vincular" 
                      className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                    >
                      Vincular
                    </TabsTrigger>
                  )}
                </>
              )}
            </TabsList>
            
            {userRole === 'super_admin' && (
              <TabsContent value="organizations" className="mt-6">
                <OrganizationsManager userRole={userRole} />
              </TabsContent>
            )}
            
            {selectedOrganization.id && (
              <>
                <TabsContent value="cpls" className="mt-6">
                  <CplsManager userId={user.id} />
                </TabsContent>

                <TabsContent value="lanzamientos" className="mt-6">
                  <CplLanzamientosManager userId={user.id} />
                </TabsContent>
                
                <TabsContent value="grupos" className="mt-6">
                  <GruposManager userId={user.id} />
                </TabsContent>
                
                {(userRole === 'super_admin' || userRole === 'admin') && (
                  <TabsContent value="users" className="mt-6">
                    <UsersManager userRole={userRole} />
                  </TabsContent>
                )}
                
                {userProfile?.vinculado === false && (
                  <TabsContent value="vincular" className="mt-6">
                    <VincularManager userId={user.id} userEmail={user.email} />
                  </TabsContent>
                )}
              </>
            )}
            
            {!selectedOrganization.id && userRole !== 'super_admin' && (
              <div className="mt-6 text-center">
                <p className="text-gray-400">No hay organización seleccionada</p>
              </div>
            )}
          </Tabs>
        </main>
      </div>

      {/* Diálogo Hotmart Login - solo super_admin */}
      <Dialog open={hotmartDialogOpen} onOpenChange={setHotmartDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-orange-400">Hotmart — Automatización</DialogTitle>
            <DialogDescription className="text-gray-400">
              Usa las credenciales del archivo{' '}
              <code className="text-orange-300">scripts/.env</code> para operar en Hotmart.
            </DialogDescription>
          </DialogHeader>

          {!hotmartResult && (
            <div className="text-sm text-gray-400 space-y-2 py-2">
              <p>Asegúrate de que el servidor local esté corriendo:</p>
              <pre className="bg-gray-800 rounded p-2 text-xs text-green-400 overflow-auto">
                cd scripts{'\n'}
                npm install{'\n'}
                node server.js
              </pre>
              <p className="text-xs text-yellow-400 mt-2">
                ⚠️ Para guardar en la DB también necesitas{' '}
                <code>SUPABASE_SERVICE_ROLE_KEY</code> en scripts/.env
              </p>
            </div>
          )}

          {hotmartResult && (
            <div className={`rounded p-3 text-sm mt-2 space-y-1 ${hotmartResult.success ? 'bg-green-900/40 border border-green-700 text-green-300' : 'bg-red-900/40 border border-red-700 text-red-300'}`}>
              <p className="font-semibold">{hotmartResult.success ? '✅ Éxito' : '❌ Error'}</p>
              <p>{hotmartResult.message || (hotmartResult as any).error}</p>
              {hotmartResult.total !== undefined && (
                <div className="text-xs text-gray-300 mt-2 space-y-0.5">
                  <p>• Total scrapeadas: <strong>{hotmartResult.total}</strong></p>
                  <p>• Guardadas en DB: <strong>{hotmartResult.inserted}</strong></p>
                  {(hotmartResult.skipped ?? 0) > 0 && (
                    <p>• Con error/duplicadas: <strong>{hotmartResult.skipped}</strong></p>
                  )}
                </div>
              )}
              {hotmartResult.url && (
                <p className="text-xs text-gray-400 break-all">URL: {hotmartResult.url}</p>
              )}
              {hotmartResult.errors && hotmartResult.errors.length > 0 && (
                <details className="text-xs text-red-300 mt-1">
                  <summary className="cursor-pointer">Ver errores</summary>
                  <pre className="mt-1 whitespace-pre-wrap">{hotmartResult.errors.join('\n')}</pre>
                </details>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 mt-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
              onClick={() => setHotmartDialogOpen(false)}
              disabled={hotmartLoading}
            >
              Cerrar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-orange-600 text-orange-400 hover:bg-orange-900/30"
              onClick={handleHotmartLogin}
              disabled={hotmartLoading}
            >
              {hotmartLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Solo Login
            </Button>
            <Button
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleHotmartScrape}
              disabled={hotmartLoading}
            >
              {hotmartLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Login + Scrapear Ventas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OrganizationProvider>
  );
};

export default Dashboard;
