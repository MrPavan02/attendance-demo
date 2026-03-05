# Download face-api.js models from vladmandic's fork (actively maintained)
$baseUrl = "https://raw.githubusercontent.com/vladmandic/face-api/master/model"
$targetDir = "C:\Vetan\Project\frontend\public\models"

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

function Download-File($url, $outputPath) {
    try {
        Write-Host "Downloading: $url"
        $parent = Split-Path -Parent $outputPath
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
        Invoke-WebRequest -Uri $url -OutFile $outputPath -UseBasicParsing
        Write-Host "Success: $(Split-Path -Leaf $outputPath)"
    }
    catch {
        Write-Host "Failed: $url - $($_.Exception.Message)"
    }
}

# Download Tiny Face Detector (lightweight alternative)
Write-Host "`n=== Downloading Tiny Face Detector ==="
Download-File "$baseUrl/tiny_face_detector_model-shard1" "$targetDir/tiny_face_detector_model-shard1"
Download-File "$baseUrl/tiny_face_detector_model-weights_manifest.json" "$targetDir/tiny_face_detector_model-weights_manifest.json"

# Download Face Landmark 68 Net
Write-Host "`n=== Downloading Face Landmark 68 Net ==="
Download-File "$baseUrl/face_landmark_68_model-shard1" "$targetDir/face_landmark_68_model-shard1"
Download-File "$baseUrl/face_landmark_68_model-weights_manifest.json" "$targetDir/face_landmark_68_model-weights_manifest.json"

# Download Face Recognition Net
Write-Host "`n=== Downloading Face Recognition Net ==="
Download-File "$baseUrl/face_recognition_model-shard1" "$targetDir/face_recognition_model-shard1"
Download-File "$baseUrl/face_recognition_model-shard2" "$targetDir/face_recognition_model-shard2"
Download-File "$baseUrl/face_recognition_model-weights_manifest.json" "$targetDir/face_recognition_model-weights_manifest.json"

Write-Host "`n=== Download Complete ==="
Write-Host "Models saved to: $targetDir"
Get-ChildItem -Path $targetDir -Recurse | Select-Object Name, Length | Format-Table
