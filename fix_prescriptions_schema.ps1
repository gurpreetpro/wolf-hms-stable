$headers = @{ "Content-Type" = "application/json" }
$sql = "ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS visit_id INTEGER;"
$body = @{ setupKey = "WolfSetup2024!"; sql = $sql } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "https://wolf-tech-server-708086797390.asia-south1.run.app/api/health/exec-sql" -Method Post -Headers $headers -Body $body
$response
