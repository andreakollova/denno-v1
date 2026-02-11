import { GoogleGenAI, Type, Chat } from "@google/genai";
import { Article, DailyDigest, DigestSection, PersonaType, LearningPack } from '../types';
import { getSystemInstructionContent } from '../constants';
import { fetchTextWithFallback } from './rssService';

const getAiClient = () => {
  const apiKey = process.env.API_KEY || "";
  
  if (!apiKey || apiKey === "" || apiKey === "undefined") {
    console.error("❌ CHYBA: Chýba API kľúč! Skontrolujte nastavenia projektu.");
    throw new Error("V aplikácii chýba platný API kľúč. Skontrolujte nastavenia projektu.");
  }
  
  return new GoogleGenAI({ apiKey });
};

const TAG_MAPPINGS: Record<string, string> = {
  'umelá inteligencia': 'AI',
  'artificial intelligence': 'AI',
  'životné prostredie': 'Ekológia',
  'sociálne siete': 'Social',
  'kybernetická bezpečnosť': 'Kyber',
  'virtuálna realita': 'VR',
  'rozšírená realita': 'AR',
  'kvantové počítanie': 'Kvantum',
  'pozemný hokej': 'Hokej',
  'športový marketing': 'Marketing',
  'alternatívne bielkoviny': 'Potraviny',
  'duševné zdravie': 'Psychológia',
  'klimatické zmeny': 'Klíma',
  'smart home': 'IoT',
  'európska únia': 'EÚ',
  'ľudské zdroje': 'HR',
  'fúzie a akvizície': 'Dealy',
  'spotrebná elektronika': 'Gadgets',
  'obnoviteľné zdroje': 'Energia',
  'vesmírny výskum': 'Vesmír',
  'globálna politika': 'Politika',
  'stredný východ': 'Konflikt',
  'cestovný ruch': 'Travel',
  'hry a e-šport': 'Gaming',
  'ui/ux dizajn': 'Dizajn',
  'ux dizajn': 'UX'
};

const sanitizeTag = (tag: string): string => {
  const lower = tag.toLowerCase().trim();
  if (TAG_MAPPINGS[lower]) return TAG_MAPPINGS[lower];
  if (!lower.includes(' ')) {
    return tag.charAt(0).toUpperCase() + tag.slice(1);
  }
  const words = lower.split(/\s+/);
  const longestWord = words.reduce((a, b) => a.length >= b.length ? a : b, '');
  return longestWord.charAt(0).toUpperCase() + longestWord.slice(1);
};

const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

