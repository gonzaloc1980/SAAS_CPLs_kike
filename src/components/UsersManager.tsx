import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Users, UserPlus, Shield } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  organization_id: string;
  created_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  nombre: string | null;
  phone: string | null;
  vinculado: boolean;
}

interface UserWithRole {
  id: string;
  user_id: string;
  role: string;
  organization_id: string;
  created_at: string;
  profiles: Profile | null;
}

interface UsersManagerProps {
  userRole: string;
}

export default function UsersManager({ userRole }: UsersManagerProps) {
  const { selectedOrganization } = useOrganization();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const canManageUsers = userRole === 'super_admin' || userRole === 'admin';

  useEffect(() => {
    if (selectedOrganization && canManageUsers) {
      fetchUsers();
    }
  }, [selectedOrganization, canManageUsers]);

  const fetchUsers = async () => {
    if (!selectedOrganization) return;
    
    try {
      // Primero obtener los roles de usuario
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('organization_id', selectedOrganization.id)
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      // Luego obtener los perfiles para cada usuario
      const usersWithProfiles = await Promise.all(
        (userRoles || []).map(async (userRole) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userRole.user_id)
            .single();

          return {
            ...userRole,
            profiles: profile
          };
        })
      );

      setUsers(usersWithProfiles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    if (!newUserEmail.trim() || !selectedOrganization) {
      toast({
        title: 'Error',
        description: 'El email es requerido',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      // Primero crear el usuario en auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUserEmail.trim(),
        password: 'temporal123!', // Password temporal
        email_confirm: true
      });

      if (authError) throw authError;

      // Crear el rol del usuario
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([
          {
            user_id: authData.user.id,
            role: newUserRole,
            organization_id: selectedOrganization.id
          }
        ]);

      if (roleError) throw roleError;

      setNewUserEmail('');
      setNewUserRole('user');
      setIsCreateModalOpen(false);
      fetchUsers();
      
      toast({
        title: 'Éxito',
        description: `Usuario creado exitosamente. Se envió un email a ${newUserEmail} para configurar su contraseña.`,
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el usuario',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'admin':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      default:
        return 'Usuario';
    }
  };

  if (!canManageUsers) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="text-center py-8">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Acceso Restringido</h3>
          <p className="text-muted-foreground">
            No tienes permisos para gestionar usuarios.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Gestión de Usuarios
          </h2>
          <p className="text-muted-foreground">
            {selectedOrganization ? `Usuarios en ${selectedOrganization.name}` : 'Selecciona una organización'}
          </p>
        </div>
        
        {selectedOrganization && (
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="userEmail">Email del Usuario</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="userRole">Rol del Usuario</Label>
                  <Select value={newUserRole} onValueChange={(value: 'admin' | 'user') => setNewUserRole(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuario</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={createUser}
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

      {!selectedOrganization ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Selecciona una Organización</h3>
            <p className="text-muted-foreground">
              Elige una organización para ver y gestionar sus usuarios.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    {user.profiles?.nombre || 'Sin nombre'}
                  </span>
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {getRoleDisplayName(user.role)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="font-medium">ID:</span> {user.user_id.slice(0, 8)}...
                  </div>
                  
                  {user.profiles?.phone && (
                    <div className="text-sm">
                      <span className="font-medium">Teléfono:</span> {user.profiles.phone}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={user.profiles?.vinculado ? 'default' : 'secondary'}>
                      {user.profiles?.vinculado ? 'Vinculado' : 'No vinculado'}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Creado: {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedOrganization && users.length === 0 && (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay usuarios</h3>
          <p className="text-muted-foreground mb-4">
            Esta organización no tiene usuarios asignados aún.
          </p>
        </div>
      )}
    </div>
  );
}