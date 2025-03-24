const nexa = new NexaUI();

// Menggunakan fetch melalui NexaUI
const fetch = nexa.Fetch();
async function getDataWithApiKey() {
try {
  const result = await nexa
    .Network({
      type: "v4",
         path: "exsampel/index",
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
