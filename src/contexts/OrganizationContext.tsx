import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface OrganizationContextType {
  selectedOrganization: {
    id: string | null;
    name: string;
    role: string;
  };
  userRole: string;
  setSelectedOrganization: (org: { id: string | null; name: string; role: string }) => void;
  setUserRole: (role: string) => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

interface OrganizationProviderProps {
  children: ReactNode;
  user: User | null;
}

export const OrganizationProvider = ({ children, user }: OrganizationProviderProps) => {
  const [selectedOrganization, setSelectedOrganization] = useState<{
    id: string | null;
    name: string;
    role: string;
  }>({ id: null, name: '', role: 'user' });
  const [userRole, setUserRole] = useState<string>('user');

  useEffect(() => {
    if (user) {
      fetchUserRole(user.id);
    }
  }, [user]);

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

  return (
    <OrganizationContext.Provider value={{
      selectedOrganization,
      userRole,
      setSelectedOrganization,
      setUserRole
    }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};