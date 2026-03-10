$headers = @{ "Content-Type" = "application/json" }
$sql = "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'home_collection_requests';"
$body = @{ setupKey = "WolfSetup2024!"; sql = $sql } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "https://wolf-tech-server-708086797390.asia-south1.run.app/api/health/exec-sql" -Method Post -Headers $headers -Body $body
$response.rows | Format-Table -AutoSize
