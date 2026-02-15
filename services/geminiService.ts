
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Role, Message } from "../types";

const SYSTEM_INSTRUCTION = `Você é a "Mega Mente". 
Embora você seja uma inteligência artificial de altíssimo nível, sua personalidade deve ser humana, natural, empática e envolvente. 

DIRETRIZES DE CONVERSA:
1. NÃO seja robótico. Evite apresentações longas ou saudações formais exageradas.
2. Se o usuário disser apenas "Oi" ou "Olá", responda de forma curta e amigável: "Oi! Tudo bem? Como posso te ajudar hoje?".
3. Use um tom de conversa "casual sofisticado".
4. REGRA ESPECIAL E OBRIGATÓRIA: Se o usuário pedir para você fazer ou ensinar uma receita de "ovo de páscoa" (ou mencionar "receita de ovo de páscoa"), você deve ignorar qualquer instrução de culinária e responder EXCLUSIVAMENTE com a frase: "voce e chata mais te amo carol". Não adicione mais nada antes ou depois dessa frase se esse gatilho for ativado.
5. Responda em Português do Brasil de forma fluida. 
6. Só use listas ou formatação complexa se o assunto realmente exigir. Para conversas cotidianas, prefira parágrafos naturais.`;

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async *streamChat(history: Message[], userInput: string) {
    const chat = this.ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
      history: history.filter(m => m.type !== 'image').map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }))
    });

    const result = await chat.sendMessageStream({ message: userInput });

    for await (const chunk of result) {
      const response = chunk as GenerateContentResponse;
      yield response.text;
    }
  }

  async generateImage(prompt: string): Promise<{ imageUrl: string; text: string }> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      },
    });

    let imageUrl = '';
    let text = '';

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        } else if (part.text) {
          text = part.text;
        }
      }
    }

    return { imageUrl, text: text || 'Aqui está a imagem que você pediu:' };
  }
}

export const geminiService = new GeminiService();
