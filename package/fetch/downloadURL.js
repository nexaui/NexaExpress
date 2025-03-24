const nexaDom = new NexaUI();

// Menggunakan fetch melalui NexaUI
const nexa = nexaDom.Fetch();
nexa
  .downloadURL("https://example.com/file.pdf")
  .then((result) => {
    console.log("File berhasil diunduh:", result.path);
  })
  .catch((error) => {
    console.error("Download gagal:", error);
  });

// Dengan target direktori
nexa
  .downloadURL("https://example.com/file.pdf", "public/downloads")
  .then((result) => {
    console.log("File berhasil diunduh ke direktori kustom:", result.path);
  });

// Dengan nama file kustom
nexa
  .downloadURL(
    "https://example.com/file.pdf",
    "public/downloads",
    "my-custom-filename.pdf"
  )
  .then((result) => {
    console.log("File berhasil diunduh dengan nama kustom:", result.filename);
  });
// Contoh basic
nexa
  .downloadAndExtractZip("https://example.com/archive.zip")
  .then((result) => {
    console.log("ZIP diekstrak ke:", result.extractionDir);
    console.log("Jumlah file:", result.fileCount);
  })
  .catch((error) => {
    console.error("Gagal:", error);
  });

// Dengan opsi lengkap
nexa
  .downloadAndExtractZip("https://example.com/archive.zip", {
    targetDir: "public/downloads", // Direktori untuk menyimpan file ZIP
    extractDir: "public/extracted", // Direktori untuk ekstraksi
    deleteZip: true, // Hapus file ZIP setelah ekstraksi
  })
  .then((result) => {
    console.log("ZIP berhasil diekstrak");
    console.log("File yang diekstrak:", result.extractedFiles);
  });

