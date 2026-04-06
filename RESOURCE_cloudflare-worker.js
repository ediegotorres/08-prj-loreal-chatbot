export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Use POST for chat requests.' }),
        { status: 405, headers: corsHeaders }
      );
    }

    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing OPENAI_API_KEY secret in Cloudflare Worker.' }),
        { status: 500, headers: corsHeaders }
      );
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Request body must be valid JSON.' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Request body must include a non-empty messages array.' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const requestBody = {
      model: 'gpt-4o-mini',
      messages: payload.messages,
      max_completion_tokens: 350
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: data.error?.message || 'OpenAI request failed.',
          details: data
        }),
        {
          status: response.status,
          headers: corsHeaders
        }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: corsHeaders
    });
  }
};
