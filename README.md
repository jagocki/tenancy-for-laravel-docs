# Tenancy for Laravel Documentation MCP Server

A Model Context Protocol (MCP) server that provides access to Tenancy for Laravel v4 documentation. This server allows AI assistants to search and retrieve documentation for Tenancy for Laravel directly from [https://v4.tenancyforlaravel.com/](https://v4.tenancyforlaravel.com/).

## Features

- **Search Documentation**: Search for topics and pages across Tenancy for Laravel docs
- **Get Page Content**: Retrieve detailed documentation for specific pages
- **List All Pages**: Browse all available documentation pages organized by section
- **Get Section**: Fetch documentation for a specific topic with automatic path resolution
- **Local Caching**: Automatically caches documentation pages locally for faster access and offline availability of previously fetched pages

This server provides access to **50+ documentation pages** covering Tenancy for Laravel v4 concepts, features, and integrations.

## Installation

### From Source

```bash
git clone https://github.com/jagocki/tenancy-for-laravel-docs.git
cd tenancy-for-laravel-docs
npm install
npm run build
```

## Usage

### Configuration

The server can be configured using the following environment variables:

- `TENANCY_DOCS_URL` (optional): Base URL for Tenancy for Laravel documentation. Defaults to `https://v4.tenancyforlaravel.com`
- `MAX_CONTENT_SIZE` (optional): Maximum content size in characters for documentation pages. Defaults to `15000`
- `CACHE_DIR` (optional): Directory for caching documentation pages. Defaults to `.cache`
- `CACHE_TTL` (optional): Cache time-to-live in seconds. Defaults to `3600` (1 hour)

#### Caching

The server automatically caches fetched documentation pages locally to improve performance and enable offline access to previously fetched pages. The cache:

- Stores pages in the `.cache` directory (configurable via `CACHE_DIR`)
- Expires after 1 hour by default (configurable via `CACHE_TTL`)
- Reduces load on the Tenancy for Laravel website
- Provides faster response times after the first fetch
- Enables offline access to pages that have been previously cached

To clear the cache, simply delete the cache directory:

```bash
rm -rf .cache
```

### Requirements

- Node.js >= 20.18.1

### With Claude Desktop

Add this to your Claude Desktop configuration file (see `claude_desktop_config.example.json` for a complete example):

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tenancy-for-laravel-docs": {
      "command": "node",
      "args": ["/path/to/tenancy-for-laravel-docs/dist/index.js"]
    }
  }
}
```

### With VSCode

To use this MCP server with VSCode, you'll need to install an MCP-compatible extension.

#### Using Cline Extension (Recommended)

1. **Install the Cline extension** from the VSCode marketplace:
   - Open VSCode
   - Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
   - Search for "Cline"
   - Click Install

2. **Configure the MCP server**:
   - Open VSCode settings (File > Preferences > Settings or Ctrl+,)
   - Search for "Cline MCP"
   - Click "Edit in settings.json"
   - Add the following configuration:

```json
{
  "cline.mcpServers": {
    "tenancy-for-laravel-docs": {
      "command": "node",
      "args": ["/absolute/path/to/tenancy-for-laravel-docs/dist/index.js"],
      "env": {
        "CACHE_DIR": "/absolute/path/to/tenancy-for-laravel-docs/.cache"
      }
    }
  }
}
```

**Important:** Use absolute paths for both the server executable and the CACHE_DIR to ensure the cache is created in the correct location. See `vscode_settings.example.json` for a complete example.

3. **Using the tools**:
   - Open Cline in VSCode (click the Cline icon in the sidebar)
   - The Tenancy for Laravel documentation tools will be available to the AI assistant
   - Ask questions like "Show me the Tenancy for Laravel quickstart guide"

#### Alternative: Using Continue Extension

1. **Install Continue extension** from the VSCode marketplace

2. **Configure MCP server** in Continue's config file (`~/.continue/config.json`):

```json
{
  "mcpServers": [
    {
      "name": "tenancy-for-laravel-docs",
      "command": "node",
      "args": ["/absolute/path/to/tenancy-for-laravel-docs/dist/index.js"]
    }
  ]
}
```

#### Tips for VSCode Usage

- Make sure to use absolute paths in your configuration
- Restart VSCode after adding the MCP server configuration
- Check the extension's output panel if the server doesn't connect properly
- The cache directory will be created automatically on first use

## Available Tools

### search_docs

Search Tenancy for Laravel documentation for topics or pages.

**Input:**
- `query` (string): Search query (topic name, keyword, or page name)

**Example:**
```json
{
  "query": "migrations"
}
```

### get_page

Get the content of a specific Tenancy for Laravel documentation page.

**Input:**
- `path` (string): Documentation page path (e.g., 'introduction/quickstart', 'multi-database/migrations')

**Example:**
```json
{
  "path": "introduction/quickstart"
}
```

### list_pages

List all available Tenancy for Laravel documentation pages organized by section.

**Input:** None

### get_section

Get documentation for a specific topic with automatic path resolution.

**Input:**
- `topic` (string): Topic name (e.g., 'quickstart', 'migrations', 'tenant-identification')

**Example:**
```json
{
  "topic": "quickstart"
}
```

## Documentation Sections

The server provides access to the following documentation sections:

- **Introduction**: introduction, quickstart, installation, configuration, package-comparison
- **Concepts**: the-two-applications, tenants, domains, event-system, routes, tenancy-bootstrappers
- **Tenancy Modes**: automatic-mode, manual-mode
- **Single Database**: single-database-tenancy
- **Identifying Tenants**: tenant-identification, early-identification
- **Multi-database**: multi-database-tenancy, migrations, customizing-databases, synced-resources-between-tenants, session-scoping, queues
- **Digging Deeper**: manual-initialization, testing, console-commands, tenant-aware-commands, tenant-attribute-encryption, cached-lookup, realtime-facades, tenant-maintenance-mode
- **Integrations**: spatie, horizon, passport, nova, telescope, livewire, orchid, sanctum, sail
- **Features**: user-impersonation, telescope-tags, tenant-config, cross-domain-redirect, universal-routes, vite-bundler

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Watch for changes
npm run watch

# Start the server
npm start
```

## License

MIT