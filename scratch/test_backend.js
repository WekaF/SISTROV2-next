async function test() {
  const url = "https://sistro-dev.pupuk-indonesia.com/api/Company/getCompanyListFitur";
  console.log("Fetching:", url);
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Success! Fetched", data.length, "companies");
  } catch (err) {
    console.error("Fetch failed with error:");
    console.error(err);
  }
}
test();
