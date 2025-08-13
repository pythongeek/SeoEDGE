
import { GoogleGenAI, Type } from "@google/genai";
import type { 
    SeoSuggestion, 
    PageData, 
    TrafficDeclineDiagnosis,
    AffectedPage,
    Editor,
    Task,
    GscRawData,
    TopicCluster,
    StoriesAnalysis,
    DiscoverNewsAnalysis,
    ChatResponse
} from '../types';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.warn("VITE_GEMINI_API_KEY environment variable not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY || "" });

const seoSuggestionSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "Optimized SEO title, 70 characters or less." },
        meta_description: { type: Type.STRING, description: "Optimized meta description, 155 characters or less." },
        summary: { type: Type.STRING, description: "A 200-300 character summary of the content." },
        h2_suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        seo_checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
        confidence: { type: Type.NUMBER },
    },
    required: ["title", "meta_description", "summary", "h2_suggestions", "seo_checklist", "confidence"],
};

const taskGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        action: { type: Type.STRING, description: "A descriptive title for the task (e.g., 'Update Title & Meta for Ranking Loss')." },
        items: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["action", "items"]
};

const topicClusterGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        clusters: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    topic_name: { type: Type.STRING },
                    matched_queries: { type: Type.ARRAY, items: { type: Type.STRING } },
                    suggested_action: { type: Type.STRING }
                },
                required: ["topic_name", "matched_queries", "suggested_action"]
            }
        }
    },
    required: ["clusters"]
};

const storiesAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        topic_plan: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { suggested_title: { type: Type.STRING }, reasoning: { type: Type.STRING } }, required: ["suggested_title", "reasoning"] } },
        format_guidelines: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { guideline: { type: Type.STRING }, reasoning: { type: Type.STRING } }, required: ["guideline", "reasoning"] } }
    },
    required: ["topic_plan", "format_guidelines"]
};

const discoverAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        pattern_report: { type: Type.OBJECT, properties: { successful_topics: { type: Type.ARRAY, items: { type: Type.STRING } }, headline_styles: { type: Type.ARRAY, items: { type: Type.STRING } }, media_usage: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["successful_topics", "headline_styles", "media_usage"] },
        content_plan: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { suggested_headline: { type: Type.STRING }, target_topic: { type: Type.STRING }, justification: { type: Type.STRING } }, required: ["suggested_headline", "target_topic", "justification"] } }
    },
    required: ["pattern_report", "content_plan"]
};

const chatResponseSchema = {
    type: Type.OBJECT,
    properties: {
        answer_text: { type: Type.STRING, description: "The plain-text answer to the user's query. Be concise and helpful." },
        data_source: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array citing the exact source of the information (e.g., 'Traffic Decline Diagnosis', 'Regex Topic Generator')." },
        visualization_data: {
            type: Type.OBJECT,
            nullable: true,
            description: "Optional. Data formatted for a bar chart if the user's query implies a chart.",
            properties: {
                type: { type: Type.STRING, enum: ['bar_chart'] },
                title: { type: Type.STRING, description: "The title for the chart." },
                data: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            label: { type: Type.STRING, description: "The label for a data point (e.g., a URL or topic name)." },
                            value: { type: Type.NUMBER, description: "The numerical value for the data point." }
                        },
                        required: ["label", "value"]
                    }
                }
            },
            required: ["type", "title", "data"]
        }
    },
    required: ["answer_text", "data_source"]
};


