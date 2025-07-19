export default async function handler(req, res) {
  // Agregar headers CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  console.log('Recibido:', req.body);

  const {
    event_name,
    event_time,
    event_id,
    event_source_url,
    user_agent,
    fbp,
    fbc,
    currency,
    value
  } = req.body;

  const accessToken = process.env.ACCESS_TOKEN;
  const pixelId = process.env.META_PIXEL_ID;

  console.log('Variables de entorno:', {
    accessToken: accessToken ? 'PRESENTE' : 'FALTANTE',
    pixelId: pixelId ? 'PRESENTE' : 'FALTANTE'
  });

  if (!accessToken || !pixelId) {
    console.error('Faltan variables de entorno');
    return res.status(500).json({ 
      message: 'Faltan variables de entorno',
      debug: {
        accessToken: !!accessToken,
        pixelId: !!pixelId
      }
    });
  }

  // Validar datos requeridos
  if (!event_name || !event_time || !event_id) {
    console.error('Faltan datos requeridos:', { event_name, event_time, event_id });
    return res.status(400).json({
      message: 'Faltan datos requeridos',
      required: ['event_name', 'event_time', 'event_id']
    });
  }

  const payload = {
    data: [
      {
        event_name,
        event_time,
        event_id,
        event_source_url: event_source_url || '',
        user_data: {
          client_user_agent: user_agent || '',
          fbp: fbp || undefined,
          fbc: fbc || undefined
        },
        custom_data: {
          currency: currency || 'USD',
          value: parseFloat(value) || 1.0,
          content_name: 'VIP Casino Lead'
        },
        action_source: 'website'
      }
    ]
    // SIN test_event_code - eventos van a producción
  };

  // Limpiar datos undefined
  if (!payload.data[0].user_data.fbp) delete payload.data[0].user_data.fbp;
  if (!payload.data[0].user_data.fbc) delete payload.data[0].user_data.fbc;

  console.log('Payload a enviar:', JSON.stringify(payload, null, 2));

  try {
    const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;
    console.log('URL de envío:', url.replace(accessToken, 'ACCESS_TOKEN_HIDDEN'));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Function/1.0'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    console.log('Respuesta de Facebook:', {
      status: response.status,
      statusText: response.statusText,
      data: data
    });

    if (!response.ok) {
      console.error('Error de Facebook:', data);
      return res.status(response.status).json({
        error: 'Error de Facebook API',
        details: data,
        payload: payload
      });
    }

    // Verificar si hay errores en la respuesta
    if (data.events_received !== undefined && data.events_received === 0) {
      console.warn('Facebook no recibió eventos:', data);
    }

    res.status(200).json({
      success: true,
      facebook_response: data,
      events_sent: 1,
      event_id: event_id
    });
    
  } catch (error) {
    console.error('Error al enviar a Meta:', error);
    res.status(500).json({ 
      error: 'Error al enviar evento a Meta',
      details: error.message,
      payload: payload
    });
  }
}
