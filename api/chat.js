import fetch from 'node-fetch';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');  // Change '*' to your frontend domain for production
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    // Respond to preflight request
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { messages } = req.body;

    if (!messages) {
      res.status(400).json({ error: 'Missing messages in request body' });
      return;
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, // set this in Vercel env vars
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: messages,
        stream: true
      })
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      res.status(groqResponse.status).json({ error: errorText });
      return;
    }

    // Stream response directly to client
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const reader = groqResponse.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value));
    }
    res.end();

  } catch (error) {
    console.error('Backend error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
