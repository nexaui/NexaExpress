const nexa = new NexaUI();

// Menggunakan fetch melalui NexaUI
const fetch = nexa.Fetch();
async function getDataWithApiKey() {
try {
  const result = await nexa
    .Network({
      type: "v5",
      path: "exsampel/index",
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
