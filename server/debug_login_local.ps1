$ErrorActionPreference = "Stop"
try {
    Write-Host "Sending Local Login Request..."
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body (@{
            username = "admin_taneja"
            password = "password123"
        } | ConvertTo-Json) -ContentType "application/json"

    Write-Host "Login Success!"
    Write-Host "Token received. User ID: $($response.user.id)"
    Write-Host "Hospital ID: $($response.user.hospital_id)"
    
}
catch {
    Write-Host "Login Failed!"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    $stream = $_.Exception.Response.GetResponseStream()
    if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Error Details: $($reader.ReadToEnd())"
    }
}
