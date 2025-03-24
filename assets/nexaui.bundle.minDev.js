// Use the global NEXA_CONFIG object directly
import { createNexaSync } from "./module/NexaSync.js";
import { createForm } from "./module/NexaForm.js";
import { NexaStorage } from "./module/NexaStorage.js";
import { NexaModal } from "./module/NexaModal.js";
import { NexaScriptName } from "./module/NexaScriptName.js";
import { NexaOauth, NexaLogout } from "./module/NexaOauth.js";
import { NexaFilePreview } from "./module/NexaFilePreview.js";
import { NexaDom } from "./module/NexaDom.js";
import { NexaVars } from "./module/NexaVars.js";
import { NexaEvent } from "./module/NexaEvent.js";
import { NexaClient } from "./module/NexaWebSocket.js";
import { NexaElement } from "./module/utilities/NexaElement.js";
import { NexaKey } from "./module/NexaKey.js";
import { NexaDate } from "./module/NexaDate.js";
import { NexaColor } from "./module/NexaColor.js";
import { NexaPart } from "./module/NexaPart.js";
import { createNexaFetch } from "./module/NexaFetch.js";
import NexaFilter from "./module/NexaFilter.js";
// import NexaFileSystem from "./module/NexaFileSystem.js";

// Flag global untuk mencegah eksekusi script dan logging berulang kali
if (typeof window._nexaLogDisplayed === "undefined") {
  window._nexaLogDisplayed = false;
}
if (typeof window !== "undefined") {
  window.nexa = window.nexa || createNexaFetch();
}

window.NexaUI = NexaUI;

export function NexaUI() {
  return {
    Client: function () {
      return new NexaClient();
    },
    Components: function () {
      return NexaElement();
    },
    Route: function (proces) {
      return NexaRoute(proces);
    },
    NexaPart: function (URL) {
      return new NexaPart(URL);
    },
    NexaColor: function () {
      return new NexaColor();
    },
    Date: function () {
      return NexaDate;
    },
    Network: function (config) {
      if (config.type === "v2") {
        return createNexaSync({
          key: config.credensial,
          secret: config.secret,
          url: `${window.ENV_CONFIG.SERVER_API}/v2`,
        });
      } else if (config.type === "v1") {
        return createNexaSync({
          key: config.credensial,
          url: `${window.ENV_CONFIG.SERVER_API}/v1`,
        });
      } else if (config.type === "v3") {
        try {
          const newPost =
            typeof config.body === "string"
              ? config.body
              : JSON.stringify(config.body || "");
          // Configure headers if they exist
          const headers = config.headers || {
            "Content-Type": "application/json",
          };

          return createNexaFetch().post(
            `${window.ENV_CONFIG.SERVER_API2}/v3/${config.credensial}`,
            newPost,
            headers
          );
        } catch (error) {
          console.error("Error:", error);
        }
      } else if (config.type === "v4") {
        try {
          const newPost =
            typeof config.body === "string"
              ? config.body
              : JSON.stringify(config.body || "");
          // Configure headers if they exist
          const headers = config.headers || {
            "Content-Type": "application/json",
          };

          return createNexaFetch().post(
            `${window.ENV_CONFIG.SERVER_API2}/v4/${config.path}`,
            newPost,
            headers
          );
        } catch (error) {
          console.error("Error:", error);
        }
      } else if (config.type === "v5") {
        try {
          // Configure headers if they exist
          const headers = config.headers || {
            "Content-Type": "application/json",
          };

          return createNexaFetch().get(
            `${window.ENV_CONFIG.SERVER_API2}/v5/${config.path}`,
            headers
          );
        } catch (error) {
          console.error("Error:", error);
        }
      } else if (config.type === "ws") {
        return new NexaClient().Buckets(config);
      } else if (config.type === "fetch") {
        return createNexaFetch();
      } else {
      }
    },
    Storage: function () {
      return new NexaStorage();
    },
    NexaEvent: function () {
      return new NexaEvent();
    },
    FilePreview: function () {
      return new NexaFilePreview();
    },

    Modal: function () {
      return {
        init: function (callback) {
          // Inisialisasi modal saat halaman dimuat
          document.addEventListener("DOMContentLoaded", function () {
            NexaModal(callback);
          });
          return NexaModal(callback);
        },
        open: function (modalId) {
          if (typeof window.nxMdOpen === "function") {
            window.nxMdOpen(modalId);
          }
        },
        close: function (modalId) {
          if (typeof window.nxMdClose === "function") {
            window.nxMdClose(modalId);
          }
        },
        active: function (callback) {
          window.addEventListener("modalactiv", (event) => {
            callback(event);
          });
        },
      };
    },
    Reload: function () {
      // this.Init().routeHandler.refresh();
    },
    Oauth: function () {
      return {
        Signin: function (userData, page) {
          return NexaOauth(userData, page);
        },
        Logout: function (pathname) {
          return NexaLogout(pathname);
        },
        user: async function () {
          const storage = new NexaStorage();
          const indexDB = storage.getIndexDB();
          const result = await indexDB.get("Oauth");
          return result;
        },
      };
    },

    lastEvent: function (callback) {
      window.pageInitFunction = function (context) {
        if (typeof callback === "function") {
          callback(context);
        }
      };
    },
    createForm: function (data, onResponse) {
      return createForm(data, onResponse);
    },
    ScriptKey: function (scriptName) {
      return NexaScriptName(scriptName);
    },

    clientId: function () {
      return getCookie("VID");
    },
    NexaDom: function (row) {
      return new NexaDom(row);
    },
    NexaVars: function (row) {
      return new NexaVars(row);
    },
    NexaKey: function () {
      return new NexaKey();
    },

    findById: function (data, id) {
      if (!Array.isArray(data)) {
        console.log("Data structure:", data);
        return null;
      }
      return data.find((item) => item.id === parseInt(id));
    },
    idPassword: function (row) {
      return idPassword(row);
    },
    Router: function (page) {
      window.location.href = page;
    },
    Navigation: function () {},
    // NexaRouter BATAS MODULE
    Fetch: function () {
      return createNexaFetch();
    },
    Filter: function () {
      return new NexaFilter();
    },
  };
}

