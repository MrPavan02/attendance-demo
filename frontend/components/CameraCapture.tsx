
import React, { useRef, useEffect, useState, useCallback } from 'react';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  isProcessing: boolean;
  onDimensionsChange?: (size: { width: number; height: number }) => void;
  isMobileViewport?: boolean;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, isProcessing, onDimensionsChange, isMobileViewport = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoSize, setVideoSize] = useState({ width: 640, height: 480 });
  const [aspectRatio, setAspectRatio] = useState(640 / 480);

  useEffect(() => {
    async function startCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err) {
        setError('Secure camera access required for biometric verification.');
      }
    }
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handleLoadedMetadata = () => {
      const { videoWidth, videoHeight } = videoEl;
      if (videoWidth && videoHeight) {
        setVideoSize({ width: videoWidth, height: videoHeight });
        setAspectRatio(videoWidth / videoHeight);
        onDimensionsChange?.({ width: videoWidth, height: videoHeight });
      }
    };

    videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [stream, onDimensionsChange]);

  const capture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        const { width, height } = videoSize;
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        context.drawImage(videoRef.current, 0, 0, width, height);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
        onCapture(dataUrl);
      }
    }
  }, [onCapture, videoSize]);

  const normalizedAspectRatio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : undefined;
  const containerStyle: React.CSSProperties = isMobileViewport
    ? { height: '100%', width: '100%', minHeight: '100%' }
    : { aspectRatio: normalizedAspectRatio };
  const videoStyle: React.CSSProperties = isMobileViewport
    ? { height: '100%', width: '100%' }
    : { aspectRatio: normalizedAspectRatio };

  return (
    <div 
      className="relative w-full bg-[#F1F6F9] rounded-2xl overflow-hidden border border-[#9BA4B4] shadow-sm group"
      style={containerStyle}
    >
      {error ? (
        <div className="flex flex-col items-center justify-center h-full text-[#394867] p-8 text-center">
          <i className="fas fa-video-slash text-5xl mb-4 text-[#9BA4B4]"></i>
          <p className="font-bold text-sm uppercase tracking-tight">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-xs font-black text-[#14274E] uppercase underline">Retry Access</button>
        </div>
      ) : (
        <>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover scale-x-[-1]"
            style={videoStyle}
          />
          <canvas ref={canvasRef} width="640" height="480" className="hidden" />
          
          <div className="absolute inset-0 border-[20px] border-[#14274E]/5 pointer-events-none">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-dashed border-[#5C7BA6]/20 rounded-full"></div>
          </div>

          <div className="absolute bottom-6 left-0 right-0 flex justify-center">
             <button
              onClick={capture}
              disabled={isProcessing}
              className={`px-8 py-3 rounded-full font-bold flex items-center space-x-3 shadow-2xl transition-all border border-[#9BA4B4] ${
                isProcessing ? 'bg-[#D6E4F0] text-[#394867]' : 'bg-[#14274E] hover:bg-[#5C7BA6] text-white active:scale-95'
              }`}
             >
               <i className={`fas ${isProcessing ? 'fa-spinner fa-spin' : 'fa-face-viewfinder'} ${isProcessing ? 'text-[#394867]' : 'text-white'}`}></i>
               <span className="text-xs uppercase tracking-widest">{isProcessing ? 'Processing...' : 'Verify Identity'}</span>
             </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CameraCapture;
