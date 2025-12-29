import React, { useState, useRef, useEffect } from 'react';
import { connectToLiveAudio, createAudioBlob, analyzeLecture } from '../../services/geminiService';
import { db } from '../../services/db';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { LectureAnalysis, LectureSession } from '../../types';
import { Mic, Square, X, AlertCircle } from 'lucide-react';

interface LectureRecorderProps {
    projectId: string;
    onRecordingComplete: (lecture: any, analysis: LectureAnalysis) => void;
    onClose: () => void;
}

type RecordingState = 'idle' | 'recording' | 'processing' | 'completed' | 'error';

const LectureRecorder: React.FC<LectureRecorderProps> = ({
    projectId,
    onRecordingComplete,
    onClose
}) => {
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');
    const [liveTranscript, setLiveTranscript] = useState('');
    const [finalTranscript, setFinalTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);

    // Refs for recording
    const liveSessionRef = useRef<any>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const transcriptPartsRef = useRef<string[]>([]);
    const isNewUtteranceRef = useRef<boolean>(true);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            cleanup();
        };
    }, []);

    const cleanup = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (liveSessionRef.current) {
            try { liveSessionRef.current.close(); } catch (err) { console.warn(err); }
            liveSessionRef.current = null;
        }
        if (scriptProcessorRef.current) {
            try {
                if (scriptProcessorRef.current instanceof ScriptProcessorNode) {
                    scriptProcessorRef.current.disconnect();
                }
            } catch (err) { console.warn(err); }
            scriptProcessorRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            try { audioContextRef.current.close(); } catch (err) { console.warn(err); }
            audioContextRef.current = null;
        }
    };

    const handleMessage = (text: string, isFinal: boolean) => {
        if (text && text.trim()) {
            if (isNewUtteranceRef.current) {
                transcriptPartsRef.current.push(text.trim());
                isNewUtteranceRef.current = false;
            } else {
                if (transcriptPartsRef.current.length > 0) {
                    transcriptPartsRef.current[transcriptPartsRef.current.length - 1] = text.trim();
                } else {
                    transcriptPartsRef.current.push(text.trim());
                }
            }
        }
        if (isFinal && text && text.trim()) isNewUtteranceRef.current = true;
        const fullTranscript = transcriptPartsRef.current.join(' ');
        setLiveTranscript(fullTranscript);
    };

    const startRecording = async () => {
        try {
            setError(null);
            setRecordingState('recording');
            setLiveTranscript('');
            setFinalTranscript('');
            setRecordingTime(0);
            transcriptPartsRef.current = [];
            isNewUtteranceRef.current = true;
            recordedChunksRef.current = [];

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { sampleRate: 16000, echoCancellation: true, noiseSuppression: true }
            });
            streamRef.current = stream;

            const mimeType = MediaRecorder.isTypeSupported('audio/mpeg') ? 'audio/mpeg' : 'audio/webm';
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) recordedChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.start(1000);

            liveSessionRef.current = await connectToLiveAudio(handleMessage, (err: Error) => {
                console.error('Live session error:', err);
            });

            audioContextRef.current = new AudioContext({ sampleRate: 16000 });
            const source = audioContextRef.current.createMediaStreamSource(stream);
            const gainNode = audioContextRef.current.createGain();

            try {
                await audioContextRef.current.audioWorklet.addModule('/audio-processor.js');
                const audioWorkletNode = new AudioWorkletNode(audioContextRef.current, 'audio-processor');
                audioWorkletNode.port.onmessage = (event) => {
                    if (liveSessionRef.current && recordingState === 'recording' && event.data.audioData) {
                        const audioBlob = createAudioBlob(new Float32Array(event.data.audioData));
                        try { liveSessionRef.current.sendRealtimeInput({ media: audioBlob }); } catch (e) { }
                    }
                };
                source.connect(gainNode).connect(audioWorkletNode);
            } catch (workletError) {
                console.warn('AudioWorklet failed, using fallback', workletError);
                const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
                scriptProcessor.onaudioprocess = (event) => {
                    if (liveSessionRef.current && recordingState === 'recording') {
                        const inputData = event.inputBuffer.getChannelData(0);
                        if (inputData.some(s => Math.abs(s) > 0.001)) {
                            try { liveSessionRef.current.sendRealtimeInput({ media: createAudioBlob(inputData) }); } catch (e) { }
                        }
                    }
                };
                source.connect(gainNode).connect(scriptProcessor);
                scriptProcessor.connect(audioContextRef.current.destination);
                scriptProcessorRef.current = scriptProcessor;
            }

            timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
            toast.success('Recording started');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to start recording');
            setRecordingState('error');
        }
    };

    const stopRecording = async () => {
        if (recordingState !== 'recording') return;
        try {
            setRecordingState('processing');
            if (timerRef.current) clearInterval(timerRef.current);
            if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
            cleanup();

            await new Promise(r => setTimeout(r, 1000));
            const completeTranscript = transcriptPartsRef.current.join(' ').trim();
            setFinalTranscript(completeTranscript);

            // Since we don't have storage bucket, we won't upload the audio file
            // We will rely on the transcript for analysis

            const analysis = await analyzeLecture(
                completeTranscript || "No transcript generated. Analysis based on context.",
                new Blob(recordedChunksRef.current, { type: 'audio/webm' }) // Mocking blob usage
            );

            const lectureSession = await db.createLectureSession({
                projectId: projectId,
                title: analysis.title || 'Recorded Lecture',
                liveTranscript: liveTranscript || '',
                finalTranscript: completeTranscript || '',
                audioFileUrl: null, // No storage
                duration: recordingTime,
                status: 'completed',
                analysis: analysis,
                createdAt: Date.now()
            });

            setRecordingState('completed');
            toast.success('Lecture processed!');
            onRecordingComplete(lectureSession, analysis);

        } catch (err: any) {
            setError(err.message);
            setRecordingState('error');
        }
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Lecture Recorder</h2>
                    {recordingState === 'idle' && <button onClick={onClose}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>}
                </div>

                {recordingState === 'idle' && (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Mic size={40} />
                        </div>
                        <p className="text-slate-600 mb-8 max-w-md mx-auto">Start recording to capture live audio and generate real-time AI notes.</p>
                        <Button onClick={startRecording} size="lg" className="w-full max-w-xs mx-auto">Start Recording</Button>
                    </div>
                )}

                {recordingState === 'recording' && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="animate-pulse text-red-600 font-bold mb-2 flex items-center justify-center gap-2"><div className="w-3 h-3 bg-red-600 rounded-full"></div> Recording</div>
                            <div className="text-4xl font-mono font-bold text-slate-800">{formatTime(recordingTime)}</div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 h-48 overflow-y-auto border border-slate-200">
                            <p className="text-slate-800 text-sm leading-relaxed">{liveTranscript}<span className="animate-pulse">|</span></p>
                        </div>
                        <Button variant="destructive" onClick={stopRecording} className="w-full">Stop & Process</Button>
                    </div>
                )}

                {recordingState === 'processing' && (
                    <div className="text-center py-12">
                        <LoadingSpinner size="lg" className="mx-auto mb-6" />
                        <h3 className="text-lg font-bold">Processing Lecture...</h3>
                        <p className="text-slate-500">Generating summary and study materials.</p>
                    </div>
                )}

                {recordingState === 'completed' && (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Success!</h3>
                        <p className="text-slate-500 mb-6">Lecture has been saved and analyzed.</p>
                        <Button onClick={onClose} className="w-full">Done</Button>
                    </div>
                )}

                {recordingState === 'error' && (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle size={32} />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Error</h3>
                        <p className="text-red-600 mb-6">{error}</p>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={onClose} className="flex-1">Close</Button>
                            <Button onClick={() => setRecordingState('idle')} className="flex-1">Try Again</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
import { CheckCircle } from 'lucide-react';

export default LectureRecorder;
