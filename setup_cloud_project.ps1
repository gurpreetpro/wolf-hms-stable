$ProjectId = "wolf-tech-hms"
$BillingAccount = "0102A3-539EF1-B99A55"
$Region = "asia-south1"

Write-Host "🚀 Creating Project: $ProjectId..."
gcloud projects create $ProjectId --name="Wolf Tech HMS"

Write-Host "💳 Linking Billing..."
gcloud beta billing projects link $ProjectId --billing-account=$BillingAccount

Write-Host "⚙️ Setting Configuration..."
gcloud config set project $ProjectId
gcloud config set compute/region $Region

Write-Host "🔌 Enabling APIs (This takes a minute)..."
gcloud services enable run.googleapis.com sqladmin.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com

Write-Host "✅ Project Setup Complete!"
