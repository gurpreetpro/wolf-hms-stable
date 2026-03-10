$ErrorActionPreference = "Stop"

function Test-Step {
    param($Name, $ScriptBlock)
    Write-Host "`n🚀 $Name..." -ForegroundColor Cyan
    try {
        & $ScriptBlock
        Write-Host "✅ $Name Passed" -ForegroundColor Green
    }
    catch {
        $msg = "❌ $Name Failed: $($_.Exception.Message)"
        Write-Host $msg -ForegroundColor Red
        if ($_.ErrorDetails) { 
            $resp = "Response: $($_.ErrorDetails.Message)"
            Write-Host $resp -ForegroundColor Red 
            "$msg`n$resp" | Out-File -FilePath "error.log" -Encoding UTF8 -Append
        }
        else {
            $msg | Out-File -FilePath "error.log" -Encoding UTF8 -Append
        }
        exit 1
    }
}

# 1. Login as Receptionist
$receptionToken = ""
Test-Step "Login Receptionist" {
    $body = @{ username = "receptionist_user"; password = "password123" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    $script:receptionToken = $res.token
}

# 2. Register Patient
$patientId = ""
Test-Step "Register Patient" {
    $body = @{
        name    = "Mock Patient PS $(Get-Date -Format 'yyyyMMddHHmmss')"
        dob     = "1990-01-01"
        gender  = "Male"
        phone   = "1234567890"
        address = "123 Mock Lane"
    } | ConvertTo-Json
    
    $res = Invoke-RestMethod -Uri "http://localhost:5000/api/patients" -Method Post -Body $body -ContentType "application/json" -Headers @{ Authorization = "Bearer $receptionToken" }
    $script:patientId = $res.id
    Write-Host "Patient ID: $patientId"
}

# 3. Create OPD Visit
$visitId = ""
Test-Step "Create OPD Visit" {
    $body = @{
        patient_id       = $patientId
        consultation_fee = 500
        payment_mode     = "Cash"
    } | ConvertTo-Json
    
    $res = Invoke-RestMethod -Uri "http://localhost:5000/api/opd/register" -Method Post -Body $body -ContentType "application/json" -Headers @{ Authorization = "Bearer $receptionToken" }
    $script:visitId = $res.visit.id
    Write-Host "Visit ID: $visitId"
}

# 4. Login as Doctor
$doctorToken = ""
Test-Step "Login Doctor" {
    $body = @{ username = "doctor_user"; password = "password123" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    $script:doctorToken = $res.token
}

# 5. Doctor Consultation
Test-Step "Submit Consultation" {
    $body = @{
        visit_id      = $visitId
        diagnosis     = "Viral Fever"
        prescriptions = @(
            @{ name = "Paracetamol"; dose = "500mg"; freq = "TDS"; duration = "5 days" },
            @{ name = "Cetirizine"; dose = "10mg"; freq = "OD"; duration = "5 days" }
        )
        lab_requests  = @("Complete Blood Count", "Malaria Parasite")
    } | ConvertTo-Json -Depth 5
    
    $res = Invoke-RestMethod -Uri "http://localhost:5000/api/clinical/consultation" -Method Post -Body $body -ContentType "application/json" -Headers @{ Authorization = "Bearer $doctorToken" }
    Write-Host "Message: $($res.message)"
}

Write-Host "`n🎉 Mock Drill Completed Successfully!" -ForegroundColor Green
