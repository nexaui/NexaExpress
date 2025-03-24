const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const fsPromises = require("fs").promises;
const Nexautility = require("./module/transform/Nexautility");
const NexaTextInput = require("./module/transform/NexaTextInput");
const NexaButton = require("./module/transform/NexaButton");
const NexaextractorKey = require("./module/transform/NexaextractorKey");
const NexaModal = require("./module/transform/NexaModal");
const NexaOnclick = require("./module/transform/NexaOnclick");
const NexaFetchUtils = require("./module/transform/NexaFetchUtils");
const { JSDOM } = require("jsdom");

/**
 * Constructor for NexaExpress class
 * Initializes the Express application with configuration settings
 * Sets up middleware and default paths
 * @param {Object} config - Configuration settings for the application
 */
class NexaExpress {
  constructor(config) {
    this.config = config;
    this.app = express();
    this.basePath = process.cwd();
    this.serverInstance = null;

    // Add default paths if not defined in config
    this.config.PATHS = this.config.PATHS || {
      PUBLIC: "public",
      ASSETS: "assets",
      CSS: "assets/css",
      PACKAGE: "package",
    };

    // Initialize middleware
    this.app.use(cors());
    this.app.use(express.json());
  }

  /**
   * Sets up environment configuration
   * Creates and serves an env-config.js file with environment variables
   * This makes environment variables available to client-side JavaScript
   */
  setupEnvConfig() {
    const envConfigPath = path.join(this.basePath, "assets/env-config.js");
    const envConfigContent = `
window.ENV_CONFIG = {
    SERVER_HOST: "${this.config.SERVER_HOST}",
    SERVER_API: "${this.config.SERVER_API}",
    WS_HOST: "${this.config.WS_HOST}"
};
        `;

    if (
      !fs.existsSync(envConfigPath) ||
      fs.readFileSync(envConfigPath, "utf8") !== envConfigContent
    ) {
      fs.writeFileSync(envConfigPath, envConfigContent);
    }

    this.app.get("/assets/env-config.js", (req, res) => {
      res.setHeader("Content-Type", "application/javascript");
      res.sendFile(envConfigPath);
    });
  }

