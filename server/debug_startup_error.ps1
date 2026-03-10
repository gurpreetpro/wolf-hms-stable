try {
    $ErrorActionPreference = "Stop"
    Write-Host "Fetching Startup Error Report..."
    $response = Invoke-RestMethod -Uri "https://wolf-hms-1026194439642.asia-south1.run.app/api/debug/startup-error" -Method Get
    
    if ($response.success) {
        Write-Host "System Status: HEALTHY"
        Write-Host $response.message
    }
    else {
        Write-Host "System Status: CRASHED"
        Write-Host "----------------ERROR LOG----------------"
        Write-Host $response.error
        Write-Host "-----------------------------------------"
    }

}
catch {
    Write-Host "CAUGHT NETWORK ERROR:"
    Write-Host $_.Exception.Message
}
