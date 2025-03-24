const nexa = new NexaUI();

// Menggunakan fetch melalui NexaUI
const fetch = nexa.Fetch();
async function getDataWithApiKey() {
  // try {
  //   const data1 = await fetch.get("http://192.168.1.112/v5/exsampel/index");
  //   console.log("Data dengan API Key:", data1);
  // } catch (error) {
  //   console.error("Error:", error);
  // }

try {
  const result = await nexa
    .Network({
      type: "v1",
      credensial: "C465D-01217-4CC5B-F486A",
    }).post("users", {
      name: "Budi",
      email: "budi@contoh.com",
    });
  console.log(result);
} catch (error) {
  console.error("Detail error:", error);
}





  
}

// Tambahkan event listener ke tombol
document
  .getElementById("fetchDataBtn")
  .addEventListener("click", getDataWithApiKey);


