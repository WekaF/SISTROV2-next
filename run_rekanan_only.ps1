$sql = Get-Content -Path 'set_role_rekanan_only.sql' -Raw
$connString = "Data Source=192.168.188.29,7869;Initial Catalog=SISTROPI-v2;User ID=sistro;Password=Si`$tr0@Pupuk1!"
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)
try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $sql
    $cmd.ExecuteNonQuery()
    Write-Host "SUCCESS: User role reset to REKANAN only."
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    exit 1
} finally {
    $conn.Close()
}
