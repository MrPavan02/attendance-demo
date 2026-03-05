"""
Google Drive proxy router - serves face-api models from Google Drive
Uses allorigins CORS proxy to bypass Google Drive's CORS restrictions
"""
from fastapi import APIRouter
from fastapi.responses import RedirectResponse
import httpx

router = APIRouter(prefix="/api/v1/models", tags=["models"])

# Google Drive folder IDs for face-api models
DRIVE_FOLDERS = {
    "ssd_mobilenetv1": "12c09x76F2nMGDVQo8X84SmW8SwGnDz73",
    "face_landmark_68": "1F5NbeDsD2UfERcF2n_LsU1LXe-UGkHUg",
    "face_recognition": "1mwZ3YTiCALrMu4hrPr4Skv7iXZyJr7ZU"
}


@router.get("/{model_path}/{filename}")
async def serve_model_file(model_path: str, filename: str):
    """
    Proxy request for model files from Google Drive using CORS proxy
    
    Example: GET /api/v1/models/ssd_mobilenetv1/ssd_mobilenetv1_model-weights_manifest.json
    """
    if model_path not in DRIVE_FOLDERS:
        return {"error": f"Unknown model path: {model_path}"}, 404
    
    folder_id = DRIVE_FOLDERS[model_path]
    
    # Use allorigins CORS proxy to fetch from Google Drive
    # First, construct the Drive folder URL with file search
    drive_folder_url = f"https://drive.google.com/drive/folders/{folder_id}"
    
    # The actual file access will be via CORS proxy
    # Redirect client to use CORS proxy for the request
    cors_proxy_url = f"https://api.allorigins.win/get?url={drive_folder_url}"
    
    return {
        "model_path": model_path,
        "filename": filename,
        "folder_id": folder_id,
        "drive_url": drive_folder_url,
        "status": "Use frontend CORS proxy for direct file access",
        "note": "Models are stored in Google Drive - fetch directly from Drive using CORS proxy"
    }

