## 2024-05-18 - Custom interactive elements lacking focus states
**Learning:** The design system in this portfolio uses heavily customized interactive elements (`.nav-link`, `.btn`, `.theme-toggle`) that don't have clear focus states for keyboard users.
**Action:** Implemented a reusable `:focus-visible` utility pattern in `style.css` using the design system's `var(--accent-primary)` to ensure all interactive elements have visible, accessible keyboard focus indicators without disrupting mouse users.
