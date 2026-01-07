import { GoogleGenAI, Type, Schema } from '@google/genai';
import { ContentPackage } from '@/types';

const API_KEY = process.env.GEMINI_API_KEY || '';

// Define the response schema using the @google/genai Type enum
const contentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    project_title: {
      type: Type.STRING,
      description: 'A catchy title for the content project.',
    },
    newsletter: {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING, description: 'Email subject line.' },
        body: { type: Type.STRING, description: 'Email body content in rich text/markdown.' },
      },
      required: ['subject', 'body'],
    },
    twitter_thread: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'An array of 5-8 tweets forming a thread.',
    },
    linkedin_post: {
      type: Type.STRING,
      description: 'A professional LinkedIn post.',
    },
    blog_post: {
      type: Type.STRING,
      description: 'A full SEO-optimized blog post in Markdown format.',
    },
  },
  required: ['project_title', 'newsletter', 'twitter_thread', 'linkedin_post', 'blog_post'],
};

export interface GenerationProgress {
  status: string;
  progress: number;
}

export const generateContentFromVideo = async (
  base64Data: string,
  mimeType: string,
  onProgress?: (progress: GenerationProgress) => void
): Promise<ContentPackage> => {
  if (!API_KEY) {
    throw new Error('Missing GEMINI_API_KEY environment variable');
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  onProgress?.({ status: 'Initializing AI analysis...', progress: 10 });

  try {
    onProgress?.({ status: 'Analyzing video with Gemini 2.0...', progress: 30 });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: `Analyze this video content and generate a comprehensive marketing suite.
            
            Personas:
            - Newsletter: Expert Curator. Tone: Personal, insightful, helpful.
            - Twitter: Viral Architect. Tone: Punchy, hook-driven, high-engagement.
            - LinkedIn: Thought Leader. Tone: Professional, authoritative, industry-focused.
            - Blog: SEO Specialist. Tone: Informative, structured with H2/H3 headers, long-form.
            
            Return the output in JSON format matching the schema.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: contentSchema,
        systemInstruction: 'You are ClipInsight AI, an elite content repurposing engine.',
      },
    });

    onProgress?.({ status: 'Processing response...', progress: 80 });

    const text = response.text;
    if (!text) throw new Error('No response generated');

    onProgress?.({ status: 'Complete!', progress: 100 });

    const data = JSON.parse(text) as ContentPackage;
    return data;
  } catch (error) {
    console.error('Gemini Error:', error);
    throw error;
  }
};

