$connString = 'Data Source=192.168.188.29,7869;Initial Catalog=SISTROPI-v2;User ID=sistro;Password=Si$tr0@Pupuk1!'
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT name FROM sys.tables"
$reader = $cmd.ExecuteReader()
Write-Host "--- SYS.TABLES ---"
$count = 0
while ($reader.Read()) {
    Write-Host $reader.GetString(0)
    $count++
}
Write-Host "Total: $count tables"
$conn.Close()
