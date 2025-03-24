const nexa = new NexaUI();

// Menggunakan fetch melalui NexaUI
const fetch = nexa.Fetch();
async function getDataWithApiKey() {
try {
  const result = await nexa
    .Network({
      type: "v3",
         credensial: "E120C-38795-F0FC0-D6D7C",
         body:{
            name: "Budi",
            email: "budi@contoh.com",
         }
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
