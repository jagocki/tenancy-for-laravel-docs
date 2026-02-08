#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

const BASE_URL = process.env.TENANCY_DOCS_URL || "https://v4.tenancyforlaravel.com";
const MAX_CONTENT_SIZE = parseInt(process.env.MAX_CONTENT_SIZE || "15000", 10);
const CACHE_DIR = process.env.CACHE_DIR || ".cache";
const CACHE_TTL = parseInt(process.env.CACHE_TTL || "3600", 10) * 1000; // Default 1 hour in milliseconds
const CACHE_ENABLED = CACHE_TTL > 0; // Disable caching if TTL is 0 or negative

// Ensure cache directory exists on startup
let cacheInitialized = false;
async function initCache(): Promise<void> {
  if (CACHE_ENABLED && !cacheInitialized) {
    try {
      await mkdir(CACHE_DIR, { recursive: true });
      cacheInitialized = true;
    } catch (error) {
      console.error("Warning: Failed to create cache directory:", error);
    }
  }
}

interface DocumentationPage {
  title: string;
  url: string;
  content: string;
}

interface CachedPage extends DocumentationPage {
  cachedAt: number;
}

/**
 * Generate a cache key from a path
 */
function getCacheKey(path: string): string {
  return createHash("md5").update(path).digest("hex");
}

/**
 * Get cached page if it exists and is not expired
 */
async function getCachedPage(path: string): Promise<DocumentationPage | null> {
  // Skip cache if disabled
  if (!CACHE_ENABLED) {
    return null;
  }

  try {
    const cacheKey = getCacheKey(path);
    const cachePath = join(CACHE_DIR, `${cacheKey}.json`);
    
    const cached = await readFile(cachePath, "utf-8");
    const cachedPage: CachedPage = JSON.parse(cached);
    
    // Check if cache is expired using cachedAt field
    const now = Date.now();
    if (now - cachedPage.cachedAt > CACHE_TTL) {
      return null;
    }
    
    // Return without cachedAt field
    const { cachedAt, ...page } = cachedPage;
    return page;
  } catch (error) {
    // Cache miss or error reading cache
    return null;
  }
}

/**
 * Save page to cache
 */
async function cachePage(path: string, page: DocumentationPage): Promise<void> {
  // Skip cache if disabled
  if (!CACHE_ENABLED) {
    return;
  }

  try {
    // Ensure cache directory is initialized
    await initCache();
    
    const cacheKey = getCacheKey(path);
    const cachePath = join(CACHE_DIR, `${cacheKey}.json`);
    
    const cachedPage: CachedPage = {
      ...page,
      cachedAt: Date.now(),
    };
    
    await writeFile(cachePath, JSON.stringify(cachedPage, null, 2), "utf-8");
  } catch (error) {
    // Non-critical error - don't disrupt normal operation
    if (error instanceof Error) {
      console.error(`Cache write failed: ${error.message}`);
    }
  }
}

// Known documentation sections and pages based on Tenancy for Laravel v3 structure
// v4 documentation should have similar structure
const KNOWN_SECTIONS = {
  "introduction": [
    "introduction",
    "quickstart",
    "installation",
    "configuration",
    "package-comparison",
  ],
  "concepts": [
    "the-two-applications",
    "tenants",
    "domains",
    "event-system",
    "routes",
    "tenancy-bootstrappers",
  ],
  "tenancy-modes": [
    "automatic-mode",
    "manual-mode",
  ],
  "single-database": [
    "single-database-tenancy",
  ],
  "identifying-tenants": [
    "tenant-identification",
    "early-identification",
  ],
  "multi-database": [
    "multi-database-tenancy",
    "migrations",
    "customizing-databases",
    "synced-resources-between-tenants",
    "session-scoping",
    "queues",
  ],
  "digging-deeper": [
    "manual-initialization",
    "testing",
    "console-commands",
    "tenant-aware-commands",
    "tenant-attribute-encryption",
    "cached-lookup",
    "realtime-facades",
    "tenant-maintenance-mode",
  ],
  "integrations": [
    "spatie",
    "horizon",
    "passport",
    "nova",
    "telescope",
    "livewire",
    "orchid",
    "sanctum",
    "sail",
  ],
  "features": [
    "user-impersonation",
    "telescope-tags",
    "tenant-config",
    "cross-domain-redirect",
    "universal-routes",
    "vite-bundler",
  ],
};

