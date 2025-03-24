const nexa = new NexaUI();

// Menggunakan fetch melalui NexaUI
const fetch = nexa.Fetch();
async function getDataWithApiKey() {
try {
  const result = await nexa
    .Network({
      type: "v2",
      credensial: "4F8BD-85CB8-E9B95-4D7D3",
      secret: "1fa3eef3472682317a6fa5c3f9c112fce19746674bcac0da5c582cd71e78a287",
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


