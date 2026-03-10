Write-Host "🚀 Starting Deployment Process..."

# 1. Build Client
Write-Host "📦 Building Client..."
Set-Location client
npm install
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Client build failed"; exit 1 }

# 2. Copy to Server Public (Hybrid Support)
Write-Host "📂 Syncing to Server Public..."
if (!(Test-Path "../server/public")) { New-Item -ItemType Directory -Force -Path "../server/public" }
Copy-Item -Path "dist/*" -Destination "../server/public/" -Recurse -Force

# 3. Deploy Backend (Cloud Run)
Write-Host "☁️ Deploying Backend to Cloud Run..."
Set-Location ../server
# Check if gcloud is available
if (Get-Command gcloud -ErrorAction SilentlyContinue) {
    Write-Host "   > Deploying 'wolf-tech-server' to asia-south1..."
    # Using source . to deploy current directory
    gcloud run deploy wolf-tech-server --source . --region asia-south1 --allow-unauthenticated --quiet
} else {
    Write-Warning "gcloud CLI not found. Please run 'gcloud run deploy' manually."
}

# 4. Deploy Frontend (Firebase)
Write-Host "🔥 Deploying Frontend to Firebase..."
Set-Location ../client
if (Get-Command firebase -ErrorAction SilentlyContinue) {
    Write-Host "   > Deploying to Firebase Hosting..."
    firebase deploy --only hosting
} else {
    Write-Warning "firebase CLI not found. Please run 'firebase deploy' manually."
}

Write-Host "✅ Deployment Script Complete. Check endpoints."