if (typeof define === "function" && define.amd) {
  // AMD
  define([], () => NexaUI);
} else if (typeof module === "object" && module.exports) {
  // CommonJS/Node.js
  module.exports = NexaUI;
} else {
  // Browser global
  window.NexaUI = NexaUI;
}

export const filterRow = (data, propertyMap) => {
  return data.map((item) => {
    const newObj = {};
    Object.entries(propertyMap).forEach(([oldKey, newKey]) => {
      if (item.hasOwnProperty(oldKey)) {
        newObj[newKey] = item[oldKey];
      }
    });
    return newObj;
  });
};

export function getCookie(name) {
  const cookies = document.cookie.split("; ");
  for (let cookie of cookies) {
    const [cookieName, cookieValue] = cookie.split("=");
    if (decodeURIComponent(cookieName) === name) {
      return decodeURIComponent(cookieValue);
    }
  }
  return null;
}

export function onCookie(name, value) {
  // Membuat cookie dengan waktu kedaluwarsa sesi
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value
  )}; path=/`;
}
export function idPassword(id) {
  const togglePassword = document.querySelector(
    '[data-action="password-toggle"]'
  );
  const passwordInput = document.getElementById(id);

  togglePassword.addEventListener("click", function () {
    // Toggle tipe input antara "password" dan "text"
    const type =
      passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);
    // Toggle icon mata
    this.classList.toggle("fa-eye");
    this.classList.toggle("fa-eye-slash");
  });
}
// Replace the direct feather.replace() call with a safe initialization
if (typeof feather !== "undefined") {
  feather.replace();
}

export function NexaRoute(atr) {
  const nexaUi = new NexaUI();
  const nexaKey = nexaUi.NexaKey();
  // Tambahkan event listener pada link di halaman awal
  addLinkEventListeners(document);

  // Menambahkan event listener untuk browser back/forward
  window.addEventListener("popstate", (event) => {
    const targetHref = window.location.href || "";
    const currentPath = window.location.pathname;

    // Updated regex to match both /page/ and /list/ patterns
    const match = targetHref.match(/\/(page|list)\/([^/n/]+(?:\/[^n/][^/]*)*)/);
    const routeType = match ? match[1] : ""; // Get whether it's "page" or "list"
    const afterRoute = match ? match[2] : "";

    try {
      const nexaPart = nexaUi.NexaPart(targetHref);
      const saveObject = {
        origin: currentPath,
        pathname: afterRoute,
        routeType: routeType, // Save the route type
        segment: nexaPart.segment(),
      };
      localStorage.setItem("pageState", JSON.stringify(saveObject));
      loadContent(afterRoute, routeType);
    } catch (error) {}
  });

  // Deklarasikan variabel sebelum event listener load
  let isPageRefreshed = false;

  // Di awal file, tambahkan variabel untuk melacak navigasi pertama
  let isFirstNavigation = true;

  // Deteksi URL langsung di address bar saat halaman dimuat
  window.addEventListener("load", () => {
    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;

    // Cek apakah ini adalah hasil dari refresh/direct URL entry
    if (sessionStorage.getItem("pageRefreshed")) {
      const existingData = localStorage.getItem("pageState");

      // Bandingkan URL saat ini dengan URL terakhir yang tersimpan
      if (existingData) {
        try {
          const parsed = JSON.parse(existingData);
          const savedPath = parsed.origin;

          // Tambahkan flag untuk menandai apakah content sudah dimuat
          let contentLoaded = false;

          // Perbaikan perbandingan URL
          if (currentPath !== savedPath) {
            // Proses URL baru
            // Updated regex to match both /page/ and /list/ patterns
            const match = currentPath.match(/\/(page|list)\/(.+)/);
            const routeType = match ? match[1] : ""; // Get whether it's "page" or "list"
            const afterRoute = match ? match[2] : "";

            // Muat konten berdasarkan URL baru
            loadContent(afterRoute, routeType);
            contentLoaded = true;

            // Update data lokasi
            try {
              const nexaPart = nexaUi.NexaPart(currentUrl);
              const saveObject = {
                origin: currentPath,
                pathname: afterRoute,
                routeType: routeType, // Save the route type
                segment: nexaPart.segment(),
              };
              localStorage.setItem("pageState", JSON.stringify(saveObject));
            } catch (error) {}
          } else {
            // Hanya memuat konten dari pathname yang tersimpan jika belum dimuat
            if (!contentLoaded) {
              loadContent(parsed.pathname);
            }
          }
        } catch (error) {}
      } else {
      }

      isPageRefreshed = true;
    } else {
      // Kunjungan pertama atau navigasi normal
      loadContent(atr.index);
      // Simpan URL awal
      try {
        const nexaPart = nexaUi.NexaPart(atr.index);
        const saveObject = {
          origin: atr.index,
          pathname: atr.index,
          segment: nexaPart.segment(),
        };
        localStorage.setItem("pageState", JSON.stringify(saveObject));
      } catch (error) {}

      sessionStorage.setItem("pageRefreshed", "true");
    }
  });

  // Tambahkan array untuk melacak script yang sudah dimuat
  const loadedScripts = [];

  // Fungsi untuk memuat konten dari API
  async function loadContent(url, routeType = "page", updateHistory = true) {
    const contentDiv = document.getElementById(atr.main);
    // Tampilkan loading
    contentDiv.innerHTML = atr.loadingWrapper;

    try {
      // Declare apiUrl outside the if/else blocks so it's accessible in the entire function
      let apiUrl;

      if (url) {
        apiUrl =
          routeType === "list"
            ? `/api/navigate/${url}`
            : `/api/navigate/${url}`;
      } else {
        apiUrl =
          routeType === "list"
            ? `/api/navigate/${atr.index}`
            : `/api/navigate/${atr.index}`;
      }

      // Now apiUrl is accessible here
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // Extract semua script dari dokumen
      const externalScripts = [];
      doc.querySelectorAll("script[src]").forEach((scriptTag) => {
        externalScripts.push({
          src: scriptTag.getAttribute("src"),
          type: scriptTag.getAttribute("type") || "",
        });
        // Hapus script tag dari dokumen
        scriptTag.parentNode.removeChild(scriptTag);
      });

      // Update konten
      let content;
      const mainContent = doc.querySelector("#" + atr.main);
      if (mainContent) {
        content = mainContent.innerHTML;
      } else {
        content = doc.body.innerHTML || html;
      }
      contentDiv.innerHTML = content;
      // Tambahkan event listener untuk link di konten yang baru dimuat
      addLinkEventListeners(contentDiv);
      // Bersihkan konteks sebelum memuat script baru
      const nexaPart = nexaUi.NexaPart(window.location.href);
      window.pageContext = {
        origin: window.location.href,
        pathname: url,
        routeType: routeType, // Save the route type
        loadTimestamp: Date.now(),
        pageId: Math.random().toString(36).substring(2, 12),
        segment: nexaPart.segment(),
      };
      const setNexaPart = nexaPart.segment();

      const rawPart = {
        data: setNexaPart.part,
        extractor: "part",
      };
      nexaKey.Render(rawPart);

      const rawSlug = {
        data: setNexaPart.slug,
        extractor: "slug",
      };
      nexaKey.Render(rawSlug);
      localStorage.setItem("pageState", JSON.stringify(pageContext));
      // Jalankan script inline terlebih dahulu
      executeScripts(contentDiv);

      // Perbarui event listener untuk menangkap ketika semua script selesai dimuat
      window.addEventListener(
        "allScriptsLoaded",
        function onAllScriptsLoaded() {
          // Hapus event listener untuk mencegah panggilan berulang
          window.removeEventListener("allScriptsLoaded", onAllScriptsLoaded);

          // Pastikan semua link di konten yang baru dimuat memiliki event listener
          addLinkEventListeners(contentDiv);

          // Panggil fungsi inisialisasi jika ada
          if (typeof window.pageInitFunction === "function") {
            window.pageInitFunction(window.pageContext);
          }
        },
        { once: true }
      );

      // Muat dan jalankan script eksternal
      if (externalScripts.length > 0) {
        loadExternalScripts(externalScripts);
      } else {
        // Jika tidak ada script eksternal, langsung trigger event
        window.dispatchEvent(new CustomEvent("allScriptsLoaded"));
      }
    } catch (error) {
      // Ganti tampilan error dengan memuat file 404.html
      try {
        // Fetch konten dari 404.html
        fetch(atr.index + "html")
          .then((response) => response.text())
          .then((html) => {
            // Parse HTML dan ambil konten body
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            // Update div konten dengan isi dari 404.html
            contentDiv.innerHTML = doc.body.innerHTML;

            // Tambahkan event listener untuk link di halaman 404
            addLinkEventListeners(contentDiv);
          })
          .catch(() => {
            // Fallback jika gagal memuat 404.html
            contentDiv.innerHTML = `
                  <div>
                    <h3>Error Memuat Halaman</h3>
                    <p>${error.message}</p>
                    <button onclick="window.location.reload()">Coba Lagi</button>
                  </div>
                `;
          });
      } catch (fetchError) {
        // Fallback jika terjadi error saat proses fetch
        contentDiv.innerHTML = `
              <div>
                <h3>Error Memuat Halaman</h3>
                <p>${error.message}</p>
                <button onclick="window.location.reload()">Coba Lagi</button>
              </div>
            `;
      }
    }
  }

  // Fungsi untuk memuat script eksternal yang sudah diperbarui
  function loadExternalScripts(scripts) {
    // Buat cache untuk menyimpan konten script
    window.scriptCache = window.scriptCache || {};

    // Pastikan NexaUI tersedia secara global
    window.NexaUI = NexaUI;
    // Buat fungsi untuk memuat dan menjalankan script secara eksplisit
    const loadAndExecuteScript = async (script) => {
      try {
        // Tambahkan timestamp untuk memaksa browser mengambil versi terbaru
        const scriptUrl =
          script.src +
          (script.src.includes("?") ? "&" : "?") +
          "v=" +
          Date.now();

        // Ambil konten script secara eksplisit dengan fetch
        const response = await fetch(scriptUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch script: ${response.status}`);
        }

        // Dapatkan konten script sebagai text
        const scriptContent = await response.text();

        // Simpan konten script di cache
        window.scriptCache[script.src] = scriptContent;

        // Jalankan script dengan pendekatan evaluasi eksplisit
        if (script.type === "module" || script.src.includes(".js")) {
          // Untuk script module, kita perlu menggunakan dynamic import
          // Buat blob URL dan import-nya
          const blob = new Blob([scriptContent], { type: "text/javascript" });
          const blobURL = URL.createObjectURL(blob);

          try {
            // Coba import sebagai module
            await import(blobURL);
          } catch (importError) {
            // Sebagai fallback, jalankan sebagai script biasa
            evalScript(scriptContent, script.src);
          } finally {
            // Bersihkan blob URL
            URL.revokeObjectURL(blobURL);
          }
        } else {
          // Untuk script non-module, evaluasi langsung
          evalScript(scriptContent, script.src);
        }

        return true;
      } catch (error) {
        return false;
      }
    };

    // Fungsi khusus untuk reinisialisasi pagese.js
    const forceReinitializePageseScript = () => {
      try {
        // Re-create NexaUI instance untuk halaman ini
        const pageNexaUi = new NexaUI();

        // Ekspor ke variabel global khusus untuk halaman ini
        window.pageNexaUi = pageNexaUi;

        // Panggil metode khusus jika ada
        if (typeof window.onPageScriptLoaded === "function") {
          window.onPageScriptLoaded(pageNexaUi);
        }
      } catch (error) {}
    };

    // Jalankan semua script secara berurutan
    const processAllScripts = async () => {
      // Eksekusi script berurutan
      for (const script of scripts) {
        await loadAndExecuteScript(script);
      }

      // Setelah semua script dijalankan, trigger event khusus
      const event = new CustomEvent("allScriptsLoaded");
      window.dispatchEvent(event);
    };

    // Jalankan proses
    processAllScripts();
  }

  // Fungsi baru untuk mengeksekusi ulang script berdasarkan path

  // Fungsi untuk memuat script inline dari konten
  function executeScripts(element) {
    try {
      // Ekspor variabel global untuk diakses oleh script module
      window.NexaUI = window.NexaUI || NexaUI;

      // Cari semua elemen script
      const scripts = element.querySelectorAll("script");

      scripts.forEach((oldScript) => {
        try {
          const newScript = document.createElement("script");

          // Salin semua atribut dari script lama ke script baru
          Array.from(oldScript.attributes).forEach((attr) => {
            newScript.setAttribute(attr.name, attr.value);
          });

          // Salin konten script
          newScript.textContent = oldScript.textContent;

          // Untuk script module, kita perlu perlakuan khusus
          if (oldScript.type === "module") {
            newScript.type = "module";
          }

          // Ganti script lama dengan yang baru untuk menjalankannya
          oldScript.parentNode.replaceChild(newScript, oldScript);
        } catch (err) {}
      });
    } catch (mainErr) {}
  }

  // Tambahkan fungsi baru ini di akhir file
  function addLinkEventListeners(container) {
    const spaLinks = container.querySelectorAll("a");
    spaLinks.forEach((link) => {
      // Hapus event listener lama untuk mencegah duplikasi
      link.removeEventListener("click", handleLinkClick);

      // Tambahkan event listener baru
      link.addEventListener("click", handleLinkClick);
    });
  }

  // Fungsi handler terpisah untuk menangani klik pada link
  function handleLinkClick(event) {
    event.preventDefault();
    const link = event.currentTarget;
    const targetHref = link.getAttribute("href");

    // Check for JavaScript URLs, internal anchors, or external links
    if (
      !targetHref ||
      targetHref.startsWith("javascript:") ||
      targetHref === "#" ||
      targetHref === ""
    ) {
      // For JavaScript URLs or empty hrefs, just execute the default behavior and return
      // This allows javascript:void(0) to work as expected
      if (targetHref && targetHref.startsWith("javascript:")) {
        try {
          eval(targetHref.replace("javascript:", ""));
        } catch (e) {
          console.error("Error executing javascript link:", e);
        }
      }
      return;
    }

    // Periksa apakah ini adalah link eksternal atau anchor internal
    if (targetHref.startsWith("http") || targetHref.startsWith("#")) {
      // Untuk link eksternal atau anchor, biarkan perilaku default browser
      window.location.href = targetHref;
      return;
    }

    const URL = window.location.origin + targetHref;
    history.pushState({ targetHref }, "", URL);

    // Perbaikan regex untuk mencakup lebih banyak pola URL
    let routeType = "";
    let afterRoute = "";

    // Coba beberapa pola yang mungkin
    const pageListMatch = targetHref.match(
      /\/(page|list)\/([^/n/]+(?:\/[^n/][^/]*)*)/
    );
    const directPathMatch = targetHref.match(/^\/([^/]+)\/(.+)/);

    if (pageListMatch) {
      routeType = pageListMatch[1]; // "page" atau "list"
      afterRoute = pageListMatch[2];
    } else if (directPathMatch) {
      routeType = "page"; // default ke "page" jika tidak ada penanda khusus
      afterRoute = directPathMatch[2];
    } else {
      // Jika tidak ada pola yang cocok, gunakan path lengkap
      routeType = "page";
      afterRoute = targetHref.startsWith("/")
        ? targetHref.substring(1)
        : targetHref;
    }
    try {
      const nexaPart = nexaUi.NexaPart(URL);
      const saveObject = {
        origin: targetHref,
        pathname: afterRoute,
        routeType: routeType,
        segment: nexaPart.segment(),
      };
      localStorage.setItem("pageState", JSON.stringify(saveObject));
      loadContent(afterRoute, routeType);
    } catch (error) {
      console.error("Navigation error:", error);
    }
  }

  // Buat observer untuk memantau perubahan DOM dan menerapkan event listener pada link baru
  function setupLinkObserver() {
    // Buat observer konfigurasi
    const config = { childList: true, subtree: true };

    // Buat observer callback
    const callback = function (mutationsList, observer) {
      for (const mutation of mutationsList) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          // Terapkan event listener pada node yang baru ditambahkan
          mutation.addedNodes.forEach((node) => {
            // Periksa apakah node adalah elemen HTML
            if (node.nodeType === 1) {
              // Jika node adalah link, tambahkan event listener
              if (node.tagName === "A") {
                node.removeEventListener("click", handleLinkClick);
                node.addEventListener("click", handleLinkClick);
              }

              // Jika node memiliki child link, tambahkan event listener ke mereka
              const childLinks = node.querySelectorAll("a");
              if (childLinks.length > 0) {
                childLinks.forEach((link) => {
                  link.removeEventListener("click", handleLinkClick);
                  link.addEventListener("click", handleLinkClick);
                });
              }
            }
          });
        }
      }
    };

    // Buat observer instance
    const observer = new MutationObserver(callback);

    // Mulai observasi
    observer.observe(document.body, config);

    return observer;
  }

  // Aktifkan observer ketika dokumen sudah dimuat
  document.addEventListener("DOMContentLoaded", () => {
    setupLinkObserver();
  });
}
