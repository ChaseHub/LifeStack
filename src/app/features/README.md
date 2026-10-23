# Features Directory (`src/app/features`)

This directory houses domain-specific business features (e.g., finances, habits, milestones).

## Architecture Rules
1. **Encapsulation**: Each feature should be self-contained in its own folder (e.g., `features/finances/`).
2. **Components**: Keep smart/container components that orchestrate state inside the feature folder.
3. **Services**: Feature-specific state services should be provided in the feature or root scope as needed.
4. **Export**: Features should expose components or sub-routes to be consumed by `pages/` or the root router.
