# Shared Directory (`src/app/shared`)

This directory houses reusable dumb UI components, layout helpers, pipes, and directives shared across multiple features and pages.

## Architecture Rules
1. **No Domain Logic**: Shared components must be agnostic of business features (e.g., generic buttons, modal dialogs, loading spinners, date formatters).
2. **Stateless / Presentational**: Prefer `@Input` / `@Output` or signal inputs (`input()`, `output()`) rather than feature-specific state services.
