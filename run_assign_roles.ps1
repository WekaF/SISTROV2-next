$sql = Get-Content -Path 'assign_all_roles.sql' -Raw
$connString = "Data Source=192.168.188.29,7869;Initial Catalog=SISTROPI-v2;User ID=sistro;Password=Si`$tr0@Pupuk1!"
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)
try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $sql
    $cmd.ExecuteNonQuery()
    Write-Host "SUCCESS: All roles assigned to user 22A35E15-3138-4CB0-9D2C-F7235BC6BCD9."
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    exit 1
} finally {
    $conn.Close()
}
