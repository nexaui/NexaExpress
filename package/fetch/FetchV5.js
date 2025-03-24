const nexa = new NexaUI();

// Menggunakan fetch melalui NexaUI
const fetch = nexa.Fetch();
async function getDataWithApiKey() {
  try {
    const data1 = await fetch.get("http://192.168.1.112:8084/nex3/v5/exsampel/index");
    console.log("Data dengan API Key:", data1);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Tambahkan event listener ke tombol
document
  .getElementById("fetchDataBtn")
  .addEventListener("click", getDataWithApiKey);
