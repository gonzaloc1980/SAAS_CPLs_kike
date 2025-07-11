import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

interface Organization {
  organization_id: string;
  organization_name: string;
  user_role: string;
}

interface OrganizationSelectorProps {
  selectedOrgId: string | null;
  onOrganizationChange: (orgId: string, orgName: string, role: string) => void;
  userRole: string;
}

export default function OrganizationSelector({ 
  selectedOrgId, 
  onOrganizationChange, 
  userRole 
}: OrganizationSelectorProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserOrganizations();
  }, []);

  const fetchUserOrganizations = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      if (userRole === 'super_admin') {
        // Super admin puede ver todas las organizaciones
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('status', 'active');

        if (error) throw error;
        
        const allOrgs = data?.map(org => ({
          organization_id: org.id,
          organization_name: org.name,
          user_role: 'super_admin'
        })) || [];
        
        setOrganizations(allOrgs);
      } else {
        // Usuarios normales solo ven sus organizaciones
        const { data, error } = await supabase
          .rpc('get_user_organizations', { _user_id: userData.user.id });

        if (error) throw error;
        setOrganizations(data || []);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las organizaciones',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationChange = (orgId: string) => {
    const org = organizations.find(o => o.organization_id === orgId);
    if (org) {
      onOrganizationChange(orgId, org.organization_name, org.user_role);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4" />
        <span className="text-sm">Cargando organizaciones...</span>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span className="text-sm">Sin organizaciones asignadas</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4" />
      <Select value={selectedOrgId || ''} onValueChange={handleOrganizationChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Seleccionar organización" />
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org) => (
            <SelectItem key={org.organization_id} value={org.organization_id}>
              <div className="flex items-center justify-between w-full">
                <span>{org.organization_name}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {org.user_role === 'super_admin' ? 'Super Admin' :
                   org.user_role === 'admin' ? 'Admin' : 'Usuario'}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}