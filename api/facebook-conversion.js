export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

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

  if (!accessToken || !pixelId) {
    return res.status(500).json({ message: 'Faltan variables de entorno' });
  }

  const payload = {
    data: [
      {
        event_name,
        event_time,
        event_id,
        event_source_url,
        user_data: {
          client_user_agent: user_agent,
          fbp,
          fbc
        },
        custom_data: {
          currency,
          value
        },
        action_source: 'website'
      }
    ]
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error al enviar a Meta:', error);
    res.status(500).json({ error: 'Error al enviar evento a Meta' });
  }
}
