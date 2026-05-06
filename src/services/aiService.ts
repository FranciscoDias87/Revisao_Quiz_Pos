import { GoogleGenAI, Type } from "@google/genai";
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface GeneratedTopic {
  title: string;
  content: string;
  readingTime?: string;
}

export interface GeneratedQuestion {
  block: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  type: 'objective' | 'true_false' | 'subjective';
}

export const generateContentFromText = async (text: string, moduleId: string) => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analise o texto pedagógico fornecido e gere um conteúdo de revisão estruturado e um banco de 30 questões variadas.
    
    O RETORNO DEVE SER ESTRITAMENTE UM JSON COM ESTA ESTRUTURA:
    {
      "topic": {
        "title": "Título Curto",
        "content": "Conteúdo pedagógico em Markdown bem formatado",
        "readingTime": "X min"
      },
      "questions": [
        {
          "text": "Enunciado contextualizado...",
          "options": ["A", "B", "C", "D"], // Opcional: apenas para questões objetivas e V/F
          "correctAnswer": 0, // Índice da opção correta
          "explanation": "Explicação pedagógica completa...",
          "type": "objective", // "objective", "true_false", or "subjective"
          "block": "Nome do Bloco de Conhecimento"
        }
      ]
    }

    REGRAS PARA AS 30 QUESTÕES:
    1. CONTEXTUALIZAÇÃO: Todas as questões devem apresentar um cenário, caso clínico, relato de sala de aula ou fragmento de autor antes da pergunta.
    2. TIPOS DE QUESTÕES:
       - 10 Questões OBJETIVAS (opções de A a D).
       - 10 Questões de VERDADEIRO OU FALSO (usar options: ["Verdadeiro", "Falso"]).
       - 10 Questões SUBJETIVAS (usar options: [], e na explicação colocar a resposta esperada/padrão).
    3. LINGUAGEM: Técnica, acadêmica e baseada estritamente no texto fornecido.
    4. VARIABILIDADE: Cubra todos os pontos principais do texto.

    Texto para análise:
    ${text.substring(0, 15000)}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              readingTime: { type: Type.STRING }
            },
            required: ["title", "content"]
          },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                block: { type: Type.STRING },
                text: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.NUMBER },
                explanation: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["objective", "true_false", "subjective"] }
              },
              required: ["block", "text", "options", "correctAnswer", "explanation", "type"]
            }
          }
        },
        required: ["topic", "questions"]
      }
    }
  });

  const data = JSON.parse(response.text);
  return { generatedTopic: data.topic, generatedQuestions: data.questions };
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
