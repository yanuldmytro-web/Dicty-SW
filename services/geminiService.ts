import { GoogleGenAI, Type } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const wordDetailsSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      swedish_display_form: {
        type: Type.STRING,
        description: 'Шведське слово з відповідним артиклем (en/ett) в дужках для іменників, або з інфінітивною часткою (att) в дужках для дієслів. Для інших частин мови - просто оригінальне слово.',
      },
      part_of_speech: {
        type: Type.STRING,
        description: 'Частина мови слова, наприклад: іменник, дієслово, прикметник, прислівник, займенник.',
      },
      ukrainian_translation: {
        type: Type.STRING,
        description: 'Переклад шведського слова на українську мову для цієї частини мови.',
      },
      example_sentence_swedish: {
        type: Type.STRING,
        description: 'Просте речення-приклад шведською мовою з використанням цього слова як цієї частини мови.',
      },
      example_sentence_ukrainian: {
        type: Type.STRING,
        description: 'Переклад речення-прикладу на українську мову.',
      },
    },
    required: ['swedish_display_form', 'part_of_speech', 'ukrainian_translation', 'example_sentence_swedish', 'example_sentence_ukrainian'],
  }
};

const newExampleSchema = {
    type: Type.OBJECT,
    properties: {
      example_sentence_swedish: {
        type: Type.STRING,
        description: 'Нове, просте речення-приклад шведською мовою з використанням слова.',
      },
      example_sentence_ukrainian: {
        type: Type.STRING,
        description: 'Переклад нового речення-прикладу на українську мову.',
      },
    },
    required: ['example_sentence_swedish', 'example_sentence_ukrainian'],
  };

export interface WordDetailsResponse {
  swedish_display_form: string;
  part_of_speech: string;
  ukrainian_translation: string;
  example_sentence_swedish: string;
  example_sentence_ukrainian: string;
}

export interface NewExampleResponse {
    example_sentence_swedish: string;
    example_sentence_ukrainian: string;
}

export async function fetchWordDetails(swedishWord: string): Promise<WordDetailsResponse[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Надай український переклад, частину мови, простий приклад речення шведською та український переклад цього речення для шведського слова: "${swedishWord}".
- Якщо частина мови - іменник, у полі swedish_display_form поверни слово з його артиклем у дужках (наприклад, "bil (en)").
- Якщо частина мови - дієслово (в інфінітиві), у полі swedish_display_form поверни слово з часткою "att" у дужках (наприклад, "dricka (att)").
- Для всіх інших частин мови у полі swedish_display_form поверни оригінальне слово без змін.
Якщо слово може бути різними частинами мови, надай окремий запис для кожної. Поверни результат у вигляді JSON масиву.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: wordDetailsSchema,
      },
    });

    const jsonText = response.text.trim();
    const data = JSON.parse(jsonText) as WordDetailsResponse[];
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error("AI response is not a valid array or is empty.");
    }
    return data;
  } catch (error) {
    console.error("Error fetching word details from Gemini API:", error);
    throw new Error("Не вдалося отримати дані від AI. Будь ласка, спробуйте ще раз.");
  }
}

export async function fetchNewExample(swedishWord: string, existingExamples: string[]): Promise<NewExampleResponse> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Надай НОВИЙ, простий приклад речення шведською для слова "${swedishWord}" та його український переклад. Не повторюй такі приклади: ${existingExamples.join('; ')}.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: newExampleSchema,
        },
      });
  
      const jsonText = response.text.trim();
      const data = JSON.parse(jsonText) as NewExampleResponse;
      return data;
    } catch (error) {
      console.error("Error fetching new example from Gemini API:", error);
      throw new Error("Не вдалося отримати новий приклад від AI. Будь ласка, спробуйте ще раз.");
    }
  }