export const generateDailyDigest = async (articles: Article[], persona: PersonaType, isRegeneration: boolean = false): Promise<DailyDigest> => {
  const ai = getAiClient();
  if (articles.length === 0) {
    throw new Error("Žiadne články na spracovanie.");
  }

  // Zoradenie od najnovších
  const sortedByDate = articles.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
  let finalPool: Article[] = [];

  // STRIKTNÝ LIMIT 25 ČLÁNKOV PRE AI ABY TO BOLO RÝCHLE A KVALITNÉ
  const TARGET_ARTICLE_COUNT = 25;

  if (isRegeneration) {
      const pool = sortedByDate.slice(0, 100);
      finalPool = shuffleArray(pool).slice(0, TARGET_ARTICLE_COUNT);
  } else {
      const breakingNews = sortedByDate.slice(0, 15);
      const otherNews = sortedByDate.slice(15, 100); 
      const shuffledOthers = shuffleArray(otherNews);
      finalPool = [...breakingNews, ...shuffledOthers].slice(0, TARGET_ARTICLE_COUNT);
  }

  const promptInputArticles = finalPool;
  const articlesText = promptInputArticles.map(a => `Title: ${a.title}\nLink: ${a.link}\nSummary: ${a.summary}\nSource: ${a.source}\n`).join('\n---\n');

  const prompt = `Based on these ${promptInputArticles.length} articles, create a daily news digest in Slovak. Articles:\n\n${articlesText}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      systemInstruction: getSystemInstructionContent(persona),
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mainTitle: { type: Type.STRING },
          oneSentenceOverview: { type: Type.STRING },
          busyRead: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING }
              },
              required: ["title", "summary"]
            },
            minItems: 3,
            maxItems: 3
          },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                whatIsNew: { type: Type.STRING },
                whatChanged: { type: Type.STRING },
                keyPoints: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    minItems: 5,
                    maxItems: 5
                },
                sourceLink: { type: Type.STRING },
                tags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  maxItems: 2
                }
              },
              required: ["title", "whatIsNew", "whatChanged", "keyPoints", "tags", "sourceLink"]
            },
            minItems: 5,
            maxItems: 8
          }
        },
        required: ["mainTitle", "oneSentenceOverview", "busyRead", "sections"]
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("AI model neodpovedal.");
  }

  try {
    const jsonResponse = JSON.parse(text);
    const todayId = new Date().toISOString().split('T')[0];

    const enrichedSections = jsonResponse.sections.map((s: any) => ({
      ...s,
      tags: s.tags.map(sanitizeTag)
    }));

    return {
      id: todayId,
      date: new Date().toISOString(),
      mainTitle: jsonResponse.mainTitle,
      oneSentenceOverview: jsonResponse.oneSentenceOverview,
      busyRead: jsonResponse.busyRead,
      sections: enrichedSections,
      sourceArticles: sortedByDate,
      createdAt: Date.now(),
      personaUsed: persona
    };
  } catch (e) {
    console.error("JSON Parse Error", text);
    throw new Error("Nepodarilo sa spracovať AI odpoveď.");
  }
};

export const generateAdditionalSections = async (
  articles: Article[], 
  existingSections: DigestSection[], 
  persona: PersonaType
): Promise<DigestSection[]> => {
  const ai = getAiClient();
  if (articles.length === 0) return [];

  // Striktný limit 25 článkov
  const shuffledArticles = shuffleArray(articles).slice(0, 25);
  const articlesText = shuffledArticles.map(a => `Title: ${a.title}\nLink: ${a.link}\nSummary: ${a.summary}\n`).join('\n---\n');
  const existingTitles = existingSections.map(s => s.title).join(", ");

  const prompt = `Create 3 NEW news sections (Slovak language) different from these: ${existingTitles}.\nArticles:\n${articlesText}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      systemInstruction: getSystemInstructionContent(persona),
      temperature: 0.8,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            whatIsNew: { type: Type.STRING },
            whatChanged: { type: Type.STRING },
            keyPoints: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 5, maxItems: 5 },
            sourceLink: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING }, maxItems: 2 }
          },
          required: ["title", "whatIsNew", "whatChanged", "keyPoints", "tags", "sourceLink"]
        }
      }
    }
  });

  const text = response.text;
  if (!text) return [];
  const rawSections = JSON.parse(text) as DigestSection[];
  return rawSections.map(s => ({ ...s, tags: s.tags.map(sanitizeTag) }));
};

export const createChatSession = (section: DigestSection): Chat => {
  const ai = getAiClient();
  const contextString = `Téma: ${section.title}. Detaily: ${section.whatIsNew}. Body: ${section.keyPoints?.join(", ")}`;

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `Si spravodajský asistent. Diskutuješ o tejto téme: ${contextString}. Odpovedaj stručne v slovenčine.`
    }
  });
};

export const summarizeUrl = async (url: string, persona: PersonaType): Promise<string> => {
  const ai = getAiClient();
  try {
    const content = await fetchTextWithFallback(url);
    if (!content) throw new Error("Obsah nenájdený.");
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: `Summarize in Slovak (persona: ${persona}): ${content.substring(0, 10000)}` }] }],
    });

    return response.text || "Zhrnutie zlyhalo.";
  } catch (error) {
    return "Odkaz nebolo možné spracovať.";
  }
};

export const explainTerm = async (term: string, persona: PersonaType): Promise<string> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [{ text: `Vysvetli pojem "${term}" v slovenčine (persona: ${persona}).` }] }],
  });
  return response.text || "Definícia nenájdená.";
};

export const generateLearningPack = async (topic: string, persona: PersonaType): Promise<LearningPack> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [{ text: `Create learning pack for: ${topic} in Slovak.` }] }],
    config: {
      systemInstruction: `Educational AI (persona: ${persona}).`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          definition: { type: Type.STRING },
          history: { type: Type.STRING },
          keyConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
          futureOutlook: { type: Type.STRING },
          quizQuestion: { type: Type.STRING }
        },
        required: ["topic", "definition", "history", "keyConcepts", "futureOutlook", "quizQuestion"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Generovanie zlyhalo");
  return JSON.parse(text) as LearningPack;
};