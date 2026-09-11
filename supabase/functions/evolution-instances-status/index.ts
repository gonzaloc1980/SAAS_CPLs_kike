import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Estas dos NO van hardcodeadas en el codigo - se configuran como secrets:
//   supabase secrets set EVOLUTION_API_URL=https://... EVOLUTION_API_KEY=...
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? ''
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? ''

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cliente que actua COMO el usuario que llama (respeta su JWT), solo para
    // verificar quien es y si es super_admin - nunca usamos la service role aqui.
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: userData, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Sesion invalida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: isSuperAdmin, error: rpcError } = await supabaseUser.rpc('is_super_admin', {
      _user_id: userData.user.id,
    })

    if (rpcError || !isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return new Response(JSON.stringify({ error: 'Funcion mal configurada: faltan secrets EVOLUTION_API_URL/EVOLUTION_API_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const evoResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
      headers: { apikey: EVOLUTION_API_KEY },
    })

    if (!evoResponse.ok) {
      return new Response(JSON.stringify({ error: 'Evolution API respondio ' + evoResponse.status }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const instances = await evoResponse.json()

    const slim = (Array.isArray(instances) ? instances : []).map((i: any) => ({
      name: i.name,
      connectionStatus: i.connectionStatus,
      messageCount: i?._count?.Message ?? 0,
      disconnectionAt: i.disconnectionAt ?? null,
      updatedAt: i.updatedAt ?? null,
    }))

    return new Response(JSON.stringify({ instances: slim }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error en evolution-instances-status:', error)
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
