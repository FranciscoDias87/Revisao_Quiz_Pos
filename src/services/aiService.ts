import { GoogleGenAI, Type } from "@google/genai";
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface GeneratedTopic {
  title: string;
  content: string;
}

export interface GeneratedQuestion {
  block: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export const generateContentFromText = async (text: string, moduleId: string) => {
  const model = "gemini-3-flash-preview";
  
  // 1. Generate Study Topic
  const topicPrompt = `
    Com base no texto abaixo sobre Educação e Avaliação, gere um resumo estruturado para revisão.
    O texto deve ser didático, em português, e focado em pontos chave para concursos pedagógicos.
    
    Texto: ${text.substring(0, 8000)}
    
    Retorne no formato JSON:
    {
      "title": "Título do Tópico",
      "content": "Conteúdo formatado"
    }
  `;

  const topicResponse = await ai.models.generateContent({
    model,
    contents: topicPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING }
        },
        required: ["title", "content"]
      }
    }
  });

  const generatedTopic: GeneratedTopic = JSON.parse(topicResponse.text);

  // 2. Generate 3 Questions
  const questionsPrompt = `
    Gere 3 questões de múltipla escolha (A, B, C, D) baseadas no seguinte tópico: "${generatedTopic.title}".
    O conteúdo é: "${generatedTopic.content}".
    As questões devem ser de nível difícil, simulando concursos.
    Inclua uma explicação detalhada para a alternativa correta.
    
    Retorne um ARRAY de objetos JSON:
    [
      {
        "block": "Nome do Bloco Temático",
        "text": "Enunciado da questão",
        "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
        "correctAnswer": 0,
        "explanation": "Explicação pedagógica"
      }
    ]
  `;

  const questionsResponse = await ai.models.generateContent({
    model,
    contents: questionsPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            block: { type: Type.STRING },
            text: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.NUMBER },
            explanation: { type: Type.STRING }
          },
          required: ["block", "text", "options", "correctAnswer", "explanation"]
        }
      }
    }
  });

  const generatedQuestions: GeneratedQuestion[] = JSON.parse(questionsResponse.text);

  return { generatedTopic, generatedQuestions };
};

export const saveGeneratedContent = async (moduleId: string, topic: GeneratedTopic, questions: GeneratedQuestion[]) => {
  // Save Topic
  const topicRef = await addDoc(collection(db, 'topics'), {
    ...topic,
    moduleId,
    order: Date.now(),
    createdAt: serverTimestamp()
  });

  // Save Questions
  for (const q of questions) {
    await addDoc(collection(db, 'questions'), {
      ...q,
      moduleId,
      createdAt: serverTimestamp()
    });
  }

  return { topicId: topicRef.id };
};