  /**
   * Adds module type to script tags in HTML content
   * Adds type="module" attribute to script tags that don't already have a type attribute
   * @param {string} content - HTML content to process
   * @returns {string} - Processed HTML content with updated script tags
   */
  addModuleTypeToScripts(content) {
    try {
      // Regex yang lebih kuat untuk mendeteksi script tags
      const regex =
        /<script\b(?![^>]*type=(['"])(?:module|text\/javascript|application\/javascript)\1)([^>]*)>/gi;
      const result = content.replace(regex, '<script type="module"$2>');
      console.log(
        `Script tags processed - original length: ${content.length}, new length: ${result.length}`
      );
      return result;
    } catch (error) {
      console.error("Error in addModuleTypeToScripts:", error);
      return content; // Return original content on error
    }
  }

  /**
   * Loads configuration from nexaui.json if available
   * @returns {Object} - Configuration object
   */
  async loadNexaUiConfig() {
    const configPath = path.join(this.basePath, "nexaui.json");
    try {
      if (fs.existsSync(configPath)) {
        const configData = await fsPromises.readFile(configPath, "utf8");
        return JSON.parse(configData);
      }
    } catch (error) {
      console.error("Error loading nexaui.json:", error);
    }
    return null;
  }

  /**
   * Converts assets array from nexaui.json format to required format
   * @param {Array} assetsArray - Array of assets from nexaui.json
   * @returns {Array} - Formatted assets array for HTML injection
   */
  convertAssetsToRequiredFormat(assetsArray) {
    if (!assetsArray || !Array.isArray(assetsArray)) {
      return [];
    }

    return assetsArray
      .map((asset) => {
        if (typeof asset !== "string") return null;

        // Handle module scripts (format: "module|/path/to/script.js")
        if (asset.startsWith("module|")) {
          const src = asset.substring(7); // Remove "module|" prefix
          return {
            type: "script",
            attributes: { type: "module" },
            src,
          };
        }

        // Handle regular scripts and stylesheets
        if (asset.endsWith(".js")) {
          return { type: "script", src: asset };
        } else if (asset.endsWith(".css")) {
          return { type: "link", rel: "stylesheet", href: asset };
        }

        // Default to script if can't determine type
        return { type: "script", src: asset };
      })
      .filter(Boolean); // Remove any null entries
  }

  /**
   * Processes HTML content by adding necessary scripts, stylesheets, and transforming components
   * Adds required assets to head if missing
   * Processes require tags and applies component transformations
   * @param {string} content - HTML content to process
   * @returns {string} - Processed HTML content
   */
  async processHtmlContent(content) {
    // First process any require tags in the content
    content = await this.processRequireTags(content);

    // Add module type to script tags
    content = this.addModuleTypeToScripts(content);

    // Apply all transformations (this includes all server-side transformations)
    content = this.transformComponents(content);

    // Now parse as DOM to add required assets
    let dom;
    let hasDocument = content.includes("</head>");

    if (hasDocument) {
      // Parse content that already has document structure
      dom = new JSDOM(content);
    } else {
      // Create a new document if it only contains fragment content
      dom = new JSDOM(`<!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>${content}</body>
        </html>`);
    }

    const document = dom.window.document;
    const head = document.querySelector("head");

    // Ambil assets dari nexaui.json jika ada
    let requiredAssets = [
      { type: "script", src: "/assets/env-config.js" },
      { type: "script", src: "https://unpkg.com/feather-icons" },
      { type: "link", rel: "stylesheet", href: "/assets/nexaui.min.css" },
      { type: "link", rel: "stylesheet", href: "/assets/dashboard.css" },
      {
        type: "script",
        attributes: { type: "module" },
        src: "/assets/nexaui.bundle.min.js",
      },
    ];

    try {
      const nexaUiConfig = await this.loadNexaUiConfig();
      if (nexaUiConfig && nexaUiConfig.assets) {
        const assetsFromConfig = this.convertAssetsToRequiredFormat(
          nexaUiConfig.assets
        );
        if (assetsFromConfig.length > 0) {
          console.log("Using assets from nexaui.json");
          requiredAssets = assetsFromConfig;
        }

        // Jika ada properti title, terapkan ke dokumen
        if (nexaUiConfig.properti && nexaUiConfig.properti.title) {
          const titleElement =
            document.querySelector("title") || document.createElement("title");
          titleElement.textContent = nexaUiConfig.properti.title;
          if (!document.querySelector("title")) {
            head.appendChild(titleElement);
          }
        }

        // Jika ada favicon, tambahkan
        if (nexaUiConfig.properti && nexaUiConfig.properti.favicon) {
          const favicon =
            document.querySelector('link[rel="icon"]') ||
            document.createElement("link");
          favicon.setAttribute("rel", "icon");
          favicon.setAttribute("href", nexaUiConfig.properti.favicon);
          if (!document.querySelector('link[rel="icon"]')) {
            head.appendChild(favicon);
          }
        }

        // Tambahkan meta description jika ada
        if (nexaUiConfig.properti && nexaUiConfig.properti.description) {
          const metaDesc =
            document.querySelector('meta[name="description"]') ||
            document.createElement("meta");
          metaDesc.setAttribute("name", "description");
          metaDesc.setAttribute("content", nexaUiConfig.properti.description);
          if (!document.querySelector('meta[name="description"]')) {
            head.appendChild(metaDesc);
          }
        }

        // Tambahkan meta version jika ada
        if (nexaUiConfig.properti && nexaUiConfig.properti.version) {
          const metaVersion =
            document.querySelector('meta[name="version"]') ||
            document.createElement("meta");
          metaVersion.setAttribute("name", "version");
          metaVersion.setAttribute("content", nexaUiConfig.properti.version);
          if (!document.querySelector('meta[name="version"]')) {
            head.appendChild(metaVersion);
          }
        }

        // Tambahkan meta sitename jika ada
        if (nexaUiConfig.properti && nexaUiConfig.properti.sitename) {
          const metaSitename =
            document.querySelector('meta[name="application-name"]') ||
            document.createElement("meta");
          metaSitename.setAttribute("name", "application-name");
          metaSitename.setAttribute("content", nexaUiConfig.properti.sitename);
          if (!document.querySelector('meta[name="application-name"]')) {
            head.appendChild(metaSitename);
          }
        }

        // Tambahkan icon (untuk PWA/mobile) jika berbeda dari favicon
        if (nexaUiConfig.properti && nexaUiConfig.properti.icon) {
          // Apple touch icon
          const appleTouchIcon =
            document.querySelector('link[rel="apple-touch-icon"]') ||
            document.createElement("link");
          appleTouchIcon.setAttribute("rel", "apple-touch-icon");
          appleTouchIcon.setAttribute("href", nexaUiConfig.properti.icon);
          if (!document.querySelector('link[rel="apple-touch-icon"]')) {
            head.appendChild(appleTouchIcon);
          }

          // PWA manifest jika tidak ada
          // if (!document.querySelector('link[rel="manifest"]')) {
          //   const manifest = document.createElement("link");
          //   manifest.setAttribute("rel", "manifest");
          //   manifest.setAttribute("href", "/manifest.json");
          //   head.appendChild(manifest);
          // }
        }
      }
    } catch (error) {
      console.error("Error processing nexaui.json:", error);
    }

    // Tambahkan elemen-elemen yang diperlukan ke head
    requiredAssets.forEach((asset) => {
      // Cek apakah elemen sudah ada untuk menghindari duplikasi
      let selector;
      if (asset.type === "script") {
        selector = `script[src="${asset.src}"]`;
      } else if (asset.type === "link") {
        selector = `link[href="${asset.href}"]`;
      }

      const exists = head.querySelector(selector);
      if (!exists) {
        const element = document.createElement(asset.type);

        // Set atribut berdasarkan tipe elemen
        Object.keys(asset).forEach((key) => {
          if (key !== "type" && key !== "attributes") {
            element.setAttribute(key, asset[key]);
          }
        });

        // Apply additional attributes if present
        if (asset.attributes) {
          Object.keys(asset.attributes).forEach((key) => {
            element.setAttribute(key, asset.attributes[key]);
          });
        }

        head.appendChild(element);
      }
    });

    // Get modified HTML
    let transformedContent = dom.serialize();

    // Format the entire HTML document for better source viewing
    transformedContent = this.formatHtmlDocument(transformedContent);

    // Return the fully processed HTML content
    return transformedContent;
  }

  /**
   * Processes require tags in HTML content
   * Replaces <div require="path"></div> tags with the content of the referenced file
   * @param {string} content - HTML content to process
   * @returns {string} - Processed HTML content with require tags replaced
   */
  async processRequireTags(content) {
    // Gunakan regex yang lebih sederhana dan pasti berhasil
    const requireRegex =
      /<div\s+require=["']([^"']+)["'][^>]*>(?:.*?)<\/div>/gs;

    let result = content;
    let match;
    let requireCount = 0;

    console.log("Starting require tag processing");

    // Clone content untuk pemrosesan
    const originalContent = content;

    try {
      while ((match = requireRegex.exec(originalContent)) !== null) {
        requireCount++;
        const fullMatch = match[0];
        const requiredPath = match[1];
        console.log(`Found require tag #${requireCount}: ${requiredPath}`);

        const fullPath = requiredPath.endsWith(".html")
          ? requiredPath
          : `${requiredPath}.html`;

        const requiredFilePath = path.join(
          this.basePath,
          this.config.PATHS.PUBLIC,
          fullPath
        );

        console.log(`Looking for file: ${requiredFilePath}`);

        try {
          if (!fs.existsSync(requiredFilePath)) {
            console.error(`Required file not found: ${requiredFilePath}`);
            result = result.replace(
              fullMatch,
              `<!-- Failed to load ${fullPath} - File not found -->`
            );
            continue;
          }

          const requiredContent = await fsPromises.readFile(
            requiredFilePath,
            "utf8"
          );

          console.log(
            `Successfully loaded file, length: ${requiredContent.length}`
          );

          // Ganti seluruh tag div yang memiliki atribut require
          result = result.replace(fullMatch, requiredContent);
          console.log(`Replaced require tag #${requireCount}`);
        } catch (error) {
          console.error(`Error processing require file: ${fullPath}`, error);
          result = result.replace(
            fullMatch,
            `<!-- Failed to load ${fullPath} - Error: ${error.message} -->`
          );
        }
      }

      console.log(`Processed ${requireCount} require tags`);

      // Jika tidak ada perubahan dan tidak ada require tags yang ditemukan
      if (requireCount === 0) {
        console.log("No require tags found in content");
      }

      return result;
    } catch (error) {
      console.error("Fatal error in processRequireTags:", error);
      return content; // return original content on fatal error
    }
  }

  /**
   * Transforms components in HTML content
   * Applies various component transformations (NexaextractorKey, NexaOnclick, NexaModal, etc.)
   * @param {string} content - HTML content to process
   * @returns {string} - Processed HTML content with transformed components
   */
  transformComponents(content) {
    try {
      // Apply NexaextractorKey transformations first
      let transformedContent = NexaextractorKey.processAll(content);

      // Apply all specific extractor transformations
      transformedContent = NexaextractorKey.processNexaVars(transformedContent);
      transformedContent = NexaextractorKey.processNexaDom(transformedContent);
      transformedContent =
        NexaextractorKey.processExtractor(transformedContent);

      // Create NexaOnclick instance
      const onclickTransformer = new NexaOnclick();

      // Create a simple getVar function (can be enhanced later)
      const getVar = (varName) => {
        // This is a placeholder implementation
        // You can expand this to get variables from a context or config
        const variables = {};
        return variables[varName];
      };

      // Apply NexaOnclick transformation
      transformedContent = onclickTransformer.transform(
        transformedContent,
        getVar
      );

      // Explicitly apply Modal transformation
      transformedContent = NexaModal.transform(transformedContent);

      // Apply Nexautility transformation
      transformedContent = Nexautility.transform(transformedContent);

      // Apply remaining component transformations using both transform and transformServer methods
      const components = [NexaTextInput, NexaButton, NexaModal];

      // First apply standard transform methods
      transformedContent = components.reduce(
        (result, component) => component.transform(result),
        transformedContent
      );

      // Then attempt to apply transformServer methods for compatible components
      // This simulates what happens in API routes but during direct file access
      transformedContent = this.applyServerTransformations(
        transformedContent,
        components
      );

      return transformedContent;
    } catch (error) {
      console.error("Error in transformComponents:", error);
      return content; // Return original content on error
    }
  }

  /**
   * Applies server-side transformations for components that support it
   * @param {string} content - HTML content to process
   * @param {Array} components - Array of components to apply transformations
   * @returns {string} - Processed HTML content
   */
  applyServerTransformations(content, components) {
    let result = content;
    try {
      // Extract all component attributes for server transforms
      const dom = new JSDOM(content);
      const document = dom.window.document;

      // Process each component type that might have server transforms
      components.forEach((component) => {
        if (typeof component.transformServer === "function") {
          const selector = component.selector || component.getSelector?.();
          if (selector) {
            const elements = document.querySelectorAll(selector);
            elements.forEach((element) => {
              const attributes = {};
              Array.from(element.attributes).forEach((attr) => {
                attributes[attr.name] = attr.value;
              });

              // Apply server transform if possible
              try {
                const transformedHTML = component.transformServer(attributes);
                if (transformedHTML && typeof transformedHTML === "string") {
                  // Replace the element with the transformed HTML
                  const tempDiv = document.createElement("div");
                  tempDiv.innerHTML = transformedHTML;

                  // Insert all children of tempDiv before the original element
                  while (tempDiv.firstChild) {
                    element.parentNode.insertBefore(
                      tempDiv.firstChild,
                      element
                    );
                  }
                  // Remove the original element
                  element.parentNode.removeChild(element);
                }
              } catch (transformError) {
                console.error(
                  `Error applying server transform for component:`,
                  transformError
                );
              }
            });
          }
        }
      });

      result = dom.serialize();
    } catch (error) {
      console.error("Error in applyServerTransformations:", error);
    }
    return result;
  }

  /**
   * Sets up static routes for serving static files
   * Configures Express to serve files from public, assets, package, and CSS directories
   */
  setupStaticRoutes() {
    // Create middleware to intercept HTML files from public directory
    const publicMiddleware = express.static(
      path.join(this.basePath, this.config.PATHS.PUBLIC),
      {
        // Set up static middleware to NOT serve HTML files
        setHeaders: (res, filePath) => {
          if (filePath.endsWith(".html")) {
            // This tells Express not to serve HTML files from static middleware
            res.set("Content-Type", "text/plain");
            res.status(404); // Will be intercepted by our HTML middleware
          }
        },
      }
    );

    // Use the customized static middleware
    this.app.use(publicMiddleware);

    // Regular static middleware for other asset directories
    this.app.use(
      "/assets",
      express.static(path.join(this.basePath, this.config.PATHS.ASSETS))
    );
    this.app.use(
      "/package",
      express.static(path.join(this.basePath, this.config.PATHS.PACKAGE))
    );
    this.app.use(
      "/assets/css",
      express.static(path.join(this.basePath, this.config.PATHS.CSS))
    );
  }

  /**
   * Creates a request handler for component transformation API endpoints
   * @param {Object} component - Component with a transformServer method
   * @returns {Function} - Express request handler for the component transformation
   */
  handleComponentTransform(component) {
    return (req, res) => {
      try {
        const { attributes } = req.body;
        if (!attributes || !Array.isArray(attributes)) {
          return res.status(400).json({ error: "Invalid attributes format" });
        }
        const results = attributes.map((item) =>
          component.transformServer(item.attributes)
        );
        res.json({ results });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    };
  }

  /**
   * Sets up API routes for various component transformations and utility functions
   * Includes endpoints for transforming text inputs, buttons, modals, and more
   * Also includes debug endpoints for testing transformations
   */
  setupApiRoutes() {
    this.app.post("/api/transform", (req, res) => {
      try {
        const { content } = req.body;
        if (!content)
          return res.status(400).json({ error: "Content is required" });
        const transformed = Nexautility.transform(content);
        res.json({ result: transformed });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get("/api/utilities", (req, res) => {
      res.json({
        utilities: Nexautility.utilities,
        customColors: Nexautility.customColors,
      });
    });

    this.app.post(
      "/api/textinput/transform",
      this.handleComponentTransform(NexaTextInput)
    );
    this.app.post(
      "/api/button/transform",
      this.handleComponentTransform(NexaButton)
    );

    this.app.get("/api/navigate/:url(*)", async (req, res) => {
      try {
        let targetUrl = req.params.url;
        if (!targetUrl)
          return res.status(400).json({ error: "URL is required" });

        // Hapus bagian protokol dan domain jika ada
        if (
          targetUrl.startsWith("http://") ||
          targetUrl.startsWith("https://")
        ) {
          const urlObj = new URL(targetUrl);
          targetUrl = urlObj.pathname.substring(1); // Hilangkan slash awal
        }

        // Jika masih ada slash awal, hapus
        if (targetUrl.startsWith("/")) {
          targetUrl = targetUrl.substring(1);
        }

        console.log(`Original targetUrl: ${targetUrl}`);

        // Deteksi pola untuk path segments dengan regex (tanpa userDev)
        // Regex ini akan mencocokkan URL yang mengandung /page/, /list/, atau /n/
        const regex = /^(.+?)(?:\/page\/|\/list\/|\/n\/).*$/;
        const match = targetUrl.match(regex);

        if (match) {
          targetUrl = match[1]; // Ambil grup yang cocok
          console.log(`Regex matched! New targetUrl: ${targetUrl}`);
        } else {
          // Check each segment pattern
          const segments = ["/page/", "/list/", "/n/"];
          for (const segment of segments) {
            if (targetUrl.includes(segment)) {
              const original = targetUrl;
              targetUrl = targetUrl.split(segment)[0];
              console.log(
                `URL contains '${segment}' segment - changed from ${original} to: ${targetUrl}`
              );
              break;
            }
          }
        }

        let htmlPath = targetUrl;
        if (targetUrl.endsWith("/")) htmlPath += "index.html";
        if (!htmlPath.endsWith(".html")) htmlPath += ".html";

        const filePath = path.join(
          this.basePath,
          this.config.PATHS.PUBLIC,
          htmlPath
        );

        console.log(`Looking for file at: ${filePath}`);

        if (!fs.existsSync(filePath)) {
          return res.status(404).json({
            error: "Page not found",
            requestedPath: htmlPath,
            fullPath: filePath,
          });
        }

        // Baca konten file HTML
        let content = await fsPromises.readFile(filePath, "utf8");

        // Proses require tags terlebih dahulu
        content = await this.processRequireTags(content);

        // Apply module type to script tags
        content = this.addModuleTypeToScripts(content);

        // Kemudian terapkan transformasi komponen
        const transformedContent = this.transformComponents(content);

        res.send(transformedContent);
      } catch (error) {
        console.error("Navigation error:", error);
        res
          .status(500)
          .json({ error: "Navigation failed", details: error.message });
      }
    });

    this.app.post("/api/extractor/transform", (req, res) => {
      try {
        const { content } = req.body;
        if (!content)
          return res.status(400).json({ error: "Content is required" });

        const transformed = NexaextractorKey.processAll(content);
        res.json({ result: transformed });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Individual transformation endpoints
    this.app.post("/api/extractor/nexavars", (req, res) => {
      try {
        const { content } = req.body;
        if (!content)
          return res.status(400).json({ error: "Content is required" });

        const transformed = NexaextractorKey.processNexaVars(content);
        res.json({ result: transformed });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post("/api/extractor/nexadom", (req, res) => {
      try {
        const { content } = req.body;
        if (!content)
          return res.status(400).json({ error: "Content is required" });

        const transformed = NexaextractorKey.processNexaDom(content);
        res.json({ result: transformed });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post("/api/extractor/process", (req, res) => {
      try {
        const { content } = req.body;
        if (!content)
          return res.status(400).json({ error: "Content is required" });

        const transformed = NexaextractorKey.processExtractor(content);
        res.json({ result: transformed });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post(
      "/api/modal/transform",
      this.handleComponentTransform(NexaModal)
    );

    this.app.post("/api/onclick/transform", (req, res) => {
      try {
        const { content, variables } = req.body;
        if (!content)
          return res.status(400).json({ error: "Content is required" });

        const onclickTransformer = new NexaOnclick();

        // Create a getVar function that uses provided variables or falls back to empty object
        const getVar = (varName) => {
          const vars = variables || {};
          return vars[varName];
        };

        const transformed = onclickTransformer.transform(content, getVar);
        res.json({ result: transformed });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Debug endpoint for modal transformation
    this.app.post("/api/modal/debug", (req, res) => {
      try {
        const { content } = req.body;
        if (!content)
          return res.status(400).json({ error: "Content is required" });

        // Original content
        const original = content;

        // Transformed content
        const transformed = NexaModal.transform(content);

        // Return both for comparison
        res.json({
          original: original,
          transformed: transformed,
          changed: original !== transformed,
        });
      } catch (error) {
        res.status(500).json({
          error: error.message,
          stack: error.stack,
        });
      }
    });

    // Debug endpoint untuk require tag
    this.app.post("/api/require/debug", async (req, res) => {
      try {
        const { content } = req.body;
        if (!content)
          return res.status(400).json({ error: "Content is required" });

        // Original content
        const original = content;

        // Transformed content
        const transformed = await this.processRequireTags(content);

        // Return both for comparison
        res.json({
          original: original,
          transformed: transformed,
          changed: original !== transformed,
          matches: this.findRequireTags(content),
        });
      } catch (error) {
        res.status(500).json({
          error: error.message,
          stack: error.stack,
        });
      }
    });

    // API untuk memeriksa keberadaan file
    this.app.get("/api/file/check/:path(*)", async (req, res) => {
      try {
        const requestedPath = req.params.path;
        if (!requestedPath) {
          return res.status(400).json({ error: "Path is required" });
        }

        const fullPath = path.join(
          this.basePath,
          this.config.PATHS.PUBLIC,
          requestedPath
        );

        if (fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          const content = await fsPromises.readFile(fullPath, "utf8");
          const firstBytes = content.substring(0, 500); // hanya ambil 500 karakter pertama

          res.json({
            exists: true,
            size: stats.size,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            preview: firstBytes,
            fullPath,
          });
        } else {
          res.json({
            exists: false,
            fullPath,
          });
        }
      } catch (error) {
        res.status(500).json({
          error: "File check failed",
          details: error.message,
        });
      }
    });

    // Debug endpoint untuk script module transformation
    this.app.post("/api/scripts/debug", (req, res) => {
      try {
        const { content } = req.body;
        if (!content)
          return res.status(400).json({ error: "Content is required" });

        // Original content
        const original = content;

        // Transformed content
        const transformed = this.addModuleTypeToScripts(content);

        // Find all script tags in original and transformed
        const findScriptTags = (html) => {
          const regex = /<script\b[^>]*>/gi;
          const matches = [];
          let match;
          while ((match = regex.exec(html)) !== null) {
            matches.push(match[0]);
          }
          return matches;
        };

        // Return both for comparison
        res.json({
          original: original,
          transformed: transformed,
          changed: original !== transformed,
          originalScripts: findScriptTags(original),
          transformedScripts: findScriptTags(transformed),
        });
      } catch (error) {
        res.status(500).json({
          error: error.message,
          stack: error.stack,
        });
      }
    });

    // Add a debug route to check if direct HTML serving is working
    this.app.get("/api/test-html-processing", (req, res) => {
      res.json({
        status: "HTML processing middleware is active",
        time: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      });
    });

    // Agregar endpoint proxy para NexaFetchUtils
    this.app.post("/api/fetch-proxy", async (req, res) => {
      try {
        const { url, method, data, headers } = req.body;

        if (!url) {
          return res.status(400).json({ error: "URL diperlukan" });
        }

        console.log(`Proxy request: ${method} ${url}`);

        let result;
        switch (method?.toUpperCase() || "GET") {
          case "POST":
            result = await NexaFetchUtils.fetchPost(url, data, headers);
            break;
          case "PUT":
            result = await NexaFetchUtils.fetchPut(url, data, headers);
            break;
          case "DELETE":
            result = await NexaFetchUtils.fetchDelete(url, headers);
            break;
          default: // GET
            result = await NexaFetchUtils.fetchGet(url, headers);
        }

        // Forward the status code from the original request
        if (!result.ok) {
          console.log(
            `Proxy request failed: ${method} ${url} - Status: ${result.status}`
          );
          return res.status(result.status).json({
            ok: false,
            error: result.statusText || "Request failed",
            data: result.data,
            headers: result.headers,
          });
        }

        console.log(`Proxy request successful: ${method} ${url}`);
        res.json(result);
      } catch (error) {
        console.error(`Proxy request error: ${error.message}`);
        res.status(500).json({ error: error.message });
      }
    });
  }

  /**
   * Finds all require tags in HTML content
   * @param {string} content - HTML content to search
   * @returns {Array} - Array of objects with full tag and path properties
   */
  findRequireTags(content) {
    const requireRegex =
      /<div[^>]*?require=["']([^"']+)["'][^>]*?>.*?<\/div>/gs;
    const matches = [];
    let match;

    while ((match = requireRegex.exec(content)) !== null) {
      matches.push({
        full: match[0],
        path: match[1],
      });
    }

    return matches;
  }

  /**
   * Sets up a 404 handler for the application
   * Serves a custom 404.html page if available, otherwise sends a simple text response
   */
  setup404Handler() {
    this.app.use((req, res) => {
      const notFoundPath = path.join(
        this.basePath,
        this.config.PATHS.PUBLIC,
        "404.html"
      );
      if (fs.existsSync(notFoundPath)) {
        res.status(404).sendFile(notFoundPath);
      } else {
        res.status(404).send("Page not found");
      }
    });
  }

  /**
   * Creates required directories for the application
   * Ensures that public, assets, CSS, and package directories exist
   */
  createRequiredDirectories() {
    const dirs = [
      path.join(this.basePath, this.config.PATHS.PUBLIC),
      path.join(this.basePath, this.config.PATHS.ASSETS),
      path.join(this.basePath, this.config.PATHS.CSS),
      path.join(this.basePath, this.config.PATHS.PACKAGE),
    ];

    dirs.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Sets up HTML middleware to process HTML files before serving
   * Intercepts requests for HTML files, processes them, and sends the transformed content
   */
  setupHtmlMiddleware() {
    this.app.use(async (req, res, next) => {
      try {
        // Skip if already handled or is an API request
        if (req.path.startsWith("/api/")) {
          return next();
        }

        // Determine if this is an HTML request
        let htmlPath = req.path;

        // Check if this is likely an HTML request
        const isHtmlRequest =
          htmlPath.endsWith(".html") ||
          htmlPath.endsWith("/") ||
          !htmlPath.includes(".");

        if (!isHtmlRequest) {
          return next();
        }

        // Process path segments
        if (htmlPath.includes("/page/")) {
          htmlPath = htmlPath.split("/page/")[0];
          console.log(`Detected /page/ segment - Processing only: ${htmlPath}`);
        } else if (htmlPath.includes("/list/")) {
          htmlPath = htmlPath.split("/list/")[0];
          console.log(`Detected /list/ segment - Processing only: ${htmlPath}`);
        }

        // Fix path formatting
        if (htmlPath.endsWith("/")) htmlPath += "index.html";
        if (!htmlPath.endsWith(".html")) htmlPath += ".html";

        // Ensure we remove leading slash for path joining
        const relativePath = htmlPath.startsWith("/")
          ? htmlPath.substring(1)
          : htmlPath;

        const filePath = path.join(
          this.basePath,
          this.config.PATHS.PUBLIC,
          relativePath
        );

        console.log(`Looking for HTML file at: ${filePath}`);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          console.error(`File not found: ${filePath}`);
          return next(); // Continue to next middleware
        }

        // Read and process the file
        console.log(`Processing HTML file: ${filePath}`);
        const content = await fsPromises.readFile(filePath, "utf8");

        // Process HTML content - this applies all transformations
        const processedContent = await this.processHtmlContent(content);

        // Log sizes for debugging
        console.log(
          `Original size: ${content.length}, Processed size: ${processedContent.length}`
        );

        // Send the processed content
        res.setHeader("Content-Type", "text/html");
        res.send(processedContent);
      } catch (error) {
        console.error("HTML middleware error:", error, error.stack);
        next();
      }
    });
  }

  /**
   * Returns the Express application instance
   * @returns {Object} - Express application instance
   */
  getApp() {
    return this.app;
  }

  /**
   * Returns the server instance
   * @returns {Object} - Server instance
   */
  getServerInstance() {
    return this.serverInstance;
  }

  /**
   * Sets the server instance
   * @param {Object} server - Server instance to set
   */
  setServerInstance(server) {
    this.serverInstance = server;
  }

  /**
   * Initializes the NexaExpress application
   * Creates required directories, sets up environment config, routes, and middleware
   */
  initialize() {
    this.createRequiredDirectories();

    // Buat default placeholder image jika belum ada
    const assetsPath = path.join(this.basePath, this.config.PATHS.ASSETS);
    const defaultPlaceholderPath = path.join(
      assetsPath,
      "default-placeholder.png"
    );
    if (!fs.existsSync(defaultPlaceholderPath)) {
      // Buat placeholder image sederhana menggunakan data URI
      const placeholderData = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAADsQAAA7EB9YPtSQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAEqSURBVHic7dy9DcIwGEbhY5eWmj0YgB2YgZ4ZGIGeGdiBARiAli0oKKKg+LGR7XtOeaV8ei0nkRsGAAAAAAAAAAAAAAAAgO/ZtW1/6Zzz0XtP3rJtW+89pZQcQjh576m1fLwXwIcIwBwBmCMAcwRgjgDMEYA5AjBHAOYIwBwBmCMAcwRgjgDMEYA5AjBHAOYIwBwBmCMAcwRgjgDMEYA5AjBHAOYIwBwBmCMAcwRgjgDMEYA5AgAAAAAAAAAAAAAAAIA36Q2jGB4wYEYAAAAASUVORK5CYII=",
        "base64"
      );
      fs.writeFileSync(defaultPlaceholderPath, placeholderData);
      console.log(
        "Default placeholder image created at:",
        defaultPlaceholderPath
      );
    }

    this.setupEnvConfig();

    // IMPORTANT: First set up HTML middleware before static routes
    this.setupHtmlMiddleware();

    // Then set up static routes
    this.setupStaticRoutes();

    this.setupApiRoutes();
    this.setup404Handler();
  }

  /**
   * Format head section for better readability
   * @param {string} content - HTML content to format
   * @returns {string} - Formatted HTML content
   */
  formatHeadSection(content) {
    // Format elemen head untuk meningkatkan keterbacaan
    const headRegex = /(<head[^>]*>)([\s\S]*?)(<\/head>)/i;
    return content.replace(
      headRegex,
      (match, startTag, headContent, endTag) => {
        // Pisahkan semua elemen dalam head
        let formattedContent = headContent
          // Tambahkan line break setelah setiap tag penutup
          .replace(/(<\/(?:meta|title|link|script|style)>)(?!\n)/gi, "$1\n    ")
          // Tambahkan line break sebelum setiap tag pembuka (kecuali pertama)
          .replace(
            /(?<!^)(<(?:meta|title|link|script|style)[^>]*>(?:[^<]*<\/(?:title|script|style)>)?)/gi,
            "\n    $1"
          );

        // Kelompokkan tag berdasarkan jenisnya
        const metaTags = [];
        const linkTags = [];
        const styleTags = [];
        const scriptTags = [];
        const otherTags = [];

        // Ekstrak semua tag dalam head
        const tags =
          formattedContent.match(
            /<(?:meta|title|link|script|style)[^>]*>(?:[^<]*<\/(?:title|script|style)>)?/gi
          ) || [];

        // Sortir tag berdasarkan jenisnya
        tags.forEach((tag) => {
          if (tag.startsWith("<meta")) {
            metaTags.push(tag);
          } else if (tag.startsWith("<link")) {
            linkTags.push(tag);
          } else if (tag.startsWith("<style")) {
            styleTags.push(tag);
          } else if (tag.startsWith("<script")) {
            scriptTags.push(tag);
          } else {
            otherTags.push(tag);
          }
        });

        // Susun kembali dengan urutan yang terorganisir dan spasi
        formattedContent =
          "\n    " +
          otherTags.join("\n    ") +
          (otherTags.length ? "\n    " : "") +
          metaTags.join("\n    ") +
          (metaTags.length ? "\n    " : "") +
          linkTags.join("\n    ") +
          (linkTags.length ? "\n    " : "") +
          styleTags.join("\n    ") +
          (styleTags.length ? "\n    " : "") +
          scriptTags.join("\n    ") +
          "\n  ";

        return `${startTag}${formattedContent}${endTag}`;
      }
    );
  }

  /**
   * Format the entire HTML document for better readability
   * @param {string} content - HTML content to format
   * @returns {string} - Formatted HTML content
   */
  formatHtmlDocument(content) {
    try {
      // First use the existing head formatting
      content = this.formatHeadSection(content);

      // Format the body section
      const bodyRegex = /(<body[^>]*>)([\s\S]*?)(<\/body>)/i;
      content = content.replace(
        bodyRegex,
        (match, startTag, bodyContent, endTag) => {
          // Preserve formatting in <pre>, <textarea>, <script>, and <style> tags
          const preserveTags = [];
          const preserveRegex =
            /(<(pre|textarea|script|style)[^>]*>)([\s\S]*?)(<\/\2>)/gi;
          let preserveCounter = 0;

          // Replace content in preserved tags with placeholders
          bodyContent = bodyContent.replace(
            preserveRegex,
            (match, startTag, tagName, content, endTag) => {
              const placeholder = `__PRESERVE_${preserveCounter++}__`;
              preserveTags.push({ placeholder, content: match });
              return placeholder;
            }
          );

          // Format the rest of the body content with proper indentation
          bodyContent = this.formatBodyContent(bodyContent);

          // Restore preserved tags
          preserveTags.forEach(({ placeholder, content }) => {
            bodyContent = bodyContent.replace(placeholder, content);
          });

          return `${startTag}\n  ${bodyContent}\n${endTag}`;
        }
      );

      // Add proper DOCTYPE and ensure HTML tag is properly formatted
      if (!content.trim().startsWith("<!DOCTYPE")) {
        content = `<!DOCTYPE html>\n${content}`;
      }

      // Format the html tag
      const htmlRegex = /(<html[^>]*>)([\s\S]*?)(<\/html>)/i;
      content = content.replace(
        htmlRegex,
        (match, startTag, htmlContent, endTag) => {
          return `${startTag}\n${htmlContent}\n${endTag}`;
        }
      );

      return content;
    } catch (error) {
      console.error("Error formatting HTML document:", error);
      return content; // Return original content on error
    }
  }

  /**
   * Format body content with proper indentation and line breaks
   * @param {string} content - Body content to format
   * @returns {string} - Formatted body content
   */
  formatBodyContent(content) {
    try {
      // Add line breaks after closing tags for readability
      content = content.replace(
        /(<\/(?:div|section|article|nav|header|footer|main|aside|h[1-6]|p|ul|ol|li|table|tr|td|th)>)(?!\s*[\r\n])/gi,
        "$1\n"
      );

      // Add line breaks before opening tags (except inline elements)
      content = content.replace(
        /(?<!\n|^)(<(?:div|section|article|nav|header|footer|main|aside|h[1-6]|p|ul|ol|li|table|tr|td|th)[^>]*>)/gi,
        "\n$1"
      );

      // Basic indentation - count opening tags to determine depth
      const lines = content.split("\n");
      let formattedContent = "";
      let indentLevel = 0;

      lines.forEach((line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return; // Skip empty lines

        // Decrease indent for closing tags
        const closeTagMatch = trimmedLine.match(/^<\//);
        if (closeTagMatch && indentLevel > 0) {
          indentLevel--;
        }

        // Add indentation
        formattedContent += "  ".repeat(indentLevel) + trimmedLine + "\n";

        // Increase indent for opening tags (that aren't self-closing)
        const openTagMatch = trimmedLine.match(/<[^\/][^>]*>(?!.*<\/)/);
        const selfClosingMatch = trimmedLine.match(/<[^\/][^>]*\/>/);
        if (openTagMatch && !selfClosingMatch) {
          indentLevel++;
        }
      });

      return formattedContent;
    } catch (error) {
      console.error("Error formatting body content:", error);
      return content; // Return original content on error
    }
  }
}

module.exports = NexaExpress;
