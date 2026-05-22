process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function test() {
  const target = "https://sistro-dev.pupuk-indonesia.com";
  const tokenUrl = `${target}/Token`;
  
  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('username', 'pi_admin');
  params.append('password', 'adminpi2022');
  params.append('companycode', 'PI');

  console.log("Fetching token from:", tokenUrl);
  try {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    
    console.log("Token response status:", res.status);
    const data = await res.json();
    if (!res.ok) {
      console.error("Token exchange failed:", data);
      return;
    }
    
    const token = data.access_token;
    console.log("Token successfully acquired! Roles:", data.role);

    const endpoints = [
      '/api/CompanyDashboard/GetStats?companyCode=PKG',
      '/api/CompanyDashboard/GetProdukFilter?companyCode=PKG',
      '/api/CompanyDashboard/GetRealisasiChart?idproduk=all&companyCode=PKG',
    ];

    for (const ep of endpoints) {
      const url = `${target}${ep}`;
      console.log(`\nFetching: ${url}`);
      const r = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log(`[Status: ${r.status}]`);
      const body = await r.text();
      console.log("Response (first 300 chars):", body.substring(0, 300));
    }
  } catch (err) {
    console.error("Fetch test failed with exception:", err);
  }
}
test();
