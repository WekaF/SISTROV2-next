const { API_BASE } = require("./src/lib/api-client");

async function test() {
  const res = await fetch("http://192.168.188.170:8090/api/Tiket/DataTiket", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });
  console.log(res.status);
  const text = await res.text();
  console.log(text.substring(0, 500));
}
test();
