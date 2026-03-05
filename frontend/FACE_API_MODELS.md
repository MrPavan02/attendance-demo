# Face API Models Configuration

## Overview
This project uses `face-api.js` library for face detection, recognition, and verification. Models are **loaded dynamically from a CDN** without storing them locally in the project.

## Model Sources

### Primary Source (Active)
**GitHub Raw Content**
- Base URL: `https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/`
- Official source repository for face-api.js models
- No local storage required in the project

### Backup Sources
1. **Google Drive:** https://drive.google.com/drive/folders/12VB_ywKrl9vdqt8_aHt2SrBDmAQMaA4X
2. **GitHub Repository:** https://github.com/justadudewhohacks/face-api.js/tree/master/weights

## Models Loaded

The following models are automatically loaded when face verification is needed:

1. **ssdMobilenetv1** - Face detection
   - URL: `https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model`
   - Files: `ssd_mobilenetv1_model-weights_manifest.json`, `ssd_mobilenetv1_model-shard1`, `ssd_mobilenetv1_model-shard2`

2. **face_landmark_68** - 68-point facial landmark detection
   - URL: `https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model`
   - Files: `face_landmark_68_model-weights_manifest.json`, `face_landmark_68_model-shard1`

3. **face_recognition** - Face recognition embeddings
   - URL: `https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model`
   - Files: `face_recognition_model-weights_manifest.json`, `face_recognition_model-shard1`, `face_recognition_model-shard2`

## Implementation

### Frontend (faceMatcher.ts)
```typescript
const MODEL_PATHS = {
  ssdMobilenet: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model',
  faceLandmark68: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model',
  faceRecognition: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model'
};

// Models are loaded on-demand via GitHub
await Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_PATHS.ssdMobilenet),
  faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_PATHS.faceLandmark68),
  faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_PATHS.faceRecognition),
]);
```

## Advantages

✅ **No Local Storage:** Models are not committed to git, keeping repository size small
✅ **Official Source:** Direct access to official face-api.js model repository
✅ **Reduced Deployment Size:** Faster deployments without large model files
✅ **Redundancy:** Multiple backup sources available
✅ **Reliable:** GitHub provides stable, globally accessible content delivery

## If GitHub is Unavailable

1. **Switch to Google Drive backup:**
   - Models are stored at: https://drive.google.com/drive/folders/12VB_ywKrl9vdqt8_aHt2SrBDmAQMaA4X
   - Update MODEL_PATHS to use Google Drive direct share links with CORS proxy

2. **Local Development:**
   - Download models from Google Drive
   - Place in `public/face-api/` directory
   - Update MODEL_PATHS to use local paths like `/face-api/ssd_mobilenetv1_model`

## Performance Considerations

- Models are cached by the browser after first load (~10-20MB total)
- Subsequent page loads use cached models
- Initial load with poor connectivity may take 10-30 seconds
- Consider showing a loading indicator during model initialization
- GitHub raw content is globally cached for improved speeds

## Troubleshooting

If models fail to load:
1. Check browser console for error details
2. Verify internet connectivity
3. Check GitHub status: https://www.githubstatus.com/
4. Try using a VPN if GitHub is geographically restricted
5. Clear browser cache and reload the page
6. Fall back to Google Drive backup if GitHub is unavailable
   - Update MODEL_PATHS to use Google Drive direct links
