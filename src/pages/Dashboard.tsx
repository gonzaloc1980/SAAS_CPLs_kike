
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

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session?.user) {
          fetchUserProfile(session.user.id);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
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
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-400">CPL Manager</h1>
          <div className="flex items-center gap-4">
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
        <Tabs defaultValue="cpls" className="w-full">
          <TabsList className={`grid w-full ${userProfile?.vinculado === false ? 'grid-cols-3' : 'grid-cols-2'} bg-gray-900 border-gray-800`}>
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
            {userProfile?.vinculado === false && (
              <TabsTrigger 
                value="vincular" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Vincular
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="cpls" className="mt-6">
            <CplsManager userId={user.id} />
          </TabsContent>
          
          <TabsContent value="grupos" className="mt-6">
            <GruposManager userId={user.id} />
          </TabsContent>
          
          {userProfile?.vinculado === false && (
            <TabsContent value="vincular" className="mt-6">
              <VincularManager userId={user.id} userEmail={user.email} />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
