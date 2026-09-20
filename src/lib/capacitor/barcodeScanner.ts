import { Capacitor } from "@capacitor/core";

export interface ScanResult {
  code: string;
  format?: string;
}

/**
 * Universal Barcode Scanner service.
 * Supports:
 * 1. Native Capacitor Camera / MLKit Barcode Scanning inside Android WebView.
 * 2. Browser BarcodeDetector API (Chrome on Android / Edge / Safari).
 * 3. Graceful UI fallback with manual entry modal.
 */
export async function scanBarcode(): Promise<string | null> {
  // Check if native Capacitor environment
  if (Capacitor.isNativePlatform()) {
    try {
      // Dynamic import to avoid SSR errors
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      // In a full MLKit setup, image.base64String would be processed.
      // If native detector isn't bundled, we can process via window.BarcodeDetector if available:
      if (typeof window !== "undefined" && "BarcodeDetector" in window && image.base64String) {
        try {
          const img = new Image();
          img.src = `data:image/jpeg;base64,${image.base64String}`;
          await new Promise((resolve) => {
            img.onload = resolve;
          });
          const detector = new (window as any).BarcodeDetector({
            formats: ["code_128", "ean_13", "ean_8", "upc_a", "upc_e", "qr_code"],
          });
          const barcodes = await detector.detect(img);
          if (barcodes.length > 0) {
            return barcodes[0].rawValue;
          }
        } catch (detectorErr) {
          console.warn("[scanBarcode] BarcodeDetector on native photo failed:", detectorErr);
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes("cancelled")) {
        return null;
      }
      console.warn("[scanBarcode] Native camera scan error:", err);
    }
  }

  // Web Browser Barcode Scanning fallback
  return new Promise((resolve) => {
    openWebScannerModal((code) => {
      resolve(code);
    });
  });
}

/**
 * Lightweight in-app camera viewfinder / manual entry modal for Web
 */
function openWebScannerModal(onResult: (code: string | null) => void) {
  if (typeof document === "undefined") {
    onResult(null);
    return;
  }

  const modalId = "ge-barcode-scanner-modal";
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = modalId;
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.backgroundColor = "rgba(0,0,0,0.8)";
  overlay.style.backdropFilter = "blur(6px)";
  overlay.style.zIndex = "99999";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "20px";

  const card = document.createElement("div");
  card.style.background = "#18181b";
  card.style.border = "1px solid rgba(255,255,255,0.15)";
  card.style.borderRadius = "16px";
  card.style.padding = "24px";
  card.style.maxWidth = "420px";
  card.style.width = "100%";
  card.style.boxShadow = "0 25px 50px -12px rgba(0,0,0,0.5)";
  card.style.color = "#f4f4f5";
  card.style.display = "flex";
  card.style.flexDirection = "column";
  card.style.gap = "16px";

  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div style="font-weight:700;font-size:1.1rem;display:flex;align-items:center;gap:8px;">
        <span>📷</span> Scan Product Barcode
      </div>
      <button id="ge-scanner-close" style="background:transparent;border:none;color:#a1a1aa;font-size:1.4rem;cursor:pointer;padding:4px;">&times;</button>
    </div>
    <div style="position:relative;width:100%;height:220px;background:#09090b;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;border:1px dashed rgba(255,255,255,0.2);">
      <video id="ge-scanner-video" style="width:100%;height:100%;object-fit:cover;display:none;" playsinline muted></video>
      <div id="ge-scanner-placeholder" style="text-align:center;padding:16px;font-size:0.85rem;color:#a1a1aa;">
        <div style="font-size:2rem;margin-bottom:8px;">🎯</div>
        Point camera at product barcode or enter SKU manually below
      </div>
      <div id="ge-scanner-laser" style="position:absolute;top:50%;left:15%;right:15%;height:2px;background:#10b981;box-shadow:0 0 10px #10b981;display:none;"></div>
    </div>
    <div style="display:flex;gap:8px;">
      <input id="ge-scanner-manual-input" type="text" placeholder="Or enter Barcode / SKU manually..." style="flex:1;background:#27272a;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px 14px;color:#fff;font-size:0.9rem;outline:none;" />
      <button id="ge-scanner-manual-btn" style="background:var(--ge-accent, #10b981);color:#fff;border:none;border-radius:8px;padding:10px 16px;font-weight:600;font-size:0.875rem;cursor:pointer;">Use</button>
    </div>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const video = card.querySelector("#ge-scanner-video") as HTMLVideoElement;
  const placeholder = card.querySelector("#ge-scanner-placeholder") as HTMLDivElement;
  const laser = card.querySelector("#ge-scanner-laser") as HTMLDivElement;
  const closeBtn = card.querySelector("#ge-scanner-close") as HTMLButtonElement;
  const manualInput = card.querySelector("#ge-scanner-manual-input") as HTMLInputElement;
  const manualBtn = card.querySelector("#ge-scanner-manual-btn") as HTMLButtonElement;

  manualInput.focus();

  let mediaStream: MediaStream | null = null;
  let scanInterval: any = null;

  const cleanup = () => {
    if (scanInterval) clearInterval(scanInterval);
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }
    overlay.remove();
  };

  closeBtn.onclick = () => {
    cleanup();
    onResult(null);
  };

  const submitManual = () => {
    const val = manualInput.value.trim();
    if (val) {
      cleanup();
      onResult(val);
    }
  };

  manualBtn.onclick = submitManual;
  manualInput.onkeydown = (e) => {
    if (e.key === "Enter") submitManual();
  };

  // Attempt to start camera stream
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        mediaStream = stream;
        video.srcObject = stream;
        video.style.display = "block";
        placeholder.style.display = "none";
        laser.style.display = "block";
        video.play();

        // Check if BarcodeDetector is available
        if ("BarcodeDetector" in window) {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ["code_128", "ean_13", "ean_8", "upc_a", "upc_e", "qr_code"],
          });

          scanInterval = setInterval(async () => {
            try {
              if (video.readyState >= 2) {
                const barcodes = await barcodeDetector.detect(video);
                if (barcodes && barcodes.length > 0) {
                  const detected = barcodes[0].rawValue;
                  cleanup();
                  onResult(detected);
                }
              }
            } catch (err) {
              // Ignore frame detection hiccups
            }
          }, 400);
        }
      })
      .catch(() => {
        // Camera permission denied or not available; manual input is already prominent
      });
  }
}
