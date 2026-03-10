$ErrorActionPreference = "Stop"

function Test-Login {
    Write-Host "1. Testing Login..."
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body (@{
            username = "admin_taneja"
            password = "password123"
        } | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "   ✅ Login Success! Token Received."
    return $response.token
}

function Test-CreatePatient ($token) {
    Write-Host "2. Testing Patient Creation (UUID Check)..."
    $headers = @{ "Authorization" = "Bearer $token" }
    
    $patientData = @{
        name        = "Test Patient Local"
        dob         = "1990-01-01"
        age         = 30
        gender      = "Male"
        phone       = "9999999999"
        address     = "Localhost St"
        blood_group = "O+"
    }

    try {
        # Use /register endpoint which is confirmed to exist
        $response = Invoke-RestMethod -Uri "http://localhost:5000/api/patients/register" -Method Post -Headers $headers -Body ($patientData | ConvertTo-Json) -ContentType "application/json"
        
        Write-Host "   ✅ Patient Created!"
        # Response structure is { success, patientId, patient: {...} }
        Write-Host "      ID: $($response.patientId) (Should be UUID)"
        # Register endpoint might not return hospital_id in root, but it's in the DB.
        
        if ($response.patientId -match '^[0-9a-fA-F-]{36}$') {
            Write-Host "      ✅ UUID Format Verified."
        }
        else {
            Write-Error "      ❌ ID is NOT a UUID!"
        }

    }
    catch {
        Write-Error "   ❌ Patient Creation Failed: $($_.Exception.Message)"
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
            Write-Host "      Details: $([System.IO.StreamReader]::new($stream).ReadToEnd())"
        }
    }
}

try {
    $token = Test-Login
    Test-CreatePatient $token
    Write-Host "`n✅ FULL LOCAL VERIFICATION PASSED"
}
catch {
    Write-Host "`n❌ VERIFICATION FAILED"
    Write-Host $_
}
