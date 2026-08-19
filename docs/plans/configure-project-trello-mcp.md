# Configure Project-Local Trello MCP for Codex

**Type:** feature
**Date:** 2026-08-11
**Status:** implemented

## Summary

Configure Codex to launch the existing Trello MCP server only when working in this Furqan repository. The existing ignored `.mcp.json` remains the sole source of Trello credentials.

## Root Cause / Approach

The repository's `.mcp.json` is a Claude-style project configuration, which Codex does not register automatically. Add a project-local Codex MCP configuration that launches the same server through a small adapter and reads the existing credentials at launch. Keep the Codex configuration untracked so it remains local to this checkout.

## Decision Tree / Algorithm

- When Codex runs in this project, load the project-local Trello MCP definition.
- When the definition starts, read the API key and token from this checkout's ignored `.mcp.json`, then launch `trello-mcp-server` with those values.
- Outside this project, no Trello server is registered.

## Verified Test Cases

- Existing main checkout: `.mcp.json` already contains a working `trello-mcp-server` definition; the adapter reuses it without copying credentials.
- Codex global configuration: `codex mcp list` contains only the unrelated Atlassian server; the project configuration must add Trello without modifying that global configuration.

## Files to Change

- `.codex/config.toml` — project-only Codex MCP definition and credential adapter.
- `.gitignore` — keep the local Codex configuration out of version control.

## Constraints

- Do not copy, print, commit, or add Trello credentials to the global Codex configuration.
- Do not modify the existing `.mcp.json` server definition.
- Do not change the application or its runtime configuration.

## What NOT to Do

- Do not use `codex mcp add`; it writes to the global `~/.codex/config.toml`.
- Do not replace the existing `.mcp.json` credential source.

## Decisions Made

- Codex's project-local `.codex/config.toml` is the integration point.
- The ignored `.mcp.json` remains the single credential source.
