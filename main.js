const portfinder = require("portfinder");
const CONFIG = require("./config");
const NexaExpress = require("./assets/NexaExpress");

async function startServer() {
  try {
    const nexaExpress = new NexaExpress(CONFIG);
    nexaExpress.initialize();

    // Gunakan port dari CONFIG langsung, tanpa portfinder
    const port = CONFIG.PORT;

    const serverInstance = nexaExpress.getApp().listen(port, "0.0.0.0", () => {
      console.log(`Server running on port ${port}`);
      console.log(`Server host: ${CONFIG.SERVER_HOST}`);
      console.log(`Server API: ${CONFIG.SERVER_API}`);
      console.log(`WebSocket host: ${CONFIG.WS_HOST}`);
    });

    serverInstance.on("error", (err) => {
      console.error("Server error:", err);
      process.exit(1);
    });

    nexaExpress.setServerInstance(serverInstance);

    // Maneja el cierre adecuado del servidor
    process.on("SIGTERM", () => {
      console.log("SIGTERM received, shutting down gracefully");
      serverInstance.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("SIGINT received, shutting down gracefully");
      serverInstance.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
