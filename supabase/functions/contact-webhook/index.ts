
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { nombre, correo, whatsapp, mensaje } = await req.json()

    // Obtener la URL del webhook desde las variables de entorno
    const webhookUrl = Deno.env.get('CONTACT_WEBHOOK_URL')
    
    if (!webhookUrl) {
      console.log('CONTACT_WEBHOOK_URL no configurada')
      return new Response(
        JSON.stringify({ success: false, error: 'Webhook URL no configurada' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Enviar los datos al webhook externo
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nombre,
        correo,
        whatsapp,
        mensaje,
        timestamp: new Date().toISOString()
      })
    })

    if (!webhookResponse.ok) {
      throw new Error(`Webhook failed: ${webhookResponse.status}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook enviado exitosamente' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error en webhook:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
