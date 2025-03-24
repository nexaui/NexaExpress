// Untuk node-fetch v3 di CommonJS
const fetchPkg = import("node-fetch");

let fetch;
(async () => {
  const pkg = await fetchPkg;
  fetch = pkg.default;
})();

// Helper function to handle response
async function handleResponse(response) {
  // Get the response data
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");

  const data = isJson ? await response.json() : await response.text();

  // Return both the response status and data
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    data: data,
    headers: Object.fromEntries(response.headers.entries()),
  };
}

// Fungsi GET sederhana
async function fetchGet(url, headers = {}) {
  // Tunggu fetch tersedia
  if (!fetch) {
    const pkg = await fetchPkg;
    fetch = pkg.default;
  }

  try {
    console.log(`Making GET request to: ${url}`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });

    // Process the response without throwing an error
    return await handleResponse(response);
  } catch (error) {
    console.error("Fetch error:", error);
    return {
      ok: false,
      status: 500,
      statusText: error.message,
      data: { error: error.message },
      headers: {},
    };
  }
}

// Fungsi POST
async function fetchPost(url, data, headers = {}) {
  try {
    console.log(`Making POST request to: ${url}`);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(data),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Fetch error:", error);
    return {
      ok: false,
      status: 500,
      statusText: error.message,
      data: { error: error.message },
      headers: {},
    };
  }
}

// Fungsi PUT
async function fetchPut(url, data, headers = {}) {
  try {
    console.log(`Making PUT request to: ${url}`);
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(data),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Fetch error:", error);
    return {
      ok: false,
      status: 500,
      statusText: error.message,
      data: { error: error.message },
      headers: {},
    };
  }
}

// Fungsi DELETE
async function fetchDelete(url, headers = {}) {
  try {
    console.log(`Making DELETE request to: ${url}`);
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Fetch error:", error);
    return {
      ok: false,
      status: 500,
      statusText: error.message,
      data: { error: error.message },
      headers: {},
    };
  }
}

// Tambahkan fungsi untuk mendukung binary data download
async function fetchBinary(url, headers = {}) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    const arrayBuffer = await response.arrayBuffer();

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: arrayBuffer,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
    };
  }
}

// Export semua fungsi
module.exports = {
  fetchGet,
  fetchPost,
  fetchPut,
  fetchDelete,
  fetchBinary,
};
