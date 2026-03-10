try {
    $ErrorActionPreference = "Stop"
    Write-Host "Sending Login Request..."
    $response = Invoke-RestMethod -Uri "https://wolf-hms-1026194439642.asia-south1.run.app/api/auth/login" -Method Post -ContentType "application/json" -Body '{"username": "admin_taneja", "password": "password123"}'
    Write-Host "Success! Token: $($response.data.token)"
} catch {
    Write-Host "CAUGHT ERROR:"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)"
    
    if ($_.ErrorDetails) {
        Write-Host "Error Details: $($_.ErrorDetails.Message)"
    }

    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $stream.Position = 0
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        Write-Host "BODY STREAM: $body"
    }
}
