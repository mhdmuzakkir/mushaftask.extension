$content = Get-Content 'index.html' -Raw
$regex = [regex]'id="([^"]+)"'
$matches = $regex.Matches($content)
$ids = $matches | ForEach-Object { $_.Groups[1].Value }
$unique = $ids | Sort-Object | Get-Unique
Write-Output 'ALL_UNIQUE_IDS'
$unique | ForEach-Object { Write-Output $_ }
Write-Output ('TOTAL_UNIQUE ' + $unique.Count)
Write-Output ('TOTAL_WITH_DUPLICATES ' + $ids.Count)
$grouped = $ids | Group-Object | Where-Object { $_.Count -gt 1 }
if ($grouped) {
    Write-Output 'DUPLICATES_FOUND'
    $grouped | ForEach-Object { Write-Output ($_.Name + ' ' + $_.Count) }
} else {
    Write-Output 'NO_DUPLICATES'
}
