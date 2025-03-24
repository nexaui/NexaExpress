import { createNexaFetch } from "./NexaFetch.js";

export class NexaSync {
  #config = {
    key: null,
    secret: null,
    url: null,
    contentType: "application/json", // Default content type
  };
  #nexaFetch = null;

  constructor(config) {
    this.#nexaFetch = createNexaFetch();
    this.setConfig(config);
  }

  setConfig(config) {
    if (typeof config !== "object") {
      throw new Error("Config harus berupa object");
    }

    // Check if URL contains v1 - secret is not required for v1
    const isV1 = config.url?.includes("/v1");

    const requiredFields = ["key", "url"];
    // Add secret as required field only for v2+
    if (!isV1) {
      requiredFields.push("secret");
    }

    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`${field} harus diisi dalam config`);
      }
    }

    this.#config = { ...this.#config, ...config };

    // Configure NexaFetch with base URL
    this.#nexaFetch.setConfig({
      baseUrl: this.#config.url,
      logRequests: false, // Disable logging
    });
  }

  getConfig() {
    return { ...this.#config }; // Return copy of config
  }

  // Method untuk mengubah content type
  setContentType(contentType) {
    const validTypes = [
      "application/json",
      "application/x-www-form-urlencoded",
      "multipart/form-data",
      "text/plain",
    ];

    if (!validTypes.includes(contentType)) {
      throw new Error("Content type tidak valid");
    }

    this.#config.contentType = contentType;
  }

  async get(endpoint) {
    return this.#request(endpoint, "GET");
  }

  async post(endpoint, data) {
    return this.#request(endpoint, "POST", data);
  }

  async put(endpoint, data) {
    return this.#request(endpoint, "PUT", data);
  }

  async delete(endpoint) {
    return this.#request(endpoint, "DELETE");
  }

  async #request(endpoint, method, data = null) {
    if (!this.#config.key || !this.#config.url) {
      throw new Error(
        "Konfigurasi API belum diatur. Gunakan NexaSync.setConfig()"
      );
    }

    try {
      // Create headers with API_KEY and API_SECRET for authentication
      const headers = {
        API_KEY: this.#config.key,
        Accept: "application/json",
        "Content-Type": this.#config.contentType,
      };

      // Add secret to headers if it exists (required for v2+)
      if (this.#config.secret) {
        headers.API_SECRET = this.#config.secret;
      }

      // Ensure clean endpoint
      const cleanEndpoint = endpoint.startsWith("/")
        ? endpoint.slice(1)
        : endpoint;

      // Ensure base URL ends with slash if endpoint doesn't start with one
      const baseUrl = this.#config.url.endsWith("/")
        ? this.#config.url
        : `${this.#config.url}/`;

      // Update NexaFetch baseUrl configuration to ensure proper URL formation
      this.#nexaFetch.setConfig({
        baseUrl: baseUrl,
        logRequests: false, // Disable logging
      });

      // Use NexaFetch methods instead of direct fetch
      let response;
      switch (method) {
        case "GET":
          response = await this.#nexaFetch.get(cleanEndpoint, headers);
          break;
        case "POST":
          response = await this.#nexaFetch.post(cleanEndpoint, data, headers);
          break;
        case "PUT":
          response = await this.#nexaFetch.put(cleanEndpoint, data, headers);
          break;
        case "DELETE":
          response = await this.#nexaFetch.delete(cleanEndpoint, headers);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      return response;
    } catch (error) {
      throw error;
    }
  }
}

// Factory function now returns a new instance
export const createNexaSync = (config) => {
  return new NexaSync(config);
};
