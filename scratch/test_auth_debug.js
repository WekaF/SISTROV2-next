// Test if 401 comes from session token being null/expired vs staging server issue
// Also test a non-existent route to see if it returns 401 or 404

async function test() {
  // Test 1: No token at all
  console.log('\n=== TEST 1: No Authorization Header ===');
  const r1 = await fetch('http://192.168.188.170:8090/api/Home/GetTiketTrendPerHour');
  console.log(`Status: ${r1.status}`, await r1.text());

  // Test 2: Bad token
  console.log('\n=== TEST 2: Bad/Expired Token ===');
  const r2 = await fetch('http://192.168.188.170:8090/api/Home/GetTiketTrendPerHour', {
    headers: { 'Authorization': 'Bearer BADTOKEN' }
  });
  console.log(`Status: ${r2.status}`, await r2.text());

  // Test 3: Non-existent endpoint - what does staging return?
  console.log('\n=== TEST 3: Non-existent endpoint ===');
  const r3 = await fetch('http://192.168.188.170:8090/api/Home/NonExistentEndpoint', {
    headers: { 'Authorization': 'Bearer BADTOKEN' }
  });
  console.log(`Status: ${r3.status}`, await r3.text());

  // Test 4: With fresh valid token
  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('username', 'pi_admin');
  params.append('password', 'adminpi2022');
  params.append('companycode', 'PI');
  const tokenRes = await fetch('http://192.168.188.170:8090/Token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;
  console.log('\n=== TEST 4: Valid token, GetTiketTrendPerHour ===');
  const r4 = await fetch('http://192.168.188.170:8090/api/Home/GetTiketTrendPerHour', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`Status: ${r4.status}`, await r4.text());

  // Test 5: Also check what Antrian/DataTable returns to compare 401 behavior 
  console.log('\n=== TEST 5: Antrian/DataTable with bad token ===');
  const r5 = await fetch('http://192.168.188.170:8090/api/Antrian/DataTable', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer BADTOKEN', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'draw=1&start=0&length=10'
  });
  console.log(`Status: ${r5.status}`, (await r5.text()).substring(0, 100));
}
test();
