import { GoogleGenAI, Type, Modality } from '@google/genai';
import type {
    Flashcard,
    QuizQuestion,
    Slide,
    VerbalTestTranscriptEntry,
    LearningAnalysisReport,
    UserAnswer,
    LectureAnalysis,
    UserPreferences,
    SkillAssessmentAnswer,
    SkillAssessmentQuestion,
    RoadmapData
} from '../types';
import { marked } from 'marked';

// Get API key from environment
const GEMINI_API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

// Initialize Gemini AI (safely)
let ai: any = null;
if (GEMINI_API_KEY) {
    ai = new GoogleGenAI({
        apiKey: GEMINI_API_KEY
    });
} else {
    console.warn("Gemini API Key missing. AI features will not work.");
}

// ===============================
// Utility Functions
// ===============================

async function parseAndSanitize(content: string): Promise<string> {
    const html = await marked.parse(content);
    // Basic sanitization (in production, use DOMPurify)
    return html.replace(/<script.*?>.*?<\/script>/gi, '');
}

function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// ===============================
// AI Tutor Services
// ===============================

export const generateSummary = async (text: string): Promise<string> => {
    if (!ai) return "AI not configured.";
    const prompt = `Summarize the following text in a clear and concise manner. Use markdown for formatting, including bullet points for key takeaways. Text: "${text}"`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt
    });
    return parseAndSanitize(response.text || '');
};

export const generateFlashcards = async (text: string): Promise<Flashcard[]> => {
    if (!ai) return [];
    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: `Based on the following text, generate 5-10 flashcards. Each flashcard should have a question, a concise answer, and a relevant tag (e.g., "Definition", "Concept", "Formula"). Text: "${text}"`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        answer: { type: Type.STRING },
                        tag: { type: Type.STRING }
                    },
                    required: ["question", "answer", "tag"]
                }
            }
        }
    });
    const flashcardsData = JSON.parse(response.text || '[]');
    return flashcardsData.map((fc: any, index: number) => ({ ...fc, id: index }));
};

export const generateQuiz = async (text: string): Promise<QuizQuestion[]> => {
    if (!ai) return [];
    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: `Create a multiple-choice quiz with 5 questions based on the text below. For each question, provide 4 options, indicate the correct answer, and give a brief explanation for why it's correct. Text: "${text}"`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswer: { type: Type.STRING },
                        explanation: { type: Type.STRING }
                    },
                    required: ["question", "options", "correctAnswer", "explanation"]
                }
            }
        }
    });

    const quizData = JSON.parse(response.text || '[]');
    return quizData.map((q: any, index: number) => ({ ...q, id: index }));
};

export const generateDeepDive = async (text: string): Promise<string> => {
    if (!ai) return "AI not configured.";
    const prompt = `Provide a deep, thorough explanation of the concepts in the following text. Use analogies, real-world examples, and break down complex ideas into smaller, understandable parts. Assume the reader is intelligent but new to the topic. Format the output using markdown. Text: "${text}"`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
        config: {
            // thinkingConfig: { thinkingBudget: 32768 } // Optional if supported
        }
    });
    return parseAndSanitize(response.text || '');
};

