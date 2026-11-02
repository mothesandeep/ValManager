# Contributing to Kasab Val Manager

Thank you for contributing to Kasab Val Manager! This guide outlines our development workflow, coding standards, and pull request process.

---

## 🛠️ Getting Started

1. **Fork and Clone the Repository:**
   ```bash
   git clone https://github.com/mothesandeep/Kasab-Val-Manager.git
   cd Kasab-Val-Manager
   ```

2. **Install Dependencies:**
   ```bash
   npm install --prefix app
   ```

3. **Configure Environment:**
   Copy `app/.env.example` to `app/.env.local` and add your local Supabase credentials.

4. **Start Development Server:**
   ```bash
   npm run dev --prefix app
   ```

---

## 🧪 Testing & Quality Standards

Before submitting changes, ensure all tests, typechecks, and linters pass without errors or warnings:

```bash
# 1. Run full Vitest suite (all 342 tests must pass)
npm test --prefix app

# 2. Run TypeScript build & Vite production bundle check
npm run build --prefix app

# 3. Run Oxlint code analysis
npm run lint --prefix app
```

If your change adds new calculations, UI workflows, or API calls, you must include corresponding test suites under `app/src/tests/` or alongside the feature directory.

---

## 📐 Development Guidelines

- **Architecture:** Keep feature-specific logic within `app/src/features/<feature_name>/`. Shared UI components belong in `app/src/components/common/`.
- **Pure Calculations:** Tare weight formulas, billing amounts, and balances must be pure functions in calculation utilities.
- **Design System:** Strictly follow the Blue SaaS 2.0 design tokens outlined in [`design.md`](design.md). Maintain 44×44px minimum tap targets and `tabular-nums` on all numbers.
- **Rules Invariants:** Review [`rules.md`](rules.md) for strict coding conventions and [`agent.md`](agent.md) for agent operating guidelines.

---

## 📝 Commit & PR Guidelines

### Commit Messages
- Use clear, conventional commit prefixes: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`.
- Use the imperative mood in the present tense (e.g., `feat: add party alias search index`).
- Keep the summary line concise (under 72 characters).

### Pull Requests
1. Fill out the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md) completely.
2. Ensure CI/CD workflows and automated test checks pass.
3. Update relevant documentation (`memory.md`, `README.md`, etc.) if your change alters behaviors or configurations.
