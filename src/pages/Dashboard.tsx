
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Plus } from 'lucide-react';
import { toast } from 'sonner';
import GruposManager from '@/components/GruposManager';
import CplsManager from '@/components/CplsManager';
import VincularManager from '@/components/VincularManager';
import OrganizationsManager from '@/components/OrganizationsManager';
import OrganizationSelector from '@/components/OrganizationSelector';
import UsersManager from '@/components/UsersManager';
import { OrganizationProvider } from '@/contexts/OrganizationContext';

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
        ? (userProfile?.vinculado === false ? 'grid-cols-5' : 'grid-cols-4')
        : 'grid-cols-1';
    }
    if (userRole === 'admin') {
      return userProfile?.vinculado === false ? 'grid-cols-4' : 'grid-cols-3';
    }
    return userProfile?.vinculado === false ? 'grid-cols-3' : 'grid-cols-2';
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Sesión cerrada exitosamente');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <OrganizationProvider user={user}>
      <div className="min-h-screen bg-gray-950 text-white">
        <header className="bg-gray-900 border-b border-gray-800 p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold text-blue-400">CPL Manager</h1>
            <div className="flex items-center gap-4">
              {userRole !== 'super_admin' && selectedOrganization.id && (
                <OrganizationSelector
                  selectedOrgId={selectedOrganization.id}
                  onOrganizationChange={handleOrganizationChange}
                  userRole={userRole}
                />
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
    </OrganizationProvider>
  );
};

export default Dashboard;
