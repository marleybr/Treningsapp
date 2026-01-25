import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentMeal, mealType, targetCalories, preferences } = body;

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: true,
        demo: true,
        suggestions: getDemoSuggestions(mealType),
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
            content: `Du er en ernæringsekspert som foreslår sunne måltidsalternativer på norsk.
            
            Gi 3 alternative måltider som passer til brukerens mål.
            Fokuser på norske matvarer og realistiske oppskrifter.
            
            Returner ALLTID et JSON-objekt med denne strukturen:
            {
              "suggestions": [
                {
                  "name": "Måltidsnavn",
                  "description": "Kort beskrivelse",
                  "calories": tall,
                  "protein": tall,
                  "carbs": tall,
                  "fat": tall,
                  "ingredients": ["ingrediens1", "ingrediens2"],
                  "prepTime": "10 min",
                  "tags": ["proteinrik", "lavkarbo", etc]
                }
              ]
            }`
          },
          {
            role: 'user',
            content: `Gi meg 3 alternative ${mealType === 'breakfast' ? 'frokoster' : 
                                            mealType === 'lunch' ? 'lunsjer' : 
                                            mealType === 'dinner' ? 'middager' : 'mellommåltider'}.
            
            ${currentMeal ? `Nåværende måltid: ${currentMeal}` : ''}
            Målkalorier for dette måltidet: ca ${targetCalories} kcal
            ${preferences ? `Preferanser: ${preferences}` : ''}
            
            Gi varierte forslag med forskjellige ingredienser.
            Returner kun JSON-objektet.`
          }
        ],
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return NextResponse.json({ error: 'Failed to get suggestions', details: error }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'No suggestions returned' }, { status: 500 });
    }

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const result = JSON.parse(jsonMatch[0]);
      
      return NextResponse.json({
        success: true,
        suggestions: result.suggestions,
      });
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json({ 
        error: 'Failed to parse suggestions',
        raw: content 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error getting meal suggestions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getDemoSuggestions(mealType: string) {
  const suggestions: Record<string, any[]> = {
    breakfast: [
      {
        name: 'Proteinrik smoothie bowl',
        description: 'Kremet smoothie bowl med bær og granola',
        calories: 400,
        protein: 25,
        carbs: 45,
        fat: 12,
        ingredients: ['Gresk yoghurt', 'Banan', 'Blåbær', 'Proteinpulver', 'Granola'],
        prepTime: '5 min',
        tags: ['proteinrik', 'rask'],
      },
      {
        name: 'Eggerøre med laks',
        description: 'Fluffy eggerøre med røkt laks og avokado',
        calories: 450,
        protein: 30,
        carbs: 15,
        fat: 32,
        ingredients: ['Egg', 'Røkt laks', 'Avokado', 'Gressløk', 'Smør'],
        prepTime: '10 min',
        tags: ['lavkarbo', 'proteinrik'],
      },
      {
        name: 'Overnight oats',
        description: 'Ferdig frokost med havre, chiafrø og frukt',
        calories: 380,
        protein: 15,
        carbs: 55,
        fat: 10,
        ingredients: ['Havregryn', 'Melk', 'Chiafrø', 'Honning', 'Eple'],
        prepTime: '5 min (kvelden før)',
        tags: ['fiberrik', 'meal prep'],
      },
    ],
    lunch: [
      {
        name: 'Kyllingwrap',
        description: 'Fullkornswrap med grillet kylling og hummus',
        calories: 480,
        protein: 35,
        carbs: 40,
        fat: 18,
        ingredients: ['Fullkornswrap', 'Kyllingbryst', 'Hummus', 'Salat', 'Tomat'],
        prepTime: '15 min',
        tags: ['proteinrik', 'take-away vennlig'],
      },
      {
        name: 'Laksesalat',
        description: 'Frisk salat med varmrøkt laks og fetaost',
        calories: 420,
        protein: 28,
        carbs: 20,
        fat: 26,
        ingredients: ['Varmrøkt laks', 'Blandet salat', 'Fetaost', 'Olivenolje', 'Sitron'],
        prepTime: '10 min',
        tags: ['lavkarbo', 'omega-3'],
      },
      {
        name: 'Quinoabolle',
        description: 'Næringsrik bolle med quinoa, grønnsaker og egg',
        calories: 450,
        protein: 22,
        carbs: 48,
        fat: 18,
        ingredients: ['Quinoa', 'Spinat', 'Kikerter', 'Egg', 'Tahini'],
        prepTime: '20 min',
        tags: ['vegetar', 'fiberrik'],
      },
    ],
    dinner: [
      {
        name: 'Ovnsbakt kylling med rotgrønnsaker',
        description: 'Saftig kylling med sesonggrønnsaker',
        calories: 520,
        protein: 40,
        carbs: 35,
        fat: 22,
        ingredients: ['Kyllinglår', 'Søtpotet', 'Gulrot', 'Løk', 'Rosmarin'],
        prepTime: '45 min',
        tags: ['proteinrik', 'familievennlig'],
      },
      {
        name: 'Pasta med kjøttsaus',
        description: 'Klassisk italiensk med fullkornspasta',
        calories: 580,
        protein: 32,
        carbs: 65,
        fat: 18,
        ingredients: ['Fullkornspasta', 'Kjøttdeig', 'Tomatsaus', 'Løk', 'Hvitløk'],
        prepTime: '30 min',
        tags: ['klassiker', 'meal prep'],
      },
      {
        name: 'Taco fredag',
        description: 'Sunne tacos med magert kjøtt og masse grønt',
        calories: 500,
        protein: 28,
        carbs: 45,
        fat: 22,
        ingredients: ['Tacoskjell', 'Kyllingkjøttdeig', 'Mais', 'Paprika', 'Rømme'],
        prepTime: '25 min',
        tags: ['familievennlig', 'populær'],
      },
    ],
    snack: [
      {
        name: 'Proteinbar hjemmelaget',
        description: 'Sunn bar med nøtter og sjokolade',
        calories: 180,
        protein: 12,
        carbs: 18,
        fat: 8,
        ingredients: ['Havregryn', 'Peanøttsmør', 'Proteinpulver', 'Honning'],
        prepTime: '15 min + kjøling',
        tags: ['proteinrik', 'meal prep'],
      },
      {
        name: 'Gresk yoghurt med honning',
        description: 'Enkel og mettende snack',
        calories: 150,
        protein: 15,
        carbs: 12,
        fat: 4,
        ingredients: ['Gresk yoghurt', 'Honning', 'Valnøtter'],
        prepTime: '2 min',
        tags: ['rask', 'proteinrik'],
      },
      {
        name: 'Frukt og nøttemix',
        description: 'Energigivende blanding',
        calories: 200,
        protein: 5,
        carbs: 25,
        fat: 10,
        ingredients: ['Mandler', 'Rosiner', 'Eple', 'Mørk sjokolade'],
        prepTime: '1 min',
        tags: ['rask', 'take-away'],
      },
    ],
  };

  return suggestions[mealType] || suggestions.snack;
}
