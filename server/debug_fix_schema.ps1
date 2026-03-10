try {
    $ErrorActionPreference = "Stop"
    Write-Host "Triggering Schema Fix..."
    $response = Invoke-RestMethod -Uri "https://wolf-hms-1026194439642.asia-south1.run.app/api/test/fix-users-schema" -Method Get
    Write-Host "Success!"
    Write-Host $response
}
catch {
    Write-Host "CAUGHT ERROR:"
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        Write-Host "BODY: $body"
    }
    else {
        Write-Host "NO RESPONSE. Exception: $_"
    }
}
