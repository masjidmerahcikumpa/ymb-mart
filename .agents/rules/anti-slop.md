---
description: Anti-AI-Slop & Overpower Engineering Rules
globs: *
---

# Anti-AI-Slop & Overpower Engineering Protocol

## 1. Zero AI Slop (Strict Bans)
- **NO Placeholders**: Never write `// TODO: implement later`, `// ... rest of code unchanged ...`, or dummy fallback handlers. Write complete, functional code.
- **NO Useless Wrappers**: Do not wrap standard libraries or existing abstractions into needless 1-line helper functions.
- **NO Hallucinated Imports**: Never guess package names, types, or signatures. Always view/grep existing files first.
- **NO Silent Failures**: Never swallow errors (`_ = err`, empty `catch (e) {}`, or unlogged failures). Always return or log actionable error contexts.
- **NO Generic Fluff Comments**: Do not write obvious comments like `// increment counter` or `// function to get data`. Only comment on non-obvious logic or architectural rationale.

## 2. Surgical Execution & Grounding
- **Read Before Write**: Inspect schema, interfaces, and call sites before making edits.
- **Minimal Atomic Diffs**: Edit only the necessary lines. Preserve existing comments, formatting, and unrelated logic.
- **Respect Repo Patterns**: Follow established project conventions (e.g. SQLite WAL, Expo Router file-based patterns, Zustand store structure).

## 3. Overpower Verification & Self-Healing
- **Always Validate**: After code changes, run static checks immediately:
  - Go: `go build ./...` or `go test`
  - TypeScript / Expo: `npx tsc --noEmit`
- **Self-Healing**: If a verification command fails, diagnose the exact stack trace/error, fix the root cause, and re-verify until clean. Never ask the user to fix your syntax or type errors.

## 4. Production & Concurrency Standards
- **Memory & Resource Leaks**: Always pair allocations with cleanups (`defer rows.Close()`, `defer resp.Body.Close()`, cleanup intervals/event listeners).
- **Concurrency Safe**: Protect shared memory with sync primitives (`sync.Mutex`, `sync.RWMutex`, atomic counters). Prevent deadlock and goroutine leaks.
- **Network Resilience**: Include request timeouts, abort signals, and proper HTTP status code handling.