export const searchTopic = async (topic: string): Promise<{ text: string, sources: Array<{ title: string, uri: string }> }> => {
    if (!ai) return { text: "AI not configured.", sources: [] };
    const prompt = `Provide a detailed explanation of the following topic: ${topic}.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }]
        }
    });
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk: any) => chunk.web)
        .filter(Boolean) || [];

    const sanitizedText = await parseAndSanitize(response.text || '');
    return { text: sanitizedText, sources };
};

export const generateSlides = async (text: string): Promise<Slide[]> => {
    if (!ai) return [];
    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: `Based on the following text, create a presentation with 5 to 8 slides. Each slide must have a clear title and a list of key bullet points (as an array of strings). Return the result as a JSON array where each object has 'title' (string) and 'content' (array of strings). Text: "${text}"`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        content: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ["title", "content"]
                }
            }
        }
    });
    return JSON.parse(response.text || '[]');
};

export const generateSlideNarration = async (slide: Slide): Promise<string> => {
    if (!ai) return "";
    const prompt = `You are an AI presenter delivering a presentation. Your current slide has the title "${slide.title}" and the following key points:
- ${slide.content.join('\n- ')}

Your task is to generate a brief, engaging narration script that explains these points to an audience. Do NOT simply read the points. Elaborate on them, connect them, and provide a smooth, explanatory flow. The narration should be about 2-4 sentences long.

Narration Script:`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt
    });
    return response.text || '';
};

export const generateSpeech = async (text: string): Promise<string> => {
    if (!ai) return "";
    // Check for supported model for TTS or use standard generation as placeholder for now if unavailable
    // Assuming 'gemini-2.0-flash-exp' or similar supports native audio generation or using a specific TTS model
    // If the library supports 'gemini-2.5-flash-preview-tts', using that. Falling back to flash-exp if needed but flash-exp might not output audio directly via text prompt unless configured.
    // For now, attempting the configured model from Eduverse.
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: [{ parts: [{ text: "Generatate speech for: " + text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Puck' },
                    },
                },
            },
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
    } catch (e) {
        console.error("Speech generation failed", e);
        return "";
    }
};

export const answerPptQuery = async (query: string, slide: Slide, sourceText: string): Promise<string> => {
    if (!ai) return "AI not configured.";
    const prompt = `I am watching a presentation. The current slide is titled "${slide.title}" with the following content: ${slide.content.join(', ')}.
    
    My question is: "${query}"
    
    Please answer my question based on the context of the slide and the original source material provided below. Keep your answer concise and clear.
    
    Original Source Material: "${sourceText.substring(0, 4000)}..."`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt
    });
    return parseAndSanitize(response.text || '');
};

export const generateVerbalTestQuestions = async (text: string): Promise<string[]> => {
    if (!ai) return [];
    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: `Based on the provided text, generate 5 open-ended questions suitable for a verbal exam. The questions should test both factual recall and conceptual understanding. Return only a JSON array of strings. Text: "${text}"`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING
                }
            }
        }
    });
    return JSON.parse(response.text || '[]');
};

export const analyzeTestResults = async (transcript: VerbalTestTranscriptEntry[], sourceText: string): Promise<LearningAnalysisReport> => {
    if (!ai) return {} as LearningAnalysisReport;
    const prompt = `You are an expert educator analyzing a student's verbal test transcript.
    
    **Source Material:**
    "${sourceText.substring(0, 8000)}"
    
    **Student's Test Transcript:**
    ${JSON.stringify(transcript)}
    
    **Your Task:**
    Evaluate the student's performance based on the transcript and the source material. Provide a detailed analysis covering the metrics below. Be critical but constructive.
    
    **Output Format:**
    Return a single, valid JSON object that strictly follows this schema. Do not include any other text or markdown formatting.
    
    **JSON Schema:**
    {
      "overallScore": number,
      "engagementAndConfidence": { "rating": "'Low' | 'Medium' | 'High'", "feedback": "string" },
      "knowledgeRetention": { "score": number, "feedback": "string" },
      "conceptualUnderstanding": { "rating": "'Emerging' | 'Developing' | 'Proficient'", "feedback": "string" },
      "summary": "string",
      "weakTopics": { "type": "ARRAY", "items": { "type": "STRING" }, "description": "A list of specific topics or concepts the student struggled with. E.g., ['Calvin Cycle', 'Light-dependent reactions']." }
    }`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
        }
    });

    return JSON.parse(response.text || '{}');
};

export const analyzeQuizResults = async (userAnswers: UserAnswer[], sourceText: string): Promise<LearningAnalysisReport> => {
    if (!ai) return {} as LearningAnalysisReport;
    const prompt = `You are an expert educator analyzing a student's multiple-choice quiz results.

    **Source Material:**
    "${sourceText.substring(0, 8000)}"

    **Student's Quiz Results:**
    ${JSON.stringify(userAnswers)}

    **Your Task:**
    Evaluate the student's performance. Go beyond a simple score. Identify patterns in their incorrect answers. Did they struggle with definitions, concepts, or applications? Provide a detailed analysis covering the metrics below. Be critical but constructive.

    **Output Format:**
    Return a single, valid JSON object that strictly follows this schema. Do not include any other text or markdown formatting.

    **JSON Schema:**
    {
      "overallScore": number,
      "engagementAndConfidence": { "rating": "'Low' | 'Medium' | 'High'", "feedback": "string" },
      "knowledgeRetention": { "score": number, "feedback": "string" },
      "conceptualUnderstanding": { "rating": "'Emerging' | 'Developing' | 'Proficient'", "feedback": "string" },
      "summary": "string",
      "weakTopics": { "type": "ARRAY", "items": { "type": "STRING" }, "description": "A list of specific topics or concepts the student struggled with based on incorrect answers. E.g., ['Calvin Cycle', 'Light-dependent reactions']." }
    }`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
        }
    });

    return JSON.parse(response.text || '{}');
};

export const generateTargetedReading = async (weakTopics: string[], sourceText: string): Promise<string> => {
    if (!ai) return "AI not configured.";
    const prompt = `A student has been identified as having difficulty with the following topics: ${weakTopics.join(', ')}. 
    
    Based on the source text provided below, generate a clear and focused study guide that specifically explains these topics. Use simple language, analogies, and clear formatting (markdown) to help the student understand these specific areas. Do not cover topics outside of the ones listed.
    
    **Source Text:**
    "${sourceText}"`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
    });

    return parseAndSanitize(response.text || '');
};

export const generateTargetedQuiz = async (weakTopics: string[], sourceText: string): Promise<QuizQuestion[]> => {
    if (!ai) return [];
    const prompt = `A student has been identified as having difficulty with the following topics: ${weakTopics.join(', ')}.
    
    Based on the source text provided below, generate a new, focused multiple-choice quiz with 3-5 questions that *only* tests understanding of these specific weak topics. Do not include questions on other topics.
    
    For each question, provide 4 options, indicate the correct answer, and give a brief explanation for why it's correct.

    **Source Text:**
    "${sourceText}"

    Return the result as a JSON array of quiz question objects.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswer: { type: Type.STRING },
                        explanation: { type: Type.STRING }
                    },
                    required: ["question", "options", "correctAnswer", "explanation"]
                }
            }
        }
    });

    const quizData = JSON.parse(response.text || '[]');
    return quizData.map((q: any, index: number) => ({ ...q, id: index }));
};

