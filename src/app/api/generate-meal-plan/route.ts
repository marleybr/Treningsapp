import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profile, targetCalories, macros } = body;

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: true,
        demo: true,
        plan: getDemoPlan(targetCalories, macros),
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
            content: `Du er en ernæringsekspert som lager personlige kostholdsplaner på norsk.
            
            Lag en detaljert ukesplan basert på brukerens mål og preferanser.
            Fokuser på norske matvarer og realistiske porsjoner.
            
            Returner ALLTID et JSON-objekt med denne strukturen:
            {
              "weekPlan": {
                "monday": {
                  "dayName": "Mandag",
                  "meals": {
                    "breakfast": { "name": "Måltidsnavn", "description": "Beskrivelse", "calories": tall, "protein": tall, "carbs": tall, "fat": tall, "ingredients": ["ingrediens1", "ingrediens2"] },
                    "lunch": { ... },
                    "dinner": { ... },
                    "snacks": [{ "name": "...", "calories": tall, "protein": tall, "carbs": tall, "fat": tall }]
                  },
                  "totalCalories": tall,
                  "totalProtein": tall,
                  "totalCarbs": tall,
                  "totalFat": tall
                },
                "tuesday": { ... },
                "wednesday": { ... },
                "thursday": { ... },
                "friday": { ... },
                "saturday": { ... },
                "sunday": { ... }
              },
              "tips": ["tips1", "tips2", "tips3"],
              "shoppingList": ["vare1", "vare2", ...],
              "summary": "Kort oppsummering av planen"
            }
            
            Vær realistisk og sørg for at daglig inntak er nær målkalorier.
            Inkluder varierte og smakfulle måltider.`
          },
          {
            role: 'user',
            content: `Lag en personlig ukeskostholdsplan for meg:
            
            - Daglig kaloriemål: ${targetCalories} kcal
            - Proteinmål: ${macros.protein}g
            - Karbohydratmål: ${macros.carbs}g  
            - Fettmål: ${macros.fat}g
            - Mål: ${profile.fitnessGoal === 'lose_weight' ? 'Gå ned i vekt' : 
                    profile.fitnessGoal === 'build_muscle' ? 'Bygge muskler' :
                    profile.fitnessGoal === 'maintain' ? 'Vedlikeholde vekt' : 'Forbedre fitness'}
            - Kjønn: ${profile.gender === 'male' ? 'Mann' : profile.gender === 'female' ? 'Kvinne' : 'Annet'}
            - Aktivitetsnivå: ${profile.activityLevel}
            
            Gi meg en komplett ukesplan med frokost, lunsj, middag og mellommåltider.
            Returner kun JSON-objektet.`
          }
        ],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return NextResponse.json({ error: 'Failed to generate plan', details: error }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'No plan returned' }, { status: 500 });
    }

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const plan = JSON.parse(jsonMatch[0]);
      
      return NextResponse.json({
        success: true,
        plan,
      });
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json({ 
        error: 'Failed to parse plan',
        raw: content 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error generating meal plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getDemoPlan(targetCalories: number, macros: { protein: number; carbs: number; fat: number }) {
  return {
    weekPlan: {
      monday: createDemoDay('Mandag', targetCalories, macros),
      tuesday: createDemoDay('Tirsdag', targetCalories, macros),
      wednesday: createDemoDay('Onsdag', targetCalories, macros),
      thursday: createDemoDay('Torsdag', targetCalories, macros),
      friday: createDemoDay('Fredag', targetCalories, macros),
      saturday: createDemoDay('Lørdag', targetCalories, macros),
      sunday: createDemoDay('Søndag', targetCalories, macros),
    },
    tips: [
      'Drikk minst 2 liter vann daglig',
      'Spis sakte og nyt maten',
      'Planlegg måltidene dine på forhånd',
    ],
    shoppingList: ['Egg', 'Havregryn', 'Kyllingbryst', 'Brokkoli', 'Ris', 'Laks', 'Spinat', 'Cottage cheese'],
    summary: 'Demo-kostholdsplan. Legg til OPENAI_API_KEY for personalisert plan.',
  };
}

function createDemoDay(dayName: string, targetCalories: number, macros: { protein: number; carbs: number; fat: number }) {
  const breakfastCals = Math.round(targetCalories * 0.25);
  const lunchCals = Math.round(targetCalories * 0.30);
  const dinnerCals = Math.round(targetCalories * 0.30);
  const snackCals = Math.round(targetCalories * 0.15);

  return {
    dayName,
    meals: {
      breakfast: {
        name: 'Havregrøt med bær',
        description: 'Næringsrik start på dagen med havregryn, melk, og friske bær',
        calories: breakfastCals,
        protein: Math.round(macros.protein * 0.25),
        carbs: Math.round(macros.carbs * 0.30),
        fat: Math.round(macros.fat * 0.20),
        ingredients: ['Havregryn', 'Melk', 'Blåbær', 'Honning'],
      },
      lunch: {
        name: 'Kyllingsalat',
        description: 'Proteinrik salat med grillet kylling og grønnsaker',
        calories: lunchCals,
        protein: Math.round(macros.protein * 0.35),
        carbs: Math.round(macros.carbs * 0.25),
        fat: Math.round(macros.fat * 0.30),
        ingredients: ['Kyllingbryst', 'Blandet salat', 'Tomat', 'Agurk', 'Olivenolje'],
      },
      dinner: {
        name: 'Laks med grønnsaker',
        description: 'Ovnsbakt laks med dampede grønnsaker og ris',
        calories: dinnerCals,
        protein: Math.round(macros.protein * 0.30),
        carbs: Math.round(macros.carbs * 0.35),
        fat: Math.round(macros.fat * 0.35),
        ingredients: ['Laksefilet', 'Brokkoli', 'Ris', 'Sitron'],
      },
      snacks: [
        { name: 'Gresk yoghurt', calories: snackCals, protein: Math.round(macros.protein * 0.10), carbs: Math.round(macros.carbs * 0.10), fat: Math.round(macros.fat * 0.15) },
      ],
    },
    totalCalories: targetCalories,
    totalProtein: macros.protein,
    totalCarbs: macros.carbs,
    totalFat: macros.fat,
  };
}
