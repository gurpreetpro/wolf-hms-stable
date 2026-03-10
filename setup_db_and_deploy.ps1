$ProjectID = "wolf-tech-hms"
$Region = "asia-south1"
$InstanceName = "wolf-hms-db"
$DBName = "hospital_db"
$Image = "asia-south1-docker.pkg.dev/$ProjectID/wolf-hms-repo/wolf-tech-server:latest"
$ServiceName = "wolf-tech-server"
$DBConnection = $ProjectID + ":" + $Region + ":" + $InstanceName

# 1. Create Database
Write-Host "🗄️ Creating Database '$DBName'..."
gcloud sql databases create $DBName --instance=$InstanceName

# 2. Deploy to Cloud Run
Write-Host "🚀 Deploying to Cloud Run..."
gcloud run deploy $ServiceName `
    --image $Image `
    --region $Region `
    --platform managed `
    --allow-unauthenticated `
    --add-cloudsql-instances $DBConnection `
    --set-env-vars "NODE_ENV=production" `
    --set-env-vars "DB_HOST=/cloudsql/$DBConnection" `
    --set-env-vars "DB_USER=postgres" `
    --set-env-vars "DB_PASSWORD=WolfHMS_Secure_2026!" `
    --set-env-vars "DB_NAME=$DBName" `
    --set-env-vars "JWT_SECRET=WolfHMS_Super_Secret_Key_2026" `
    --set-env-vars "GOOGLE_SERVICE_ACCOUNT_EMAIL=" `
    --set-env-vars "GOOGLE_PRIVATE_KEY=" `
    --port 8080

Write-Host "✅ Deployment Command Sent!"