// ===============================
// Lecture Capture Services
// ===============================

export const connectToLiveAudio = (
    onMessage: (transcript: string, isFinal: boolean) => void,
    onError: (error: Error) => void,
): Promise<any> => {
    if (!ai) return Promise.reject("AI not configured");
    console.log('Connecting to live audio session...');
    return ai.live.connect({
        model: 'gemini-2.0-flash-exp',
        callbacks: {
            onopen: () => {
                console.log('Live session opened successfully.');
            },
            onmessage: (message: any) => {
                console.log('Received message from live session:', message);
                if (message.serverContent?.inputTranscription) {
                    const transcription = message.serverContent.inputTranscription;
                    const text = transcription.text || '';
                    const isFinal = transcription.isFinal || false;
                    if (text && text.trim()) {
                        onMessage(text, isFinal);
                    }
                }
            },
            onerror: (e: any) => {
                console.error('Live session error:', e);
                onError(new Error(`Live session error: ${e.message || 'Unknown error'}`));
            },
            onclose: (e: any) => {
                console.log('Live session closed:', e);
            },
        },
        config: {
            inputAudioTranscription: {
                model: "gemini-2.0-flash-exp" // Ensuring model aligns for transcription if needed
            },
            responseModalities: [Modality.AUDIO], // We want audio back? Or just transcription? Original had AUDIO.
            systemInstruction: {
                parts: [
                    {
                        text: 'You are a live transcription assistant. Focus on accurately transcribing spoken audio. Do not respond with audio, only provide transcription.',
                    },
                ],
            },
        },
    });
};

export const createAudioBlob = (audioData: Float32Array) => {
    const l = audioData.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = audioData[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
};

const analysisSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: 'A concise, engaging title for the lecture.' },
        summary: { type: Type.STRING, description: 'A 2-3 sentence summary of the entire lecture.' },
        topics: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'A list of the main topics or keywords discussed.'
        },
        concepts: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    term: { type: Type.STRING },
                    definition: { type: Type.STRING }
                },
                required: ['term', 'definition']
            },
            description: 'Key concepts or definitions explained in the lecture.'
        },
        formulas: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: 'The name of the formula or equation.' },
                    latex: { type: Type.STRING, description: 'The formula in LaTeX format.' },
                    description: { type: Type.STRING, description: 'A brief explanation of what the formula represents.' }
                },
                required: ['name', 'latex', 'description']
            },
            description: 'Mathematical formulas or equations mentioned, converted to LaTeX.'
        },
        notes: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    point: { type: Type.STRING, description: 'A main bullet point or key takeaway.' },
                    details: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: 'Optional sub-points or further details.'
                    }
                },
                required: ['point']
            },
            description: 'Structured notes in a hierarchical or bulleted format.'
        }
    },
    required: ['title', 'summary', 'topics', 'concepts', 'formulas', 'notes']
};

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const analyzeLecture = async (transcript: string, audioBlob?: Blob): Promise<LectureAnalysis> => {
    if (!ai) return {} as LectureAnalysis;
    const textPart = {
        text: `
        Analyze the following lecture transcript. Extract key information and structure it according to the provided JSON schema.
        
        Tasks:
        1. Create a suitable title and a brief summary for the lecture.
        2. Identify all major topics and keywords discussed.
        3. Extract all important concepts and their precise definitions.
        4. Identify all mathematical formulas mentioned. Convert them into valid LaTeX format. Provide a name and a brief description for each formula.
        5. Generate structured, hierarchical notes with main points and relevant sub-points.
        
        Here is the lecture transcript:
        ---
        ${transcript}
        ---
        
        Please provide your analysis in a single JSON object that strictly adheres to the required schema.
        `
    };

    const parts: any[] = [textPart];

    if (audioBlob && audioBlob.size > 0) {
        const audioData64 = await blobToBase64(audioBlob);
        parts.unshift({
            inlineData: {
                mimeType: audioBlob.type,
                data: audioData64,
            },
        });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema: analysisSchema,
        },
    });

    const jsonString = response.text;
    try {
        return JSON.parse(jsonString || '{}') as LectureAnalysis;
    } catch (e) {
        console.error("Failed to parse analysis JSON:", e);
        throw new Error("The AI returned an invalid data structure for the analysis.");
    }
};

