export async function onRequestPost(context) {
  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const { request, env } = context;
    
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: corsHeaders,
      });
    }
    
    const { image } = body;

    if (!image) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Check for OpenAI API key - try multiple ways to access it
    const apiKey = env.OPENAI_API_KEY || context.env?.OPENAI_API_KEY;
    
    // Debug: Log available env keys (remove in production)
    console.log('Environment keys:', Object.keys(env || {}));

    if (!apiKey) {
      // Return demo data if no API key is configured
      return new Response(JSON.stringify({
        success: true,
        demo: true,
        analysis: {
          foods: [
            { name: 'Mat identifisert', calories: 350, protein: 20, carbs: 30, fat: 15, portion: '1 porsjon' }
          ],
          totalCalories: 350,
          totalProtein: 20,
          totalCarbs: 30,
          totalFat: 15,
          confidence: 'medium',
          description: 'API-nøkkel ikke funnet. Sjekk at OPENAI_API_KEY er lagt til som Secret i Cloudflare.',
        }
      }), {
        headers: corsHeaders,
      });
    }

    // Call OpenAI Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Du er en ernæringsekspert som analyserer bilder av mat. 
            Analyser bildet og estimer næringsverdier så nøyaktig som mulig.
            
            Returner ALLTID et JSON-objekt med denne strukturen:
            {
              "foods": [
                {
                  "name": "Navn på matvaren (på norsk)",
                  "calories": tall (kcal),
                  "protein": tall (gram),
                  "carbs": tall (gram),
                  "fat": tall (gram),
                  "portion": "estimert porsjonsstørrelse"
                }
              ],
              "totalCalories": tall,
              "totalProtein": tall,
              "totalCarbs": tall,
              "totalFat": tall,
              "confidence": "high" | "medium" | "low",
              "description": "Kort beskrivelse av måltidet"
            }
            
            Vær realistisk med porsjonsestimater basert på det du ser i bildet.
            Hvis du ikke kan identifisere maten, sett confidence til "low" og gi ditt beste estimat.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyser dette matbildet og estimer næringsverdiene. Returner kun JSON-objektet.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return new Response(JSON.stringify({ error: 'Failed to analyze image', details: error }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: 'No analysis returned' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Parse the JSON response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const analysis = JSON.parse(jsonMatch[0]);
      
      return new Response(JSON.stringify({
        success: true,
        analysis,
      }), {
        headers: corsHeaders,
      });
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return new Response(JSON.stringify({ 
        error: 'Failed to parse analysis',
        raw: content 
      }), {
        status: 500,
        headers: corsHeaders,
      });
    }

  } catch (error) {
    console.error('Error analyzing food:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle OPTIONS for CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