const callGemini = async (model: string, prompt: string, systemInstruction: string, responseSchema: object) => {
    if (!GEMINI_API_KEY) throw new Error("Gemini API key is not configured.");
    try {
        const response = await ai.models.generateContent({
            model: model, contents: prompt,
            config: { systemInstruction, responseMimeType: "application/json", responseSchema, temperature: 0.1 },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to get a valid response from the AI model.");
    }
}

export const getSeoSuggestions = async (pageData: PageData): Promise<SeoSuggestion> => {
  const systemInstruction = `You are an expert SEO assistant. ALWAYS RETURN EXACTLY ONE JSON OBJECT that matches the provided JSON Schema. Do not include any other text or explanations. Do NOT invent facts. Use only the data supplied in the "input" field. If the data is insufficient to answer, return the JSON with fields set to empty strings or empty arrays and "confidence": 0.0.`;
  const prompt = `Input Data: ${JSON.stringify(pageData)}. Instructions: Produce an optimized title (<=70 chars), meta description (<=155 chars), 3 H2 suggestions, a 200-300 char summary, an SEO checklist array, and a confidence score 0.0-1.0. Use only the input data. The new title must include the primary_query.`;
  return callGemini("gemini-2.5-flash", prompt, systemInstruction, seoSuggestionSchema);
};

const getTaskPrompt = (page: AffectedPage): string => {
    let context = '';
    let instruction = '';
    switch (page.causeCategory) {
        case 'CTR Drop':
            context = `The page at ${page.url} has a CTR drop of ${(page.ctrChange * 100).toFixed(1)}%. This suggests the title/meta is not compelling.`;
            instruction = `Generate a task to address this. Action: "Refresh Title & Meta for CTR Recovery". Items: suggest rewriting title/meta to be more compelling, mentioning one or two hypothetical top queries like 'sourdough pizza ideas' as examples.`;
            break;
        case 'Ranking Loss':
            context = `The page at ${page.url} has a major impression loss of ${page.impressionLoss.toLocaleString()}, indicating a ranking drop.`;
            instruction = `Generate a task to address this. Action: "Expand Content to Regain Rankings". Items: suggest concrete ways to improve depth, such as adding a 'Troubleshooting' section or a 'Comparison' table.`;
            break;
        default:
             context = `The page at ${page.url} has a minor decline.`;
             instruction = `Generate a task for a routine content audit. Action: "Perform Routine Content & SEO Audit". Items: check for broken links, verify technical SEO, and check content accuracy.`;
            break;
    }
    return `${context}\n\n${instruction}`;
};

export const getWorkflowSuggestions = async (diagnosis: TrafficDeclineDiagnosis, editors: Editor[]): Promise<Task[]> => {
    const systemInstruction = `You are an expert SEO strategist. ALWAYS RETURN EXACTLY ONE JSON OBJECT that matches the provided JSON Schema. All suggestions must be specific, actionable, and directly linked to the provided data context.`;
    const createdTasks: Task[] = [];
    let editorIndex = 0;
    const pagesToProcess = diagnosis.affectedPages.slice(0, 5);

    for (const page of pagesToProcess) {
        const prompt = getTaskPrompt(page);
        const taskDetails = await callGemini("gemini-2.5-flash", prompt, systemInstruction, taskGenerationSchema);
        const assignedEditor = editors[editorIndex];
        const newTask: Task = {
            id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            pageId: page.url.replace(/[^a-zA-Z0-9]/g, '_'),
            pageUrl: page.url,
            action: taskDetails.action, items: taskDetails.items,
            assignee: assignedEditor.id, assigneeName: assignedEditor.name,
            status: 'todo', priority: page.priorityScore,
            createdAt: new Date().toISOString(),
        };
        createdTasks.push(newTask);
        editorIndex = (editorIndex + 1) % editors.length;
    }
    return createdTasks;
};

export const generateTopicsFromRegex = async (matchedQueries: GscRawData[]): Promise<TopicCluster[]> => {
    const systemInstruction = `You are a data scientist specializing in SEO. Analyze search queries and group them into thematic topic clusters. ALWAYS RETURN EXACTLY ONE JSON OBJECT that matches the provided JSON Schema. Do not include queries not in the input.`;
    const prompt = `Analyze these queries. Group them into thematic clusters. For each, provide a topic_name, the exact matched_queries from the input, and a suggested_action.\n\nQuery List: ${JSON.stringify(matchedQueries.map(q => q.query))}`;
    const aiResponse = await callGemini("gemini-2.5-flash", prompt, systemInstruction, topicClusterGenerationSchema);

    const finalClusters = aiResponse.clusters.map((cluster: any) => {
        const queryDataMap = new Map(matchedQueries.map(q => [q.query, q]));
        let total_volume = 0;
        cluster.matched_queries.forEach((query: string) => {
            if (queryDataMap.has(query)) total_volume += queryDataMap.get(query)!.impressions;
        });
        return { ...cluster, total_volume, trend_score: Math.random() * 0.8 + 0.1 };
    });

    finalClusters.sort((a: TopicCluster, b: TopicCluster) => b.total_volume - a.total_volume);
    return finalClusters;
};

export const analyzeStoriesEffectiveness = async (storiesData: GscRawData[], siteAvgCtr: number): Promise<StoriesAnalysis> => {
    const systemInstruction = `You are a content strategist specializing in Google Stories. Analyze performance data and provide actionable recommendations. ALWAYS RETURN EXACTLY ONE JSON OBJECT that matches the provided JSON Schema. All recommendations must be directly derived from the provided data.`;
    const prompt = `Analyze the following Google Stories performance data. Site-wide average CTR is ${(siteAvgCtr * 100).toFixed(2)}%. Based *only* on the data below, create a topic_plan and format_guidelines.\n\nStories Data: ${JSON.stringify(storiesData, null, 2)}`;
    const aiResponse = await callGemini("gemini-2.5-flash", prompt, systemInstruction, storiesAnalysisSchema);
    const top_performing_stories = storiesData.map(story => {
            const ctr = story.ctr ?? (story.clicks ?? 0) / story.impressions;
            const perfChange = ctr / siteAvgCtr - 1;
            return { url: story.url!, impressions: story.impressions, clicks: story.clicks ?? 0, ctr, performance_vs_average: `${perfChange > 0 ? '+' : ''}${(perfChange * 100).toFixed(0)}% CTR` };
        }).sort((a, b) => b.impressions - a.impressions).slice(0, 5);
    return { ...aiResponse, top_performing_stories };
};

export const analyzeDiscoverNewsPerformance = async (discoverData: GscRawData[]): Promise<DiscoverNewsAnalysis> => {
    const systemInstruction = `You are an expert editorial strategist. Reverse-engineer the success of content that performed well in Google Discover and News to create a replicable playbook. ALWAYS RETURN EXACTLY ONE JSON OBJECT that matches the provided JSON Schema. All recommendations MUST be based strictly on the provided data.`;
    const prompt = `Analyze this data from high-performing posts in Google Discover and News. Based *only* on this data, create a 'pattern_report' and a 'content_plan'.\n\nData: ${JSON.stringify(discoverData, null, 2)}`;
    return callGemini("gemini-2.5-flash", prompt, systemInstruction, discoverAnalysisSchema);
};

export const getChatResponse = async (query: string, context: object): Promise<ChatResponse> => {
    const systemInstruction = `You are 'Edge', a helpful and trustworthy SEO data librarian. Your purpose is to answer questions based ONLY on the JSON data context provided.
- Be concise and clear.
- ALWAYS cite your data source from the context keys (e.g., 'Traffic Decline Diagnosis', 'Regex Topic Clusters').
- If the data to answer the question does not exist in the context, you MUST respond with "I do not have the data to answer that question. Please run the relevant analysis module first."
- Do NOT invent any information, numbers, or trends.
- If the user asks for a visualization (like top pages or trends), provide data for a bar chart in the 'visualization_data' field. The data should be an array of objects with 'label' and 'value'. Limit chart data to the top 5-7 items for clarity.
- Truncate long URL labels in chart data to keep them readable.`;

    const prompt = `
        User Query: "${query}"

        JSON Data Context:
        ${JSON.stringify(context, null, 2)}
    `;

    return callGemini("gemini-2.5-flash", prompt, systemInstruction, chatResponseSchema);
};
