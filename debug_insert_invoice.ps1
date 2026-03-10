$headers = @{ "Content-Type" = "application/json" }
$sql = "INSERT INTO invoices (patient_id, total_amount, status, hospital_id, generated_at, generated_by) VALUES ('751d437e-3d9d-41f6-a8af-b900d8db3331', 100.00, 'Pending', 1, NOW(), 1) RETURNING id;"
$body = @{ setupKey = "WolfSetup2024!"; sql = $sql } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "https://wolf-tech-server-708086797390.asia-south1.run.app/api/health/exec-sql" -Method Post -Headers $headers -Body $body
    $response | ConvertTo-Json
}
catch {
    Write-Output "Error: $_"
}
