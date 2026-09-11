import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? ''
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? ''

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'No autenticado' }, 401)
    }

    // Cliente que actua COMO el usuario que llama, solo para verificar
    // quien es y si es super_admin - nunca usamos la service role para esto.
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: userData, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !userData.user) {
      return json({ error: 'Sesion invalida' }, 401)
    }

    const { data: isSuperAdmin, error: rpcError } = await supabaseUser.rpc('is_super_admin', {
      _user_id: userData.user.id,
    })

    if (rpcError || !isSuperAdmin) {
      return json({ error: 'No autorizado' }, 403)
    }

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return json({ error: 'Funcion mal configurada: faltan secrets EVOLUTION_API_URL/EVOLUTION_API_KEY' }, 500)
    }

    const body = await req.json().catch(() => ({}))
    const action = body?.action
    const instanceName = body?.instanceName

    if (!instanceName || typeof instanceName !== 'string') {
      return json({ error: 'Falta instanceName' }, 400)
    }

    if (action !== 'suspend' && action !== 'unsuspend' && action !== 'delete') {
      return json({ error: "action debe ser 'suspend', 'unsuspend' o 'delete'" }, 400)
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // --- Suspender/reactivar: la fuente de verdad es organizations.suspendida. ---
    // El workflow de n8n revisa ese campo antes de enviar y salta el envio si
    // esta en true - no depende de que Evolution API desconecte de forma
    // confiable (en la practica, /instance/logout de esta version de Evolution
    // API no invalida la sesion: el cliente se reconecta solo a los segundos).
    if (action === 'suspend' || action === 'unsuspend') {
      const suspendida = action === 'suspend'

      const { data: org, error: updateError } = await supabaseAdmin
        .from('organizations')
        .update({ suspendida })
        .eq('whatsapp_api_key', instanceName)
        .select('id, name')
        .maybeSingle()

      if (updateError) {
        return json({ error: 'No se pudo actualizar la organización: ' + updateError.message }, 500)
      }

      if (!org) {
        return json({ error: 'No se encontró ninguna organización con esa instancia.' }, 404)
      }

      // Intento adicional, best-effort: si esta suspendiendo, tambien se intenta
      // cerrar la sesion en Evolution API. Si falla (version 2.3.7 suele
      // devolver 500 "Connection Closed" y reconectar solo), no importa: lo
      // que realmente bloquea el envio es el campo suspendida en la BD.
      if (suspendida) {
        try {
          await fetch(`${EVOLUTION_API_URL}/instance/logout/${encodeURIComponent(instanceName)}`, {
            method: 'DELETE',
            headers: { apikey: EVOLUTION_API_KEY },
          })
        } catch (_e) {
          // ignorado a proposito
        }
      }

      return json({ success: true, action, instanceName, organizationName: org.name, suspendida })
    }

    // --- Delete: borra la instancia en Evolution API y en cascada todos los ---
    // datos de la organizacion en Supabase (cpls, cpls_lanzamientos, grupos,
    // user_roles). Es IRREVERSIBLE.

    // Salvaguarda del lado del servidor: no permitir borrar una instancia
    // que sigue conectada, aunque la UI ya lo impida.
    const stateRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${encodeURIComponent(instanceName)}`, {
      headers: { apikey: EVOLUTION_API_KEY },
    })
    if (stateRes.ok) {
      const stateData = await stateRes.json().catch(() => null)
      const status = stateData?.instance?.state ?? stateData?.state
      if (status === 'open') {
        return json({ error: 'La instancia sigue conectada. Desconéctala primero antes de eliminarla.' }, 409)
      }
    }

    const deleteRes = await fetch(`${EVOLUTION_API_URL}/instance/delete/${encodeURIComponent(instanceName)}`, {
      method: 'DELETE',
      headers: { apikey: EVOLUTION_API_KEY },
    })

    if (!deleteRes.ok && deleteRes.status !== 404) {
      const text = await deleteRes.text().catch(() => '')
      return json({ error: `Evolution API respondio ${deleteRes.status} al eliminar: ${text}` }, 502)
    }

    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('whatsapp_api_key', instanceName)
      .maybeSingle()

    if (orgError) {
      return json({ error: 'Instancia eliminada en Evolution API, pero no se pudo buscar la organización: ' + orgError.message }, 500)
    }

    if (!org) {
      // No hay organizacion asociada a esta instancia - nada mas que limpiar.
      return json({ success: true, action: 'delete', instanceName, organizationDeleted: false })
    }

    const [{ count: cplsCount }, { count: lanzCount }, { count: gruposCount }] = await Promise.all([
      supabaseAdmin.from('cpls').select('id', { count: 'exact', head: true }).eq('organization_id', org.id),
      supabaseAdmin.from('cpls_lanzamientos').select('id', { count: 'exact', head: true }).eq('organization_id', org.id),
      supabaseAdmin.from('grupos').select('id', { count: 'exact', head: true }).eq('organization_id', org.id),
    ])

    const { error: deleteOrgError } = await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', org.id)

    if (deleteOrgError) {
      return json({ error: 'Instancia eliminada en Evolution API, pero falló el borrado en cascada: ' + deleteOrgError.message }, 500)
    }

    return json({
      success: true,
      action: 'delete',
      instanceName,
      organizationDeleted: true,
      organizationName: org.name,
      cascaded: { cpls: cplsCount ?? 0, cpls_lanzamientos: lanzCount ?? 0, grupos: gruposCount ?? 0 },
    })
  } catch (error) {
    console.error('Error en evolution-instance-admin:', error)
    return json({ error: 'Error interno' }, 500)
  }
})
