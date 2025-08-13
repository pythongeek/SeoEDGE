import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// This function is the handler for the serverless function.
export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const { prompt, schema } = request.body;

  if (!prompt || !schema) {
    return response.status(400).json({ message: 'Missing prompt or schema in request body.' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY environment variable not set.");
      return response.status(500).json({ message: 'Server configuration error: AI API key not set.' });
    }

    // Initialize the Google AI client on the server
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    // Construct the full prompt for the model
    const fullPrompt = `${prompt}\n\nReturn your response as a JSON object that strictly adheres to the following JSON schema. Do not include any other text or explanations:\n\n${JSON.stringify(schema)}`;

    const result = await model.generateContent(fullPrompt);
    const aiResponse = result.response;
    const jsonText = aiResponse.text();

    // The response from the AI is expected to be a JSON string.
    // We parse it to ensure it's valid before sending it back to the client.
    const validatedJson = JSON.parse(jsonText);

    return response.status(200).json(validatedJson);

  } catch (error: any) {
    console.error('Error calling Gemini API:', error);
    return response.status(500).json({ message: 'An error occurred while communicating with the AI service.', details: error.message });
  }
}
