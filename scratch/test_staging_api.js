// Test all three endpoints on the STAGING server (192.168.188.170:8090)
async function test() {
  const tokenUrl = 'http://192.168.188.170:8090/Token';
  
  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('username', 'pi_admin');
  params.append('password', 'adminpi2022');
  params.append('companycode', 'PI');

  try {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const data = await res.json();
    const token = data.access_token;
    console.log('Token role:', data.role);

    const endpoints = [
      '/api/Home/GetTiketTrendPerPlant',
      '/api/Home/GetTiketTrendPerHour',
      '/api/Home/GetDurasiProsesMuat',
      '/api/Home/MonitorStats',
    ];

    for (const ep of endpoints) {
      const r = await fetch(`http://192.168.188.170:8090${ep}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const text = await r.text();
      console.log(`\n[${r.status}] ${ep}`);
      // Only show first 200 chars
      console.log(text.substring(0, 200));
    }
  } catch (err) {
    console.error(err);
  }
}
test();