// ===============================
// Career Planning Services (SkillMap)
// ===============================

export const generateSkillAssessmentQuestions = async (
    career: string,
    skillLevel: string
): Promise<SkillAssessmentQuestion[]> => {
    if (!ai) return [];
    const prompt = `Based on a user wanting to become a "${career}" and self-identifying as a "${skillLevel}", generate 3-5 multiple-choice questions to accurately assess their current domain knowledge. The questions should be practical and relevant to the skills required for this career at that level. Return the questions in a valid JSON array format.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            question: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        },
                        required: ["question", "options"],
                    },
                },
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating skill assessment questions:", error);
        throw new Error("Failed to generate skill assessment questions.");
    }
};

export const generateRoadmap = async (
    preferences: UserPreferences,
    answers: SkillAssessmentAnswer[]
): Promise<RoadmapData> => {
    if (!ai) return {} as RoadmapData;
    const answersString = answers.map(a => `- ${a.question}\n  - Your Answer: ${a.answer}`).join('\n');

    const prompt = `
    System Instruction: You are an expert career advisor and curriculum designer named SkillMap AI. Your goal is to generate a comprehensive, personalized, and actionable career roadmap for a university student. The output must be a valid JSON object that strictly adheres to the provided schema.

    CRITICAL INSTRUCTION: You MUST populate every single field and array within the JSON schema. For every array (like projects, resources, skills, resumeTips etc.), you MUST provide at least 2-3 detailed and relevant entries. Do not return empty arrays or null values for any field. The generated content must be extremely high quality, specific, and actionable for the user.

    User Request:
    I am a university student aiming to become a "${preferences.careerGoal}".

    Here is my profile:
    - Final assessed skill level (based on my answers): ${preferences.skillLevel}
    - My answers to your assessment questions which you must use to refine the roadmap:
    ${answersString}
    - My weekly time commitment: ${preferences.timeCommitment}
    - My preferred learning style: ${preferences.learningStyle}
    - My preferred learning medium: ${preferences.learningMedium}
    - My target timeline to be job-ready: ${preferences.timeline}

    Based on all this information, generate a detailed, high-quality roadmap. Ensure the resources are top-tier (e.g., famous courses, popular books) and the projects are practical and will build a strong portfolio. The internship guide should provide specific, actionable advice.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        careerTitle: { type: Type.STRING, description: "The official title of the career path, e.g., 'Software Engineer'." },
                        shortSummary: { type: Type.STRING, description: "A brief, encouraging 1-2 sentence summary of the generated roadmap." },
                        requiredSkills: {
                            type: Type.ARRAY,
                            description: "A list of the absolute top 5-7 most critical skills for this career.",
                            items: { type: Type.OBJECT, properties: { skill: { type: Type.STRING }, description: { type: Type.STRING } } }
                        },
                        skillBreakdown: {
                            type: Type.OBJECT,
                            description: "A detailed breakdown of skills into three levels of proficiency.",
                            properties: {
                                beginner: { type: Type.ARRAY, description: "Fundamental skills for someone just starting out.", items: { type: Type.OBJECT, properties: { skill: { type: Type.STRING }, description: { type: Type.STRING } } } },
                                intermediate: { type: Type.ARRAY, description: "Skills needed to be considered for junior roles.", items: { type: Type.OBJECT, properties: { skill: { type: Type.STRING }, description: { type: Type.STRING } } } },
                                advanced: { type: Type.ARRAY, description: "Skills for specialization and senior-level contribution.", items: { type: Type.OBJECT, properties: { skill: { type: Type.STRING }, description: { type: Type.STRING } } } }
                            }
                        },
                        weeklyPlan: {
                            type: Type.ARRAY,
                            description: "A granular, week-by-week plan for the first 12 weeks. Each week must have a clear goal and specific tasks.",
                            items: { type: Type.OBJECT, properties: { week: { type: Type.INTEGER }, goal: { type: Type.STRING }, tasks: { type: Type.ARRAY, items: { type: Type.STRING } } } }
                        },
                        monthlyTimeline: {
                            type: Type.ARRAY,
                            description: "A high-level overview of milestones for each month of the user's chosen timeline.",
                            items: { type: Type.OBJECT, properties: { month: { type: Type.INTEGER }, milestone: { type: Type.STRING }, focus: { type: Type.ARRAY, items: { type: Type.STRING } } } }
                        },
                        resources: {
                            type: Type.OBJECT,
                            description: "A curated list of high-quality learning resources.",
                            properties: {
                                courses: { type: Type.ARRAY, description: "Top online courses (e.g., from Coursera, edX, Udemy). Provide real, valid URLs.", items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, url: { type: Type.STRING }, platform: { type: Type.STRING } } } },
                                youtube: { type: Type.ARRAY, description: "Popular and informative YouTube channels or playlists. Provide real, valid URLs.", items: { type: Type.OBJECT, properties: { channel: { type: Type.STRING }, url: { type: Type.STRING }, description: { type: Type.STRING } } } },
                                books: { type: Type.ARRAY, description: "Seminal and highly-recommended books for this field.", items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, author: { type: Type.STRING } } } }
                            }
                        },
                        projects: {
                            type: Type.OBJECT,
                            description: "A list of portfolio-worthy projects, increasing in difficulty.",
                            properties: {
                                beginner: { type: Type.ARRAY, description: "Simple projects to solidify foundational knowledge.", items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, requirements: { type: Type.ARRAY, items: { type: Type.STRING } }, outcome: { type: Type.STRING } } } },
                                intermediate: { type: Type.ARRAY, description: "More complex projects that could be featured on a resume.", items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, requirements: { type: Type.ARRAY, items: { type: Type.STRING } }, outcome: { type: Type.STRING } } } },
                                advanced: { type: Type.ARRAY, description: "Challenging, impressive projects that demonstrate deep expertise.", items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, requirements: { type: Type.ARRAY, items: { type: Type.STRING } }, outcome: { type: Type.STRING } } } }
                            }
                        },
                        internshipGuide: {
                            type: Type.OBJECT,
                            description: "Actionable advice for securing an internship.",
                            properties: {
                                requirements: { type: Type.ARRAY, description: "Common requirements and skills recruiters look for in interns.", items: { type: Type.STRING } },
                                interviewPlan: { type: Type.ARRAY, description: "A structured plan for technical and behavioral interview preparation.", items: { type: Type.OBJECT, properties: { topic: { type: Type.STRING }, focus: { type: Type.STRING } } } },
                                resumeTips: { type: Type.ARRAY, description: "Specific, powerful tips for tailoring a resume to this career path.", items: { type: Type.STRING } }
                            }
                        }
                    }
                }
            }
        });

        const jsonText = response.text.trim();

        if (!jsonText) {
            throw new Error("Received an empty response from the AI.");
        }

        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating roadmap:", error);
        throw new Error("Failed to generate career roadmap.");
    }
};

// ===============================
// Chat Services
// ===============================

export const createChat = () => {
    if (!ai) throw new Error("AI not configured");
    return ai.chats.create({
        model: 'gemini-2.0-flash-exp',
    });
};

export const sendChatMessage = async (
    chat: any,
    message: string,
    context?: string
): Promise<any> => {
    let prompt = message;

    if (context) {
        prompt = `
      Context: You are a helpful study assistant. The user is asking a question about their learning material. Use the following context to answer their question.
      
      --- CONTEXT ---
      ${context}
      --- END CONTEXT ---
      
      User's Question: "${message}"
      
      Your Answer:
    `;
    }

    return chat.sendMessage({ message: prompt });
};

export const sendChatMessageWithSearch = async (message: string): Promise<any> => {
    if (!ai) throw new Error("AI not configured");
    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: `Based on current information from the web, please answer the following question: "${message}"`,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });
    return response;
};
