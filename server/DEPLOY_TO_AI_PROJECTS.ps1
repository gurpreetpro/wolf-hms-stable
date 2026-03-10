$source = "C:\Users\HP\.gemini\antigravity\scratch\antigravity-hms"
$dest = "C:\AI_Projects\Hospital app"

Write-Host "Deploying HMS to $dest..."

# Ensure destination exists
if (-not (Test-Path $dest)) {
    New-Item -ItemType Directory -Path $dest -Force
}

# Copy Client
Write-Host "Copying Client..."
Copy-Item -Path "$source\client" -Destination "$dest" -Recurse -Force

# Copy Server
Write-Host "Copying Server..."
Copy-Item -Path "$source\server" -Destination "$dest" -Recurse -Force

# Copy Root Files
Get-ChildItem -Path "$source" -File | ForEach-Object {
    $fileName = $_.Name
    Write-Host "Copying $fileName..."
    Copy-Item -Path $_.FullName -Destination "$dest" -Force
}

Write-Host "Deployment Complete!"
Write-Host "To run the app:"
Write-Host "1. cd '$dest'"
Write-Host "2. cd server; npm install; node server.js"
Write-Host "3. cd client; npm install; npm run dev"
