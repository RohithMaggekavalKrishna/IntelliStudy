import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

interface TranscriptionEntry {
    speaker: 'user' | 'model';
    text: string;
}

// Audio Decoding/Encoding Functions
function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

function createBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: btoa(String.fromCharCode(...new Uint8Array(int16.buffer))),
        mimeType: 'audio/pcm;rate=16000',
    };
}

const useVoiceTutor = (systemInstruction: string) => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionEntry[]>([]);

    const sessionRef = useRef<any>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const currentInputTranscription = useRef('');
    const currentOutputTranscription = useRef('');

    const stopSession = useCallback(() => {
        if (sessionRef.current) {
            try { sessionRef.current.close(); } catch (e) { console.warn(e); }
            sessionRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            try { scriptProcessorRef.current.disconnect(); } catch (e) { console.warn(e); }
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            try { mediaStreamSourceRef.current.disconnect(); } catch (e) { console.warn(e); }
            mediaStreamSourceRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            try { audioContextRef.current.close(); } catch (e) { console.warn(e); }
            audioContextRef.current = null;
        }
        setIsConnecting(false);
    }, []);

    const startSession = useCallback(async () => {
        if (sessionRef.current) return;

        setIsConnecting(true);
        setError(null);
        setTranscriptionHistory([]);
        currentInputTranscription.current = '';
        currentOutputTranscription.current = '';

        try {
            const GEMINI_API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY;
            if (!GEMINI_API_KEY) throw new Error("Missing Gemini API Key");

            const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { sampleRate: 16000, echoCancellation: true }
            });
            mediaStreamRef.current = stream;

            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const inputAudioContext = new AudioContextClass({ sampleRate: 16000 });
            audioContextRef.current = inputAudioContext;
            const outputAudioContext = new AudioContextClass({ sampleRate: 24000 });
            let nextStartTime = 0;

            // Manually defining session creation logic using callbacks if supported, 
            // or manual stream handling if connect returns a stream.
            // Based on Eduverse code, it passes callbacks.

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.0-flash-exp',
                config: {
                    responseModalities: [Modality.AUDIO, Modality.TEXT],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
                    },
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                },
                callbacks: {
                    onopen: () => {
                        setIsConnecting(false);
                    },
                    onmessage: async (message: any) => {
                        // Handle Transcriptions
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscription.current += message.serverContent.inputTranscription.text;
                        }
                        if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
                            // Sometimes text comes in modelTurn if responseModalities includes TEXT
                            currentOutputTranscription.current += message.serverContent.modelTurn.parts[0].text;
                        }

                        if (message.serverContent?.turnComplete) {
                            const fullInput = currentInputTranscription.current;
                            const fullOutput = currentOutputTranscription.current || "(Audio response)";

                            if (fullInput) {
                                setTranscriptionHistory(prev => [
                                    ...prev,
                                    { speaker: 'user', text: fullInput },
                                    { speaker: 'model', text: fullOutput }
                                ]);
                            }
                            currentInputTranscription.current = '';
                            currentOutputTranscription.current = '';
                        }

                        // Handle Audio Output
                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio) {
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                            const source = outputAudioContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContext.destination);
                            const startTime = Math.max(outputAudioContext.currentTime, nextStartTime);
                            source.start(startTime);
                            nextStartTime = startTime + audioBuffer.duration;
                        }
                    },
                    onerror: (e: any) => {
                        console.error(e);
                        setError(e.message || "Connection Error");
                        setIsConnecting(false);
                    },
                    onclose: () => {
                        stopSession();
                    }
                }
            });

            const session = await sessionPromise;
            sessionRef.current = session;

            // Audio Input Processing
            const source = inputAudioContext.createMediaStreamSource(stream);
            mediaStreamSourceRef.current = source;
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                session.sendRealtimeInput({
                    media: {
                        mimeType: pcmBlob.mimeType,
                        data: pcmBlob.data
                    }
                });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to start session.');
            setIsConnecting(false);
            stopSession();
        }
    }, [systemInstruction, stopSession]);

    return { startSession, stopSession, transcriptionHistory, isConnecting, error };
};

export default useVoiceTutor;
