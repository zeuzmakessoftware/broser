import { Square, Loader } from 'lucide-react';
import { createPortal } from 'react-dom';

interface VoiceOverlayProps {
    onStop: () => void;
    isProcessing?: boolean;
}

export function VoiceOverlay({ onStop, isProcessing = false }: VoiceOverlayProps) {
    // Render to document.body to avoid z-index/clipping issues
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="flex flex-col items-center gap-8">
                <div 
                    className="w-32 h-32 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform relative"
                    onClick={onStop}
                >
                    {!isProcessing && <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />}
                    {isProcessing ? <Loader size={48} className="animate-spin" /> : <Square size={48} fill="currentColor" />}
                </div>
                <h2 className="text-3xl font-light text-white tracking-widest animate-pulse">
                    {isProcessing ? "PROCESSING..." : "LISTENING..."}
                </h2>
                <p className="text-gray-400 text-sm">Click to stop</p>
            </div>
        </div>,
        document.body
    );
}
