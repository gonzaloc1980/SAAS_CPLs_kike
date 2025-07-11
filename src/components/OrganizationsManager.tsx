import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Building2, Users, Settings } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  status: string;
  whatsapp_api_key?: string;
  whatsapp_phone_number?: string;
  created_at: string;
  updated_at: string;
}

interface OrganizationsManagerProps {
  userRole: string;
}

export default function OrganizationsManager({ userRole }: OrganizationsManagerProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const isSuperAdmin = userRole === 'super_admin';

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
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

  const createOrganization = async () => {
    if (!newOrgName.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la organización es requerido',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert([
          {
            name: newOrgName.trim(),
            status: 'active'
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setOrganizations(prev => [data, ...prev]);
      setNewOrgName('');
      setIsCreateModalOpen(false);
      
      toast({
        title: 'Éxito',
        description: 'Organización creada exitosamente',
      });
    } catch (error) {
      console.error('Error creating organization:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la organización',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando organizaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Gestión de Organizaciones
          </h2>
          <p className="text-muted-foreground">
            Administra las organizaciones del sistema
          </p>
        </div>
        
        {isSuperAdmin && (
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Organización
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Organización</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="orgName">Nombre de la Organización</Label>
                  <Input
                    id="orgName"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Nombre de la empresa o cliente"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={createOrganization}
                    disabled={isCreating}
                  >
                    {isCreating ? 'Creando...' : 'Crear'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org) => (
          <Card key={org.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{org.name}</span>
                <Badge variant={org.status === 'active' ? 'default' : 'secondary'}>
                  {org.status === 'active' ? 'Activa' : 'Inactiva'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Creada: {new Date(org.created_at).toLocaleDateString()}</span>
                </div>
                
                {org.whatsapp_phone_number && (
                  <div className="text-sm">
                    <span className="font-medium">WhatsApp:</span> {org.whatsapp_phone_number}
                  </div>
                )}
                
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Users className="h-4 w-4 mr-1" />
                    Usuarios
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Settings className="h-4 w-4 mr-1" />
                    Config
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {organizations.length === 0 && (
        <div className="text-center py-8">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay organizaciones</h3>
          <p className="text-muted-foreground mb-4">
            {isSuperAdmin 
              ? 'Crea la primera organización para comenzar.' 
              : 'No tienes acceso a ninguna organización.'
            }
          </p>
        </div>
      )}
    </div>
  );
}