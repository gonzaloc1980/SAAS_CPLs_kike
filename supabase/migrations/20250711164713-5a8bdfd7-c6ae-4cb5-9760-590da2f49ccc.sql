-- Crear tabla de organizaciones
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  whatsapp_api_key text,
  whatsapp_phone_number text,
  status text NOT NULL DEFAULT 'active'
);

-- Crear enum para roles
CREATE TYPE public.user_role_type AS ENUM ('super_admin', 'admin', 'user');

-- Crear tabla de roles de usuario
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  role user_role_type NOT NULL DEFAULT 'user',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Agregar organization_id a tablas existentes
ALTER TABLE public.cpls ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.grupos ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Actualizar perfiles para incluir organización por defecto
ALTER TABLE public.profiles ADD COLUMN default_organization_id uuid REFERENCES public.organizations(id);

-- Habilitar RLS en nuevas tablas
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Función para verificar roles
CREATE OR REPLACE FUNCTION public.has_role_in_org(_user_id uuid, _organization_id uuid, _role user_role_type)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _organization_id
      AND role = _role
  )
$$;

-- Función para verificar si es super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
      AND organization_id IS NULL
  )
$$;

-- Función para obtener organizaciones del usuario
CREATE OR REPLACE FUNCTION public.get_user_organizations(_user_id uuid)
RETURNS TABLE(organization_id uuid, organization_name text, user_role user_role_type)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT ur.organization_id, o.name, ur.role
  FROM public.user_roles ur
  JOIN public.organizations o ON ur.organization_id = o.id
  WHERE ur.user_id = _user_id
$$;

-- Políticas RLS para organizations
CREATE POLICY "Super admins can view all organizations" 
ON public.organizations 
FOR SELECT 
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Organization members can view their organization" 
ON public.organizations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND organization_id = organizations.id
  )
);

CREATE POLICY "Super admins can create organizations" 
ON public.organizations 
FOR INSERT 
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Organization admins can update their organization" 
ON public.organizations 
FOR UPDATE 
USING (public.has_role_in_org(auth.uid(), id, 'admin'));

-- Políticas RLS para user_roles
CREATE POLICY "Super admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Organization admins can view roles in their org" 
ON public.user_roles 
FOR SELECT 
USING (public.has_role_in_org(auth.uid(), organization_id, 'admin'));

CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Super admins can create any role" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Organization admins can create roles in their org" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  public.has_role_in_org(auth.uid(), organization_id, 'admin') 
  AND role != 'super_admin'
);

-- Actualizar políticas existentes para cpls
DROP POLICY IF EXISTS "Users can view their own cpls" ON public.cpls;
DROP POLICY IF EXISTS "Users can create their own cpls" ON public.cpls;
DROP POLICY IF EXISTS "Users can update their own cpls" ON public.cpls;
DROP POLICY IF EXISTS "Users can delete their own cpls" ON public.cpls;

CREATE POLICY "Users can view cpls in their organization" 
ON public.cpls 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND organization_id = cpls.organization_id
  )
);

CREATE POLICY "Users can create cpls in their organization" 
ON public.cpls 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND organization_id = cpls.organization_id
  )
  AND user_id = auth.uid()
);

CREATE POLICY "Users can update their own cpls in their organization" 
ON public.cpls 
FOR UPDATE 
USING (
  user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND organization_id = cpls.organization_id
  )
);

CREATE POLICY "Users can delete their own cpls in their organization" 
ON public.cpls 
FOR DELETE 
USING (
  user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND organization_id = cpls.organization_id
  )
);

-- Actualizar políticas existentes para grupos
DROP POLICY IF EXISTS "Users can view their own grupos" ON public.grupos;
DROP POLICY IF EXISTS "Users can create their own grupos" ON public.grupos;
DROP POLICY IF EXISTS "Users can update their own grupos" ON public.grupos;
DROP POLICY IF EXISTS "Users can delete their own grupos" ON public.grupos;

CREATE POLICY "Users can view grupos in their organization" 
ON public.grupos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND organization_id = grupos.organization_id
  )
);

CREATE POLICY "Users can create grupos in their organization" 
ON public.grupos 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND organization_id = grupos.organization_id
  )
  AND user_id = auth.uid()
);

CREATE POLICY "Users can update their own grupos in their organization" 
ON public.grupos 
FOR UPDATE 
USING (
  user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND organization_id = grupos.organization_id
  )
);

CREATE POLICY "Users can delete their own grupos in their organization" 
ON public.grupos 
FOR DELETE 
USING (
  user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND organization_id = grupos.organization_id
  )
);

-- Trigger para updated_at en organizations
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar primer super admin (debes cambiar este email por el tuyo)
INSERT INTO public.user_roles (user_id, organization_id, role)
SELECT id, NULL, 'super_admin'
FROM auth.users
WHERE email = 'admin@example.com'
ON CONFLICT (user_id, organization_id) DO NOTHING;