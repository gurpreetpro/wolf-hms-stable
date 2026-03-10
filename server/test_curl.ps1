$loginBody = @{
    username = "receptionist_user"
    password = "password123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token
Write-Host "Token: $token"

$patientBody = @{
    name    = "Test Patient"
    dob     = "1990-01-01"
    gender  = "Male"
    phone   = "1234567890"
    address = "Test Address"
} | ConvertTo-Json

try {
    $patientResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/patients" -Method Post -Body $patientBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $token" }
    Write-Host "Patient Created: $($patientResponse.id)"
}
catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.ErrorDetails.Message)"
}
