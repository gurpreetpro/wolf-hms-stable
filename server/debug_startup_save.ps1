try {
    $ErrorActionPreference = "Stop"
    Write-Host "Fetching Startup Error Report..."
    $response = Invoke-RestMethod -Uri "https://wolf-hms-1026194439642.asia-south1.run.app/api/debug/startup-error" -Method Get
    
    if ($response.success) {
        Write-Host "System Status: HEALTHY"
    }
    else {
        Write-Host "System Status: CRASHED"
        $response.error | Out-File -FilePath "startup_report.txt" -Encoding utf8
        Write-Host "Error saved to startup_report.txt"
    }

}
catch {
    Write-Host "CAUGHT NETWORK ERROR:"
    Write-Host $_.Exception.Message
}
