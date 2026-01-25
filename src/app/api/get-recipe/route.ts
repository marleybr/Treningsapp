import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mealName, ingredients } = body;

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: true,
        demo: true,
        recipe: getDemoRecipe(mealName),
      });
    }

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
            content: `Du er en kokk som gir enkle oppskrifter på norsk.
            
            Gi en kort og enkel oppskrift som er lett å følge.
            
            Returner ALLTID et JSON-objekt med denne strukturen:
            {
              "title": "Oppskriftsnavn",
              "prepTime": "10 min",
              "cookTime": "20 min",
              "servings": 2,
              "ingredients": [
                "200g ingrediens",
                "1 ss ingrediens"
              ],
              "steps": [
                "Steg 1: Gjør dette...",
                "Steg 2: Deretter..."
              ],
              "tips": "Et nyttig tips"
            }`
          },
          {
            role: 'user',
            content: `Gi meg en enkel oppskrift for: ${mealName}
            ${ingredients ? `Ingredienser: ${ingredients.join(', ')}` : ''}
            
            Hold det enkelt med maks 5-6 steg.
            Returner kun JSON-objektet.`
          }
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: 'Failed to get recipe', details: error }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'No recipe returned' }, { status: 500 });
    }

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      
      const recipe = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ success: true, recipe });
    } catch {
      return NextResponse.json({ error: 'Failed to parse recipe' }, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getDemoRecipe(mealName: string) {
  return {
    title: mealName,
    prepTime: '10 min',
    cookTime: '15 min',
    servings: 2,
    ingredients: [
      '200g hovedingrediens',
      '1 ss olivenolje',
      'Salt og pepper',
      'Valgfrie grønnsaker',
    ],
    steps: [
      'Forbered alle ingrediensene',
      'Varm opp en stekepanne med olivenolje',
      'Tilsett hovedingrediensen og stek i 5-7 minutter',
      'Krydre med salt og pepper',
      'Server og nyt!',
    ],
    tips: 'Demo-oppskrift. Legg til OPENAI_API_KEY for ekte AI-genererte oppskrifter.',
  };
}
