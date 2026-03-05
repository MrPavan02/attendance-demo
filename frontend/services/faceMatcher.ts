import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let modelsLoadingError: string | null = null;

// Models hosted locally in public/models folder
const MODEL_PATH = '/models';

const loadModels = async () => {
  if (modelsLoaded) return;
  if (modelsLoadingError) throw new Error(`Models already failed to load: ${modelsLoadingError}`);
  
  try {
    console.log('[Face-API] Loading models from local path:', MODEL_PATH);
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_PATH),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_PATH),
    ]);
    console.log('[Face-API] Models loaded successfully from local storage');
    modelsLoaded = true;
  } catch (error) {
    modelsLoadingError = String(error);
    console.error('[Face-API] Failed to load models:', error);
    throw error;
  }
};

const descriptorFromImage = async (src: string): Promise<Float32Array | null> => {
  try {
    console.log('[Face-API] Getting descriptor from:', src);
    const img = await faceapi.fetchImage(src);
    console.log('[Face-API] Image loaded, detecting face...');
    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    if (!detection) {
      console.warn('[Face-API] No face detected in image');
      return null;
    }
    console.log('[Face-API] Face detected successfully');
    return detection.descriptor ?? null;
  } catch (error) {
    console.error('[Face-API] Error processing image:', error);
    throw error;
  }
};

export const compareFaces = async (
  capturedDataUrl: string,
  enrolledImageUrl: string,
  threshold = 0.5  // Standard threshold for face-api.js
): Promise<{ ok: boolean; distance?: number; reason?: string }> => {
  try {
    console.log('[Face-Verification] Starting verification process...');
    
    await loadModels();

    if (!enrolledImageUrl) {
      return { ok: false, reason: 'No enrolled face available' };
    }

    console.log('[Face-Verification] Loading enrolled image from:', enrolledImageUrl);
    const [captured, enrolled] = await Promise.all([
      descriptorFromImage(capturedDataUrl),
      descriptorFromImage(enrolledImageUrl),
    ]);

    if (!captured) return { ok: false, reason: 'No face detected in captured image' };
    if (!enrolled) return { ok: false, reason: 'No face detected in enrolled image' };

    const distance = faceapi.euclideanDistance(captured, enrolled);
    console.log('[Face-Verification] Face distance:', distance, 'Threshold:', threshold);
    
    const isMatch = distance <= threshold;
    console.log('[Face-Verification] Match result:', isMatch ? 'PASS' : 'FAIL');
    
    return { ok: isMatch, distance, reason: distance.toFixed(3) };
  } catch (error: any) {
    console.error('[Face-Verification] Error during verification:', error);
    return { 
      ok: false, 
      reason: error?.message || 'Face verification service error. Please try again.'
    };
  }
};
