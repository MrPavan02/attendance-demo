$repoUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
$targetDir = "C:\Vetan\Project\frontend\public\models"

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

function Download-File($url, $outputPath) {
    try {
        Write-Host "Downloading: $url"
        $parent = Split-Path -Parent $outputPath
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
        Invoke-WebRequest -Uri $url -OutFile $outputPath -UseBasicParsing
        Write-Host "Downloaded: $(Split-Path -Leaf $outputPath)"
    }
    catch {
        Write-Host "Failed: $url"
        Write-Host $_.Exception.Message
    }
}

Write-Host "Downloading SSD MobileNet v1 Model..."
Download-File "$repoUrl/ssd_mobilenetv1_model/manifest.json" "$targetDir/ssd_mobilenetv1_model/manifest.json"
Download-File "$repoUrl/ssd_mobilenetv1_model/ssd_mobilenetv1_model-weights_manifest.json" "$targetDir/ssd_mobilenetv1_model/ssd_mobilenetv1_model-weights_manifest.json"
Download-File "$repoUrl/ssd_mobilenetv1_model/ssd_mobilenetv1_model-shard1" "$targetDir/ssd_mobilenetv1_model/ssd_mobilenetv1_model-shard1"
Download-File "$repoUrl/ssd_mobilenetv1_model/ssd_mobilenetv1_model-shard2" "$targetDir/ssd_mobilenetv1_model/ssd_mobilenetv1_model-shard2"

Write-Host "Downloading Face Landmark 68 Model..."
Download-File "$repoUrl/face_landmark_68_model/manifest.json" "$targetDir/face_landmark_68_model/manifest.json"
Download-File "$repoUrl/face_landmark_68_model/face_landmark_68_model-weights_manifest.json" "$targetDir/face_landmark_68_model/face_landmark_68_model-weights_manifest.json"
Download-File "$repoUrl/face_landmark_68_model/face_landmark_68_model-shard1" "$targetDir/face_landmark_68_model/face_landmark_68_model-shard1"

Write-Host "Downloading Face Recognition Model..."
Download-File "$repoUrl/face_recognition_model/manifest.json" "$targetDir/face_recognition_model/manifest.json"
Download-File "$repoUrl/face_recognition_model/face_recognition_model-weights_manifest.json" "$targetDir/face_recognition_model/face_recognition_model-weights_manifest.json"
Download-File "$repoUrl/face_recognition_model/face_recognition_model-shard1" "$targetDir/face_recognition_model/face_recognition_model-shard1"

Write-Host "Model download complete!"
