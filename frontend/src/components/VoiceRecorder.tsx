import { useState, useRef } from 'react';
import { Mic, Square, Loader } from 'lucide-react';
import { VoiceOverlay } from './VoiceOverlay';

interface VoiceRecorderProps {
    onRecordingComplete: (audioBlob: Blob) => void;
    isProcessing?: boolean;
}

export function VoiceRecorder({ onRecordingComplete, isProcessing = false }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const chunks = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            chunks.current = [];

            mediaRecorder.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.current.push(e.data);
                }
            };

            mediaRecorder.current.onstop = () => {
                const blob = new Blob(chunks.current, { type: 'audio/webm' });
                onRecordingComplete(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Could not access microphone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop();
            setIsRecording(false);
        }
    };

    return (
        <>
            <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`p-2 rounded-full transition-all ${
                    isRecording 
                        ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse' 
                        : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isRecording ? "Stop Recording" : "Voice Command"}
            >
                {isProcessing ? <Loader size={18} className="animate-spin" /> : isRecording ? <Square size={18} fill="currentColor" /> : <Mic size={18} />}
            </button>

            {isRecording && <VoiceOverlay onStop={stopRecording} isProcessing={false} />}
        </>
    );
}
