# Project workflow

- For code changes, read and apply the project-local [Ponytail skill](.agents/skills/ponytail/SKILL.md). Prefer existing helpers and native features; preserve validation, security, error handling, and accessibility.
- For requested visual design work, use the project-local [Taste skill](.agents/skills/design-taste-frontend/SKILL.md). Read only the references relevant to the current screen.
- When integrating or enabling real account management, apply the user's requested Security Audit skill before production activation. Identify the intended skill and read its actual instructions then; review authentication, sessions, account linking/unlinking, withdrawal, authorization, and personal data handling. This is a recorded future requirement, not a claim that the skill is installed or an audit has already passed.
- Communicate with this user in Korean. User instructions take priority over a skill's suggested response language or workflow.
- Design proposals in `design-proposals/` are review material. Do not import their styles into the app or deploy a visual change until the user approves that proposal. Code refactoring may proceed independently.
- The old Taste home proposal remains unapplied; the user subsequently approved the separate red-and-neutral design and requested the guided home flow. Preserve those decisions and the independent Ponytail refactoring.
- Preserve existing saju calculation, content conditions, uncertainty handling, privacy policy, menu destinations, and the 6-entry / 4×2 / 3×3 menu composition unless the user requests otherwise.
- Keep existing unfinished changes. The optional upstream hooks, telemetry, and local cost dashboard are not installed by these project-local skills.
