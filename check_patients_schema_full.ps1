$headers = @{ "Content-Type" = "application/json" }
$sql = "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'patients';"
$body = @{ setupKey = "WolfSetup2024!"; sql = $sql } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:8080/api/health/exec-sql" -Method Post -Headers $headers -Body $body
$response.rows | Format-Table -AutoSize
