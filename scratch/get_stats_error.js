process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function test() {
  const target = "https://sistro-dev.pupuk-indonesia.com";
  const tokenUrl = `${target}/Token`;
  
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

    const url = `${target}/api/CompanyDashboard/GetStats?companyCode=PKG`;
    console.log(`Fetching: ${url}`);
    const r = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`[Status: ${r.status}]`);
    const body = await r.json();
    console.log("Full JSON error:", JSON.stringify(body, null, 2));
  } catch (err) {
    console.error(err);
  }
}
test();
