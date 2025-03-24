// Ubah menjadi ES Module
// Fungsi utilitas untuk melakukan fetch request melalui proxy server dengan fitur tambahan
export const createNexaFetch = () => {
  const nexa = {
    // Cache untuk menyimpan hasil GET requests
    _cache: new Map(),
    _cacheExpiry: new Map(), // Menyimpan waktu kedaluwarsa cache
    _defaultCacheTime: 60000, // 1 menit dalam miliseconds

    // Tambahkan properti untuk prefetch patterns
    _prefetchPatterns: [],

    // Tambahkan properti untuk IndexedDB
    _dbName: "nexaFetchDB",
    _dbVersion: 1,
    _dbStoreName: "responseCache",
    _db: null,

    // Konfigurasi default
    config: {
      enableCache: true,
      retryCount: 2,
      retryDelay: 1000,
      timeout: 30000, // 30 detik timeout
      baseUrl: "",
      defaultHeaders: {},
      logRequests: false,
    },

    // Mengatur konfigurasi
    setConfig: function (newConfig) {
      this.config = { ...this.config, ...newConfig };
      return this;
    },

    // Membersihkan cache
    clearCache: function (urlPattern = null) {
      if (urlPattern) {
        // Hapus cache berdasarkan pattern URL
        for (const [url] of this._cache) {
          if (url.includes(urlPattern)) {
            this._cache.delete(url);
            this._cacheExpiry.delete(url);
          }
        }
      } else {
        // Hapus semua cache
        this._cache.clear();
        this._cacheExpiry.clear();
      }
      return this;
    },

    // Inisialisasi IndexedDB
    _initIndexedDB: async function () {
      if (this._db) return this._db;

      return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
          console.warn(
            "[Nexa Fetch] IndexedDB tidak didukung browser, menggunakan in-memory cache"
          );
          resolve(null);
          return;
        }

        const request = indexedDB.open(this._dbName, this._dbVersion);

        request.onerror = (event) => {
          console.error("[Nexa Fetch] Gagal membuka IndexedDB", event);
          resolve(null);
        };

        request.onsuccess = (event) => {
          this._db = event.target.result;
          resolve(this._db);
        };

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this._dbStoreName)) {
            db.createObjectStore(this._dbStoreName, { keyPath: "url" });
          }

          // Tambah store untuk antrian request offline
          if (!db.objectStoreNames.contains("requestQueue")) {
            db.createObjectStore("requestQueue", {
              keyPath: "id",
              autoIncrement: true,
            });
          }
        };
      });
    },

    // Simpan respons ke IndexedDB
    _saveToIndexedDB: async function (url, data, expiry) {
      const db = await this._initIndexedDB();
      if (!db) return false;

      return new Promise((resolve) => {
        const transaction = db.transaction(this._dbStoreName, "readwrite");
        const store = transaction.objectStore(this._dbStoreName);

        const item = {
          url,
          data,
          expiry,
        };

        const request = store.put(item);

        request.onsuccess = () => resolve(true);
        request.onerror = () => {
          console.warn("[Nexa Fetch] Gagal menyimpan cache ke IndexedDB", url);
          resolve(false);
        };
      });
    },

    // Mendapatkan respons dari IndexedDB
    _getFromIndexedDB: async function (url) {
      const db = await this._initIndexedDB();
      if (!db) return null;

      return new Promise((resolve) => {
        const transaction = db.transaction(this._dbStoreName, "readonly");
        const store = transaction.objectStore(this._dbStoreName);
        const request = store.get(url);

        request.onsuccess = () => {
          const item = request.result;
          if (!item || item.expiry < Date.now()) {
            // Hapus cache kedaluwarsa
            if (item) {
              this._deleteFromIndexedDB(url);
            }
            resolve(null);
          } else {
            resolve(item.data);
          }
        };

        request.onerror = () => {
          console.warn("[Nexa Fetch] Gagal membaca cache dari IndexedDB", url);
          resolve(null);
        };
      });
    },

    // Hapus entri dari IndexedDB
    _deleteFromIndexedDB: async function (url) {
      const db = await this._initIndexedDB();
      if (!db) return;

      const transaction = db.transaction(this._dbStoreName, "readwrite");
      const store = transaction.objectStore(this._dbStoreName);
      store.delete(url);
    },

    // Menambahkan request ke antrian
    _addToRequestQueue: async function (url, options) {
      const db = await this._initIndexedDB();
      if (!db) {
        console.warn(
          "[Nexa Fetch] Tidak dapat menyimpan request ke antrian offline: IndexedDB tidak tersedia"
        );
        return false;
      }

      return new Promise((resolve) => {
        const transaction = db.transaction("requestQueue", "readwrite");
        const store = transaction.objectStore("requestQueue");

        const request = store.add({
          timestamp: Date.now(),
          url,
          options,
        });

        request.onsuccess = () => resolve(true);
        request.onerror = () => {
          console.warn(
            "[Nexa Fetch] Gagal menambahkan request ke antrian offline",
            url
          );
          resolve(false);
        };
      });
    },

    // Memproses antrian request
    _processRequestQueue: async function () {
      const db = await this._initIndexedDB();
      if (!db) return;

      // Dapatkan semua request dalam antrian
      const queuedRequests = await new Promise((resolve) => {
        const transaction = db.transaction("requestQueue", "readonly");
        const store = transaction.objectStore("requestQueue");
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          console.warn("[Nexa Fetch] Gagal membaca antrian request");
          resolve([]);
        };
      });

      if (queuedRequests.length === 0) return;

      console.log(
        `[Nexa Fetch] Memproses ${queuedRequests.length} request tertunda`
      );

      // Proses satu per satu
      for (const item of queuedRequests) {
        try {
          await this.fetch(item.url, item.options);
          // Hapus dari antrian setelah berhasil
          await this._removeFromRequestQueue(item.id);
          console.log(
            `[Nexa Fetch] Berhasil memproses request tertunda: ${item.url}`
          );
        } catch (error) {
          console.warn(
            `[Nexa Fetch] Gagal memproses request tertunda: ${item.url}`,
            error
          );
        }
      }
    },

    // Menghapus item dari antrian request
    _removeFromRequestQueue: async function (id) {
      const db = await this._initIndexedDB();
      if (!db) return;

      return new Promise((resolve) => {
        const transaction = db.transaction("requestQueue", "readwrite");
        const store = transaction.objectStore("requestQueue");
        const request = store.delete(id);

        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    },

    // Tambahkan inisialisasi untuk event listener online
    _initNetworkEventListeners: function () {
      window.addEventListener("online", () => {
        console.log(
          "[Nexa Fetch] Koneksi kembali online. Memproses antrian request."
        );
        this._processRequestQueue();
      });
    },

    // Fungsi untuk mengkompresi data
    _compressData: async function (data) {
      if (!data) return data;

      // Konversi data menjadi string jika belum string
      const jsonString = typeof data === "string" ? data : JSON.stringify(data);

      // Gunakan TextEncoder untuk mendapatkan Uint8Array
      const textEncoder = new TextEncoder();
      const uint8Array = textEncoder.encode(jsonString);

      // Gunakan CompressionStream jika tersedia (modern browsers)
      if (typeof CompressionStream !== "undefined") {
        const cs = new CompressionStream("gzip");
        const writer = cs.writable.getWriter();
        writer.write(uint8Array);
        writer.close();

        // Baca hasil kompresi
        const reader = cs.readable.getReader();
        const chunks = [];

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          chunks.push(value);
        }

        // Gabungkan chunks
        const totalLength = chunks.reduce((acc, val) => acc + val.length, 0);
        const compressedData = new Uint8Array(totalLength);
        let offset = 0;

        for (const chunk of chunks) {
          compressedData.set(chunk, offset);
          offset += chunk.length;
        }

        // Convert to base64 for transmission
        return btoa(String.fromCharCode.apply(null, compressedData));
      } else {
        // Fallback untuk browser yang tidak mendukung CompressionStream
        console.warn(
          "[Nexa Fetch] CompressionStream tidak didukung, mengirim data tanpa kompresi"
        );
        return jsonString;
      }
    },

    // Fungsi untuk mendekompresi data
    _decompressData: async function (data) {
      if (!data) return data;

      // Jika data bukan hasil kompresi, langsung kembalikan
      if (typeof data === "object") return data;

      try {
        // Decode from base64
        const binaryString = atob(data);
        const uint8Array = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
          uint8Array[i] = binaryString.charCodeAt(i);
        }

        // Gunakan DecompressionStream jika tersedia
        if (typeof DecompressionStream !== "undefined") {
          const ds = new DecompressionStream("gzip");
          const writer = ds.writable.getWriter();
          writer.write(uint8Array);
          writer.close();

          // Baca hasil dekompresi
          const reader = ds.readable.getReader();
          const chunks = [];

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            chunks.push(value);
          }

          // Gabungkan chunks
          const totalLength = chunks.reduce((acc, val) => acc + val.length, 0);
          const decompressedData = new Uint8Array(totalLength);
          let offset = 0;

          for (const chunk of chunks) {
            decompressedData.set(chunk, offset);
            offset += chunk.length;
          }

          // Convert kembali ke string dan parse sebagai JSON
          const textDecoder = new TextDecoder();
          const jsonString = textDecoder.decode(decompressedData);
          return JSON.parse(jsonString);
        } else {
          // Fallback untuk browser yang tidak mendukung DecompressionStream
          return JSON.parse(data);
        }
      } catch (error) {
        console.error("[Nexa Fetch] Gagal mendekompresi data:", error);
        return data;
      }
    },

    // Fungsi utama untuk melakukan fetch
    fetch: async function (url, options = {}) {
      const {
        method = "GET",
        body,
        headers = {},
        useCache = this.config.enableCache,
        cacheTime = this._defaultCacheTime,
        retry = this.config.retryCount,
        retryDelay = this.config.retryDelay,
        timeout = this.config.timeout,
        useCompression = false,
      } = options;

      // Tambahkan baseUrl jika ada dan url tidak dimulai dengan http atau https
      const fullUrl =
        this.config.baseUrl && !url.match(/^(http|https):\/\//)
          ? `${this.config.baseUrl}${url}`
          : url;

      // Gabungkan header default dengan header yang diberikan
      const mergedHeaders = { ...this.config.defaultHeaders, ...headers };

      // Cek cache untuk GET requests
      if (method === "GET" && useCache) {
        // Cek memory cache terlebih dahulu
        if (this._cache.has(fullUrl)) {
          const expiry = this._cacheExpiry.get(fullUrl);
          if (expiry > Date.now()) {
            return this._cache.get(fullUrl);
          } else {
            // Cache kedaluwarsa, hapus dari cache
            this._cache.delete(fullUrl);
            this._cacheExpiry.delete(fullUrl);
          }
        }

        // Jika tidak ada di memory cache, cek di IndexedDB
        const cachedData = await this._getFromIndexedDB(fullUrl);
        if (cachedData) {
          // Simpan juga ke memory cache
          this._cache.set(fullUrl, cachedData);
          this._cacheExpiry.set(fullUrl, Date.now() + cacheTime);
          return cachedData;
        }
      }

      // Jika offline dan bukan GET request, antrikan untuk nanti
      if (!this.isOnline() && method !== "GET") {
        await this._addToRequestQueue(fullUrl, {
          method,
          body,
          headers: mergedHeaders,
          useCache,
          cacheTime,
          retry,
          retryDelay,
          timeout,
          useCompression,
        });

        throw new Error(
          "Anda sedang offline. Request telah diantrikan dan akan diproses saat online kembali."
        );
      }

      let attempts = 0;
      let lastError;

      // Retry loop
      while (attempts <= retry) {
        try {
          if (this.config.logRequests) {
            console.log(`[Nexa Fetch] ${method} ${fullUrl}`, body || "");
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          // Siapkan body dengan kompresi jika diperlukan
          let processedBody = body;
          let processedHeaders = { ...mergedHeaders };

          if (useCompression && body) {
            processedBody = await this._compressData(body);
            processedHeaders["Content-Encoding"] = "gzip";
            processedHeaders["X-Nexa-Compressed"] = "true";
          }

          // PERBAIKAN: Jika URL mengacu ke API lokal, gunakan fetch langsung
          // daripada melalui proxy
          let response;

          // Cek apakah ini adalah request ke endpoint API server lokal
          const isLocalApiRequest =
            fullUrl.includes("/api/") &&
            (fullUrl.includes("localhost") || fullUrl.includes("127.0.0.1"));

          if (isLocalApiRequest) {
            // Request langsung ke API lokal tanpa melalui proxy
            response = await fetch(fullUrl, {
              method: method,
              headers: {
                "Content-Type": "application/json",
                ...processedHeaders,
              },
              body:
                typeof processedBody === "string"
                  ? processedBody
                  : JSON.stringify(processedBody),
              signal: controller.signal,
            });
          } else {
            // Gunakan proxy fetch untuk request eksternal
            response = await fetch("/api/fetch-proxy", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                url: fullUrl,
                method: method,
                data: processedBody,
                headers: processedHeaders,
              }),
              signal: controller.signal,
            });
          }

          clearTimeout(timeoutId);

          let result;

          // Jika response langsung (bukan melalui proxy)
          if (isLocalApiRequest) {
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            // Parse JSON response langsung
            result = await response.json();
          } else {
            // Parse hasil dari proxy
            result = await response.json();

            // Check if the response indicates an error
            if (!response.ok) {
              const errorMessage =
                result.error || `HTTP error! Status: ${response.status}`;
              const errorDetails = result.data
                ? `Details: ${
                    typeof result.data === "object"
                      ? JSON.stringify(result.data)
                      : result.data
                  }`
                : "";

              console.warn(
                `[Nexa Fetch] Request failed: ${errorMessage} ${errorDetails}`
              );

              throw new Error(errorMessage);
            }
          }

          // Dekompresi hasil jika perlu
          if (
            result &&
            result.headers &&
            result.headers["x-nexa-compressed"] === "true"
          ) {
            result.data = await this._decompressData(result.data);
          }

          // Simpan hasil ke cache untuk GET requests
          if (method === "GET" && useCache) {
            this._cache.set(fullUrl, result);
            this._cacheExpiry.set(fullUrl, Date.now() + cacheTime);

            // Simpan juga ke IndexedDB
            this._saveToIndexedDB(fullUrl, result, Date.now() + cacheTime);
          }

          if (this.config.logRequests) {
            console.log(
              `[Nexa Fetch] Response for ${method} ${fullUrl}`,
              result
            );
          }

          return result;
        } catch (error) {
          lastError = error;
          attempts++;

          // Jika ini adalah kesalahan timeout atau network error, coba lagi
          if (error.name === "AbortError" || !navigator.onLine) {
            if (attempts <= retry) {
              console.warn(
                `[Nexa Fetch] Request failed, retrying (${attempts}/${retry})...`,
                error
              );
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
              continue;
            }
          } else if (error.message && error.message.includes("Status: 5")) {
            // Retry hanya untuk kesalahan server 5xx
            if (attempts <= retry) {
              console.warn(
                `[Nexa Fetch] Server error, retrying (${attempts}/${retry})...`,
                error
              );
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
              continue;
            }
          } else {
            // Untuk error lain, jangan retry
            break;
          }
        }
      }

      // Semua upaya gagal, log dan lempar error
      console.error(
        `[Nexa Fetch] All fetch attempts failed for ${method} ${fullUrl}`,
        lastError
      );
      throw lastError || new Error("Request failed after multiple attempts");
    },

    // Fungsi singkat untuk GET
    get: function (url, headers = {}, options = {}) {
      return this.fetch(url, { ...options, method: "GET", headers });
    },

    // Fungsi singkat untuk POST
    post: function (url, data, headers = {}, options = {}) {
      return this.fetch(url, {
        ...options,
        method: "POST",
        body: data,
        headers,
      });
    },

    // Fungsi singkat untuk PUT
    put: function (url, data, headers = {}, options = {}) {
      return this.fetch(url, {
        ...options,
        method: "PUT",
        body: data,
        headers,
      });
    },

    // Fungsi singkat untuk DELETE
    delete: function (url, headers = {}, options = {}) {
      return this.fetch(url, { ...options, method: "DELETE", headers });
    },

    // Fungsi untuk mengupload file
    upload: async function (url, formData, progressCallback, headers = {}) {
      // Karena kita menggunakan proxy fetch, progress callback hanya simulasi
      const onProgress = progressCallback || (() => {});
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        if (progress <= 90) {
          onProgress(progress);
        }
        if (progress > 90) {
          clearInterval(interval);
        }
      }, 300);

      try {
        const result = await this.post(url, formData, headers);
        clearInterval(interval);
        onProgress(100);
        return result;
      } catch (error) {
        clearInterval(interval);
        throw error;
      }
    },

    // Memeriksa status online/offline
    isOnline: function () {
      return navigator.onLine;
    },

    // Menambahkan event listener untuk perubahan status online/offline
    onNetworkStatusChange: function (callback) {
      window.addEventListener("online", () => {
        callback(true);
        this._processRequestQueue();
      });
      window.addEventListener("offline", () => callback(false));
      return this;
    },

    // Versi Asinkron untuk pemanggilan batch
    batch: async function (requests) {
      return Promise.all(
        requests.map((req) => {
          const { url, method = "GET", data, headers, options = {} } = req;
          switch (method.toUpperCase()) {
            case "POST":
              return this.post(url, data, headers, options);
            case "PUT":
              return this.put(url, data, headers, options);
            case "DELETE":
              return this.delete(url, headers, options);
            default:
              return this.get(url, headers, options);
          }
        })
      );
    },

    // Menambahkan pola prefetching
    addPrefetchPattern: function (pattern, options = {}) {
      this._prefetchPatterns.push({ pattern, options });
      return this;
    },

    // Mengeksekusi prefetch berdasarkan pola
    executePrefetch: async function () {
      const prefetchPromises = this._prefetchPatterns.map(
        ({ pattern, options }) => {
          return this.get(
            pattern,
            {},
            {
              ...options,
              useCache: true,
              cacheTime: options.cacheTime || 5 * 60 * 1000, // Default 5 menit
            }
          ).catch((err) =>
            console.warn(`[Nexa Fetch] Prefetch gagal untuk ${pattern}`, err)
          );
        }
      );

      return Promise.allSettled(prefetchPromises);
    },

    // Tambahkan fungsi untuk mengunduh file dari URL ke direktori tertentu
    downloadURL: async function (url, targetDir, filename) {
      if (!url) {
        throw new Error("URL diperlukan untuk mengunduh file");
      }

      try {
        if (this.config.logRequests) {
          console.log(`[Nexa Fetch] Downloading file from: ${url}`);
        }

        const response = await fetch("/api/download-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: url,
            targetDir: targetDir,
            filename: filename,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          const errorMessage =
            result.error || `HTTP error! Status: ${response.status}`;
          console.error(`[Nexa Fetch] Download failed: ${errorMessage}`);
          throw new Error(errorMessage);
        }

        if (this.config.logRequests) {
          console.log(
            `[Nexa Fetch] File downloaded successfully to: ${result.path}`
          );
        }

        return result;
      } catch (error) {
        console.error(`[Nexa Fetch] Download error: ${error.message}`);
        throw error;
      }
    },

    // Tambahkan metode baru dalam objek nexa
    downloadAndExtractZip: async function (url, options = {}) {
      const { targetDir, extractDir, deleteZip = false } = options;

      if (!url) {
        throw new Error("URL diperlukan untuk mengunduh file ZIP");
      }

      try {
        if (this.config.logRequests) {
          console.log(
            `[Nexa Fetch] Downloading and extracting ZIP from: ${url}`
          );
        }

        const response = await fetch("/api/download-extract-zip", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: url,
            targetDir: targetDir,
            extractDir: extractDir,
            deleteZip: deleteZip,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          const errorMessage =
            result.error || `HTTP error! Status: ${response.status}`;
          console.error(
            `[Nexa Fetch] ZIP download/extract failed: ${errorMessage}`
          );
          throw new Error(errorMessage);
        }

        if (this.config.logRequests) {
          console.log(
            `[Nexa Fetch] ZIP file successfully downloaded and extracted to: ${result.extractionDir}`
          );
        }

        return result;
      } catch (error) {
        console.error(
          `[Nexa Fetch] ZIP download/extract error: ${error.message}`
        );
        throw error;
      }
    },

    // Tambahkan metode baru untuk clone Git repository
    cloneGitRepo: async function (cloneUrl, options = {}) {
      const { targetDir, branch, depth = 1 } = options;

      if (!cloneUrl) {
        throw new Error("URL Git diperlukan untuk clone repository");
      }

      try {
        if (this.config.logRequests) {
          console.log(`[Nexa Fetch] Cloning Git repository from: ${cloneUrl}`);
        }

        const response = await fetch("/api/git-clone", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cloneUrl: cloneUrl,
            targetDir: targetDir,
            branch: branch,
            depth: depth,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          const errorMessage =
            result.error || `HTTP error! Status: ${response.status}`;
          console.error(`[Nexa Fetch] Git clone failed: ${errorMessage}`);
          throw new Error(errorMessage);
        }

        if (this.config.logRequests) {
          console.log(
            `[Nexa Fetch] Repository successfully cloned to: ${result.repoDir}`
          );
        }

        return result;
      } catch (error) {
        console.error(`[Nexa Fetch] Git clone error: ${error.message}`);
        throw error;
      }
    },

    // Tambahkan metode baru untuk mendapatkan daftar direktori yang diizinkan
    getAllowedDirectories: async function () {
      try {
        const response = await fetch("/api/allowed-directories");
        if (!response.ok) {
          throw new Error("Gagal mendapatkan daftar direktori");
        }
        const data = await response.json();
        return data.directories;
      } catch (error) {
        console.error("[Nexa Fetch] Error getting allowed directories:", error);
        throw error;
      }
    },

    // Metode untuk menambahkan direktori baru yang diizinkan
    addAllowedDirectory: async function (directory) {
      try {
        if (this.config.logRequests) {
          console.log(`[Nexa Fetch] Adding allowed directory: ${directory}`);
        }

        const response = await fetch("/api/allowed-directories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ directory }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Gagal menambahkan direktori");
        }

        return result;
      } catch (error) {
        console.error("[Nexa Fetch] Error adding directory:", error);
        throw error;
      }
    },
  };

  // Bind methods dan return nexa object
  return {
    fetch: nexa.fetch.bind(nexa),
    get: nexa.get.bind(nexa),
    post: nexa.post.bind(nexa),
    put: nexa.put.bind(nexa),
    delete: nexa.delete.bind(nexa),
    batch: nexa.batch.bind(nexa),
    upload: nexa.upload.bind(nexa),
    clearCache: nexa.clearCache.bind(nexa),
    setConfig: nexa.setConfig.bind(nexa),
    isOnline: nexa.isOnline.bind(nexa),
    onNetworkStatusChange: nexa.onNetworkStatusChange.bind(nexa),
    addPrefetchPattern: nexa.addPrefetchPattern.bind(nexa),
    executePrefetch: nexa.executePrefetch.bind(nexa),
    downloadURL: nexa.downloadURL.bind(nexa),
    downloadAndExtractZip: nexa.downloadAndExtractZip.bind(nexa),
    cloneGitRepo: nexa.cloneGitRepo.bind(nexa),
    getAllowedDirectories: nexa.getAllowedDirectories.bind(nexa),
    addAllowedDirectory: nexa.addAllowedDirectory.bind(nexa),
  };
};

// Tambahkan ini untuk browser environment
if (typeof window !== "undefined") {
  window.nexa = window.nexa || createNexaFetch();
}
