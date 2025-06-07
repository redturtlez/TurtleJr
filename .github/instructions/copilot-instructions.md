---
applyTo: "**"
---

# 🛠️ Developer Instructions for Copilot Usage

This project uses GitHub Copilot alongside Next.js (App Router), TypeScript, Tailwind CSS, and Prisma. To ensure Copilot suggestions align with project standards, follow the rules below while writing code.

---

## ⚙️ TypeScript Guidelines

1. **Always use explicit return types**  
   Avoid using `any`. Leverage TypeScript's type inference and declare return types explicitly for functions.

2. **Prefer functional programming**  
   Favor pure functions and immutable data. Avoid side effects where possible.

3. **Use async/await**  
   Write asynchronous code with `async/await`. Do not use `.then()` chains.

4. **Avoid mutating `req` or `res`**  
   In API routes or handlers, do not modify the `req` or `res` objects directly.

5. **Avoid unnecessary re-renders**  
   Use `useMemo`, `useCallback`, and `React.memo` where appropriate to improve performance.

---

## ⚛️ Next.js App Router Conventions

6. **Use server components by default**  
   Prefer Server Components. Only add `"use client"` when required (e.g. for interactivity).

7. **Separate business logic**  
   Keep route handlers and pages clean. Move logic into service or repository files.

8. **Avoid business logic in Prisma schema**  
   Prisma schema files should define data structures, not logic.

---

## 🎨 Tailwind CSS Practices

9. **Use utility classes only**  
   Style exclusively with Tailwind CSS. Avoid custom CSS unless absolutely necessary.

10. **Use responsive and dark mode prefixes**  
    Utilize `sm:`, `md:`, `lg:`, and `dark:` to build adaptive, accessible interfaces.

11. **Use `clsx` or `classnames`**  
    For conditional class names, always use `clsx` or `classnames` libraries.

---

## 🧬 Prisma Standards

12. **Typed Prisma queries only**  
    Do not use raw SQL. Always use Prisma Client with fully typed queries.

13. **Wrap queries in try/catch**  
    Especially in APIs and Server Actions, always catch potential query errors.

---

## 🧾 Validation and Security

14. **Validate user inputs**  
    Use Zod or similar validators for all user-provided data, particularly on the server side.

15. **Escape user-generated content**  
    When rendering user input in the UI, ensure it's sanitized to prevent XSS attacks.

16. **Use environment variables**  
    Never hardcode secrets or API keys. Place them in `.env` files and access via `process.env`.

---

## 🗂️ Project Structure Guidelines

17. **Use kebab-case naming**  
    Folder and file names should follow `kebab-case` for consistency.

18. **Organize by feature, not file type**  
    Group files by feature/domain, not by controller/model/view type folders.

19. **Keep components modular**  
    Limit components to ~100 lines. Break them into smaller parts when needed.

20. **Store reusable components in `/components` or `/ui`**  
    Components used in multiple places should go in a shared directory with descriptive names.

---

## 🧠 Copilot Usage Tips

- Write comments that explain what you’re about to code. Copilot uses them as guidance.  
  Example:
  ```ts
  // Fetch recent blog posts using Prisma, ordered by date
  // Validate form input with Zod before saving
  ```
