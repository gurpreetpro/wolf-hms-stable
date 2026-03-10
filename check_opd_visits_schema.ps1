$headers = @{ "Content-Type" = "application/json" }
$sql = "SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'opd_visits';"
$body = @{ setupKey = "WolfSetup2024!"; sql = $sql } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "https://wolf-tech-server-708086797390.asia-south1.run.app/api/health/exec-sql" -Method Post -Headers $headers -Body $body
$response.rows | ConvertTo-Json
