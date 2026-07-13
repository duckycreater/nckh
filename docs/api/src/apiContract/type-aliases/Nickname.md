[**BMO Robot — API Reference**](../../../README.md)

***

[BMO Robot — API Reference](../../../README.md) / [src/apiContract](../README.md) / Nickname

# Type Alias: Nickname

> **Nickname** = `string`

Defined in: src/apiContract.ts:18

apiContract.ts — Typed surface for the BMO HTTP API.

This file is consumed by BOTH the client (src/apiClient.ts) and
the server (server/apiContract.ts uses it for request validation
with the same shapes). Keeping a single source of truth avoids
drift between client expectations and server guarantees.

Conventions:
  - All paths are RELATIVE to "/api". The runtime prepends the
    origin / Vite proxy.
  - Request bodies use snake_case (the server's style).
  - Successful responses always carry `{ok: true, ...}`; errors
    carry `{ok: false, error: "..."}`.  Existing endpoints that
    use ad-hoc shapes are wrapped at the call site.
