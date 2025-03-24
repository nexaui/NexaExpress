const nexaUi = new NexaUI();
const fetch = nexaUi.Fetch();
  try {
    const newPost = { title: 'foo', body: 'bar', userId: 1 };
    const data1 = await fetch.post("http://192.168.1.112:8084/endpoin/v1/users",newPost, {
      API_KEY: `C465D-01217-4CC5B-F486A`,
    });

    console.log("Data dengan API Key:", data1);
  } catch (error) {
    console.error("Error:", error);
  }