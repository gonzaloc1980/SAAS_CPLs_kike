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

    if (action !== 'logout' && action !== 'delete') {
      return json({ error: "action debe ser 'logout' o 'delete'" }, 400)
    }

    // --- Logout: cierra la sesion de WhatsApp, la instancia sigue existiendo ---
    // (el cliente puede volver a conectarse escaneando el QR). No toca la BD.
    if (action === 'logout') {
      const evoRes = await fetch(`${EVOLUTION_API_URL}/instance/logout/${encodeURIComponent(instanceName)}`, {
        method: 'DELETE',
        headers: { apikey: EVOLUTION_API_KEY },
      })

      if (!evoRes.ok && evoRes.status !== 404) {
        const text = await evoRes.text().catch(() => '')
        return json({ error: `Evolution API respondio ${evoRes.status} al desconectar: ${text}` }, 502)
      }

      return json({ success: true, action: 'logout', instanceName })
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

    // A partir de aca usamos la service role: borrar la organizacion (y en
    // cascada sus datos) requiere privilegios que el usuario final no tiene.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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
