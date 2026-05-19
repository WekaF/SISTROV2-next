async function test() {
  const url = 'http://192.168.188.170:8090/Token';
  
  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('username', 'pi_admin');
  params.append('password', 'adminpi2022');
  params.append('companycode', 'PI');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await res.json();
    const token = data.access_token;

    console.log('\n--- Fetching GetTiketTrendPerPlant ---');
    const apiRes = await fetch('http://192.168.188.170:8090/api/Home/GetTiketTrendPerPlant', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status:', apiRes.status, 'Body:', await apiRes.text());

    console.log('\n--- Fetching GetTiketTrendPerHour ---');
    const apiRes2 = await fetch('http://192.168.188.170:8090/api/Home/GetTiketTrendPerHour', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status:', apiRes2.status, 'Body:', await apiRes2.text());

    console.log('\n--- Fetching GetDurasiProsesMuat ---');
    const apiRes3 = await fetch('http://192.168.188.170:8090/api/Home/GetDurasiProsesMuat', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status:', apiRes3.status, 'Body:', await apiRes3.text());

  } catch (error) {
    console.error('Error during test:', error);
  }
}

test();
