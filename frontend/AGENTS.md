# Frontend Architecture and Design Standards

## 1. Technology Stack

- Use React with TypeScript.
- Use Vite for the frontend build system if the project does not already have a suitable setup.
- Use React Router for client-side routing.
- Use the existing backend API for all real application data.
- Reuse the project's existing libraries when appropriate.
- Choose a consistent styling solution based on the current project requirements.
- Avoid unnecessary dependencies and duplicate libraries.

## 2. Modular and Scalable Architecture

Organize the frontend using a feature-based architecture.

Suggested structure, adapted to the actual project:

src/
  app/
    router/
    providers/
  components/
    ui/
    layout/
  features/
    auth/
      components/
      pages/
      services/
      hooks/
      types/
    dashboard/
      components/
      pages/
      services/
      hooks/
      types/
  hooks/
  lib/
  services/
    api/
  styles/
  types/
  utils/

Architecture rules:
- Keep each feature's components, hooks, API services, and types grouped together.
- Extract genuinely reusable UI into shared components.
- Keep pages focused on composing components rather than containing all business logic.
- Separate API calls from presentation components.
- Define TypeScript types for API requests and responses.
- Avoid oversized components and unnecessary prop drilling.
- Use clear naming conventions and consistent import patterns.
- Use path aliases when supported by the existing build configuration.
- Avoid circular dependencies and duplicated business logic.
- Do not create abstractions without a real reuse or maintenance benefit.

## 3. Design System and Unique Color Scheme

Create a distinctive, polished visual identity instead of using a generic template.

Design direction:
- Use a sophisticated deep-indigo and vivid teal palette with restrained coral accents.
- Use neutral, high-contrast surfaces for readability.
- Apply colors consistently to buttons, navigation, links, borders, cards, status indicators, and focus states.
- Use a consistent spacing scale, typography system, border-radius scale, and shadow system.
- Create reusable design tokens using CSS custom properties.
- Use visual hierarchy and whitespace deliberately.
- Keep the interface clean, modern, professional, and cohesive.
- Avoid excessive gradients, decorative effects, and inconsistent colors.
- Maintain sufficient contrast in both themes.

Suggested palette:
- Primary: #5146E5
- Secondary: #0D9488
- Accent: #FB7185
- Light background: #F7F8FC
- Light surface: #FFFFFF
- Dark background: #0B1020
- Dark surface: #151C30
- Light text: #172033
- Dark text: #F1F5F9

Treat these as starting design tokens. Refine them to suit the application and verify contrast.

## 4. Dark Mode and Light Mode

Implement complete dark and light themes.

Requirements:
- Use centralized theme tokens rather than hardcoding colors throughout components.
- Support a visible theme toggle in the shared application layout.
- Persist the user's selected theme using localStorage.
- Respect the operating system's preferred color scheme on the first visit when no preference is saved.
- Restore the saved preference on subsequent visits.
- Avoid a visible flash of the wrong theme during initial rendering where practical.
- Ensure backgrounds, text, forms, dropdowns, modals, tables, navigation, charts, and interactive states work in both themes.
- Use accessible labels and appropriate icons for the theme toggle.
- Keep theme logic centralized and reusable.

## 5. Responsive Design

Design mobile-first and ensure the interface works on:
- Small mobile screens
- Large mobile screens
- Tablets
- Laptops
- Desktop and wide displays

Requirements:
- Use flexible layouts, CSS Grid, Flexbox, and appropriate responsive breakpoints.
- Prevent horizontal overflow.
- Make forms and buttons comfortable to use on touch screens.
- Use responsive navigation, including a mobile menu where appropriate.
- Adapt tables, cards, dashboards, and sidebars for smaller screens.
- Handle text wrapping and long content gracefully.
- Avoid fixed widths that break on smaller displays.
- Test important pages at multiple viewport sizes.

## 6. Accessibility and Interaction

- Use semantic HTML and accessible form controls.
- Provide visible keyboard focus states.
- Support keyboard navigation for menus, dialogs, and theme controls.
- Use accessible names for icon-only buttons.
- Do not rely on color alone to communicate status.
- Respect reduced-motion preferences.
- Provide loading, error, success, and empty states where relevant.

## 7. Backend Integration

- Inspect existing backend routes and API contracts before implementing integrations.
- Use a centralized API client with a configurable base URL.
- Keep environment-specific settings in the appropriate environment files.
- Never expose secrets in client-side environment variables.
- Handle authentication, authorization, validation errors, and network failures according to the actual backend contract.
- Do not invent endpoints, request fields, or response shapes.
- Avoid replacing real API integrations with mock data unless explicitly requested.

## 8. Quality Requirements

- Keep TypeScript strictness consistent with the project.
- Avoid unnecessary use of `any`.
- Reuse components without creating excessive abstraction.
- Keep the code formatted and easy to maintain.
- Run the available lint, type-check, test, and production-build commands.
- Verify the main user flows in both themes and across responsive layouts.
- Do not claim a check passed unless it was actually executed.

## 9. Implementation Workflow

1. Inspect the existing repository and backend.
2. Document the verified API contracts.
3. Establish the frontend structure and design tokens.
4. Implement the theme system and shared layout.
5. Build reusable UI components.
6. Implement features in small, testable stages.
7. Integrate each feature with the real backend.
8. Test responsive behavior, accessibility, and both themes.
9. Review all changes before considering the frontend complete.