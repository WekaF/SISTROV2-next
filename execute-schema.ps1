$connString = 'Data Source=192.168.188.29,7869;Initial Catalog=SISTROPI-v2;User ID=sistro;Password=Si$tr0@Pupuk1!'
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)
$conn.Open()

# Read the SQL file from the artifact path
$sqlScriptPath = "C:\Users\weka\.gemini\antigravity\brain\3e065b91-397b-49df-a2a8-6113a75edc50\database_posto_setup.sql"
$sqlScript = [System.IO.File]::ReadAllText($sqlScriptPath)

# Split by GO (Server Management Studio batch separator)
$batches = [System.Text.RegularExpressions.Regex]::Split($sqlScript, '^\s*GO\s*$', [System.Text.RegularExpressions.RegexOptions]::Multiline -bor [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

foreach ($batch in $batches) {
    $cleanBatch = $batch.Trim()
    if ($cleanBatch.Length -gt 0) {
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = $cleanBatch
        try {
            $cmd.ExecuteNonQuery() | Out-Null
            Write-Host "Executed Batch Success."
        } catch {
            Write-Host "Error in batch:"
            Write-Host $cleanBatch
            Write-Host $_.Exception.Message
            $conn.Close()
            exit 1
        }
    }
}
$conn.Close()
Write-Host "SCHEMA DEPLOYMENT SUCCESSFUL!"
