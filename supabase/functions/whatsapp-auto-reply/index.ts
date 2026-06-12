import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EVOLUTION_API_URL = 'https://agendador-evolution-api.6qgqpv.easypanel.host'
const EVOLUTION_API_KEY = '429683C4C977415CAAFCCE10F7D57E11'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    // Only handle incoming message events
    if (body.event !== 'messages.upsert') {
      return new Response(JSON.stringify({ ignored: true, reason: 'not a message event' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const data = body.data
    // Ignore messages sent by the instance itself
    if (!data || data.key?.fromMe === true) {
      return new Response(JSON.stringify({ ignored: true, reason: 'own message' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Only handle private chats (not group messages)
    const senderJid: string = data.key?.remoteJid ?? ''
    if (!senderJid || senderJid.endsWith('@g.us')) {
      return new Response(JSON.stringify({ ignored: true, reason: 'group message' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const instanceName: string = body.instance ?? ''
    const messageText: string = (
      data.message?.conversation ??
      data.message?.extendedTextMessage?.text ??
      ''
    ).trim()

    if (!instanceName || !messageText) {
      return new Response(JSON.stringify({ ignored: true, reason: 'missing data' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Strip @s.whatsapp.net / @c.us to get the bare number for sending
    const senderNumber = senderJid.replace(/@.*$/, '')

    // Use service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Look up the group whose identificador_meta matches the received text
    const { data: grupo, error } = await supabase
      .from('grupos')
      .select(`
        id,
        identificador_meta,
        mensaje_bienvenida,
        enlace_invitacion,
        organization_id,
        organizations (
          whatsapp_api_key,
          whatsapp_phone_number
        )
      `)
      .eq('identificador_meta', messageText)
      .maybeSingle()

    if (error) {
      console.error('DB lookup error:', error)
      throw error
    }

    if (!grupo) {
      return new Response(JSON.stringify({ matched: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Verify the webhook came from the right WhatsApp instance
    const org = Array.isArray(grupo.organizations) ? grupo.organizations[0] : grupo.organizations
    if (!org || org.whatsapp_api_key !== instanceName) {
      return new Response(JSON.stringify({ matched: false, reason: 'instance mismatch' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const sendText = async (text: string) => {
      const res = await fetch(
        `${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(instanceName)}`,
        {
          method: 'POST',
          headers: {
            'apikey': EVOLUTION_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ number: senderNumber, text }),
        }
      )
      if (!res.ok) {
        const err = await res.text()
        console.error('Evolution API sendText error:', res.status, err)
      }
    }

    // Send welcome message
    const bienvenida = grupo.mensaje_bienvenida?.trim() ||
      '¡Hola! Gracias por tu interés. Aquí tienes el enlace para unirte al grupo:'
    await sendText(bienvenida)

    // Send group invite link if available
    if (grupo.enlace_invitacion) {
      await sendText(grupo.enlace_invitacion)
    }

    return new Response(JSON.stringify({ success: true, matched: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Error in whatsapp-auto-reply:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
