# NexaExpress

NexaExpress adalah wrapper Express.js yang powerful dirancang untuk melayani aplikasi HTML modern dengan arsitektur berbasis komponen dan transformasi bawaan. Ini memudahkan proses penyajian konten statis sambil menerapkan transformasi komponen di sisi server.

## Fitur Utama

- **Mesin Transformasi Komponen**: Secara otomatis mengubah komponen kustom menjadi HTML/CSS/JS standar
- **Tag Require**: Mendukung inklusi file HTML dengan sintaks `<div require="path"></div>`
- **Konfigurasi Lingkungan**: Mengekspor variabel lingkungan ke JavaScript sisi klien
- **Rute API**: Endpoint API bawaan untuk transformasi komponen dan utilitas
- **Penyajian File Statis**: Penyajian file statis yang dioptimalkan dengan dukungan middleware
- **Pemrosesan HTML**: Pra-memproses file HTML sebelum disajikan ke klien
- **Dukungan Script Module**: Secara otomatis menambahkan `type="module"` ke tag script sesuai kebutuhan

## Instalasi

```bash
npm install nexa-express
```

## Penggunaan Dasar

```javascript
const NexaExpress = require("nexa-express");

// Buat instance NexaExpress baru dengan konfigurasi
const server = new NexaExpress({
  SERVER_HOST: "http://localhost:3000",
  SERVER_API: "/api",
  WS_HOST: "ws://localhost:3000",
  PATHS: {
    PUBLIC: "public",
    ASSETS: "assets",
    CSS: "assets/css",
    PACKAGE: "package",
  },
});

// Inisialisasi server
server.initialize();

// Dapatkan instance aplikasi Express
const app = server.getApp();

// Mulai server
const httpServer = app.listen(3000, () => {
  console.log("Server berjalan di port 3000");
  server.setServerInstance(httpServer);
});
```

## Konfigurasi

NexaExpress menerima objek konfigurasi dengan properti berikut:

| Properti      | Deskripsi                     | Default      |
| ------------- | ----------------------------- | ------------ |
| SERVER_HOST   | URL host untuk server         | Diperlukan   |
| SERVER_API    | Path dasar untuk endpoint API | Diperlukan   |
| WS_HOST       | URL host WebSocket            | Diperlukan   |
| PATHS.PUBLIC  | Direktori file publik         | "public"     |
| PATHS.ASSETS  | Direktori aset                | "assets"     |
| PATHS.CSS     | Direktori file CSS            | "assets/css" |
| PATHS.PACKAGE | Direktori file paket          | "package"    |

## Struktur Proyek

NexaExpress memerlukan struktur proyek tertentu:

...
