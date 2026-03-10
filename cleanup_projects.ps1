# Projects to Delete (Freeing up Billing Quota)
# CAUTION: This is permanent.

$ProjectsToDelete = @(
    "wolf-tech-hms-deploy",
    "gen-lang-client-0644516170",
    "gen-lang-client-0815925331",
    "project-8a7ab211-98dc-40b0-a37",
    "project-da0fddf3-a9ca-46aa-9b8",
    "wolf-apk-uploader",
    "wolf-hms",
    "wolf-hms-481309",
    "wolf-security-app-gp2306",
    "wolf-security-app-gp2306-39f29"
)

foreach ($proj in $ProjectsToDelete) {
    Write-Host "🗑️ Deleting Project: $proj ..."
    gcloud projects delete $proj --quiet
}

Write-Host "✨ Cleanup Complete. Quotas should free up shortly."
Write-Host "You can now verify with 'gcloud projects list'."
