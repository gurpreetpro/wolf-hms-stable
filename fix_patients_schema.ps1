$headers = @{ "Content-Type" = "application/json" }
$sql = "ALTER TABLE patients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();"
$body = @{ setupKey = "WolfSetup2024!"; sql = $sql } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "https://wolf-tech-server-708086797390.asia-south1.run.app/api/health/exec-sql" -Method Post -Headers $headers -Body $body
$response | ConvertTo-Json