/**
 * Fetch and parse a documentation page (with caching)
 */
async function fetchDocPage(path: string): Promise<DocumentationPage> {
  // Try to get from cache first
  const cached = await getCachedPage(path);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from web
  const url = `${BASE_URL}/${path}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract title
  const title =
    $("h1").first().text().trim() ||
    $("title").text().replace(" - Tenancy for Laravel", "").replace(" | Tenancy for Laravel", "").trim();

  // Extract main content
  // Remove navigation, header, footer, and scripts
  $("nav, header, footer, script, style").remove();

  // Get the main content area
  const mainContent =
    $("main").text() || $("article").text() || $("body").text();

  // Clean up whitespace
  const content = mainContent
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();

  const page: DocumentationPage = {
    title,
    url,
    content: content.substring(0, MAX_CONTENT_SIZE), // Limit content size to avoid large responses
  };

  // Cache the page for future requests
  await cachePage(path, page);

  return page;
}

/**
 * Search documentation by keyword
 */
async function searchDocs(query: string): Promise<string[]> {
  const results: string[] = [];
  const searchQuery = query.toLowerCase();

  // Search through all known sections and pages
  for (const [section, pages] of Object.entries(KNOWN_SECTIONS)) {
    for (const page of pages) {
      if (
        page.toLowerCase().includes(searchQuery) ||
        section.toLowerCase().includes(searchQuery)
      ) {
        results.push(`${section}/${page}`);
      }
    }
  }

  return results;
}

/**
 * List all available pages
 */
function listPages(): Record<string, string[]> {
  return KNOWN_SECTIONS;
}

// Create server instance
const server = new Server(
  {
    name: "tenancy-for-laravel-docs-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const tools: Tool[] = [
  {
    name: "search_docs",
    description:
      "Search Tenancy for Laravel documentation for topics or pages. Returns a list of matching documentation pages.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (topic name, keyword, or page name)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_page",
    description:
      "Get the content of a specific Tenancy for Laravel documentation page. Provide the path like 'introduction/quickstart' or 'multi-database/migrations'.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Documentation page path (e.g., 'introduction/quickstart', 'multi-database/migrations')",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "list_pages",
    description:
      "List all available Tenancy for Laravel documentation pages organized by section (Introduction, Concepts, Multi-database, Integrations, etc.).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_section",
    description:
      "Get documentation for a specific topic. Automatically determines the correct section and page path.",
    inputSchema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description:
            "Topic name (e.g., 'quickstart', 'migrations', 'tenant-identification', 'horizon')",
        },
      },
      required: ["topic"],
    },
  },
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (!args) {
      throw new Error("Missing arguments");
    }

    switch (name) {
      case "search_docs": {
        const query = args.query as string;
        const results = await searchDocs(query);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query,
                  results,
                  message:
                    results.length > 0
                      ? `Found ${results.length} matching pages`
                      : "No results found. Try a different search term.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "list_pages": {
        const pages = listPages();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  sections: pages,
                  total: Object.values(pages).flat().length,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_page": {
        const path = args.path as string;
        const page = await fetchDocPage(path);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(page, null, 2),
            },
          ],
        };
      }

      case "get_section": {
        const topic = args.topic as string;
        let path = "";

        // Try to find the topic in known sections
        for (const [section, pages] of Object.entries(KNOWN_SECTIONS)) {
          if (pages.includes(topic.toLowerCase())) {
            path = `${section}/${topic.toLowerCase()}`;
            break;
          }
        }

        if (!path) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    error: `Topic '${topic}' not found. Use list_pages to see available topics.`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const page = await fetchDocPage(path);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(page, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "Unknown tool" }, null, 2),
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Tenancy for Laravel Documentation MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
