const nexa = new NexaUI();
// Menggunakan fetch melalui NexaUI
const fetch = nexa.Fetch();
async function getDataWithApiKey() {
  try {
     const newPost = { title: 'foo', body: 'bar', userId: 1 };
    const data1 = await fetch.post("http://192.168.1.112:8084/nex3/v2/Users", newPost,{
      "API_KEY": `4F8BD-85CB8-E9B95-4D7D3`,
      "API-Secret": `1fa3eef3472682317a6fa5c3f9c112fce19746674bcac0da5c582cd71e78a287`,
   
    });

    console.log("Data dengan API Key:", data1);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Tambahkan event listener ke tombol
document
  .getElementById("fetchDataBtn")
  .addEventListener("click", getDataWithApiKey);
