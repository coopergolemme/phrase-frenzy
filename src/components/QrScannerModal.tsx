import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { extractRoomCodeFromQr } from "../utils/qrParser";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (roomCode: string) => void;
}

export function QrScannerModal({ isOpen, onClose, onScanSuccess }: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Check available cameras
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          if (!isMounted) return;
          const videoInputDevices = devices.filter((device) => device.kind === "videoinput");
          setHasMultipleCameras(videoInputDevices.length > 1);
        })
        .catch(() => {
          // Ignore enumerateDevices error
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Start video stream & scanner loop
  useEffect(() => {
    if (!isOpen) {
      setIsInitializing(true);
      setError(null);
      return;
    }

    let isSubscribed = true;
    setIsInitializing(true);
    setError(null);

    const stopStream = () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };

    const startCamera = async () => {
      stopStream();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (isSubscribed) {
          setError("Camera access is not supported on this browser or environment.");
          setIsInitializing(false);
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (!isSubscribed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          // Wait for video to play before starting scan loop
          video.setAttribute("playsinline", "true"); // required for iOS Safari
          await video.play();

          if (isSubscribed) {
            setIsInitializing(false);
            scanFrame();
          }
        }
      } catch (err: unknown) {
        if (!isSubscribed) return;
        setIsInitializing(false);
        const name = (err as { name?: string }).name;
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setError("Camera permission denied. Please enable camera permissions in your browser settings to scan QR codes.");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setError("No camera was found on your device.");
        } else {
          setError("Could not open camera stream. Please try again.");
        }
      }
    };

    const scanFrame = () => {
      if (!isSubscribed) return;
      const video = videoRef.current;

      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        let canvas = canvasRef.current;
        if (!canvas) {
          canvas = document.createElement("canvas");
          canvasRef.current = canvas;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data) {
            const extractedCode = extractRoomCodeFromQr(code.data);
            if (extractedCode) {
              if ("vibrate" in navigator) {
                try {
                  navigator.vibrate(100);
                } catch {
                  // Ignore vibration errors
                }
              }
              stopStream();
              onScanSuccess(extractedCode);
              onClose();
              return;
            }
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(scanFrame);
    };

    void startCamera();

    return () => {
      isSubscribed = false;
      stopStream();
    };
  }, [isOpen, facingMode, onScanSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Scan QR Code"
    >
      <div className="relative flex w-full max-w-md flex-col items-center gap-4 rounded-card border border-outline bg-surface-solid p-5 shadow-2xl">
        {/* Header */}
        <div className="flex w-full items-center justify-between border-b border-border-solid pb-3">
          <h2 className="m-0 font-display text-[1.3rem] font-bold text-yellow">
            Scan Room QR Code
          </h2>
          <button
            type="button"
            className="flex h- touch-min min-h-touch min-w-touch items-center justify-center rounded-full border border-outline bg-surface text-xl text-text hover:bg-white/10 active:scale-95"
            onClick={onClose}
            aria-label="Close scanner"
          >
            &times;
          </button>
        </div>

        {/* Camera Viewfinder Box */}
        <div className="relative flex aspect-square w-full max-w-[280px] overflow-hidden rounded-card border-2 border-primary/50 bg-black/60 shadow-inner items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
          />

          {/* Scanner Overlay / Reticle */}
          {!error && !isInitializing && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
              {/* Corner indicators */}
              <div className="relative h-full w-full rounded-lg border-2 border-dashed border-primary/40">
                <div className="absolute top-0 left-0 h-6 w-6 border-t-4 border-l-4 border-primary" />
                <div className="absolute top-0 right-0 h-6 w-6 border-t-4 border-r-4 border-primary" />
                <div className="absolute bottom-0 left-0 h-6 w-6 border-b-4 border-l-4 border-primary" />
                <div className="absolute bottom-0 right-0 h-6 w-6 border-b-4 border-r-4 border-primary" />
                {/* Laser animation */}
                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_8px_#3ad97e] animate-pulse" />
              </div>
            </div>
          )}

          {/* Initializing Spinner */}
          {isInitializing && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-text-secondary gap-2 p-4 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm font-semibold m-0">Starting camera…</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-4 text-center text-danger gap-2">
              <span className="text-2xl" aria-hidden="true">
                📷
              </span>
              <p className="m-0 text-sm font-semibold">{error}</p>
            </div>
          )}
        </div>

        {/* Footer info & controls */}
        <p className="m-0 text-center text-xs text-text-secondary">
          Align the host's QR code within the frame to join automatically.
        </p>

        <div className="flex w-full items-center gap-2 pt-1">
          {hasMultipleCameras && !error && (
            <button
              type="button"
              className="btn btn--outline flex-1 py-2 text-sm"
              onClick={() =>
                setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))
              }
            >
              🔄 Flip Camera
            </button>
          )}

          <button
            type="button"
            className="btn btn--text flex-1 py-2 text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
