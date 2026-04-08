# Learning the Cohort Platform

Welcome to the learning guide for **The Cohort**, an Arabic-first educational platform for Computer Science students. This document is designed to help you understand the architecture, tech stack, and development workflow of the project.

---

## 🚀 Prerequisite Knowledge

Before diving into the codebase, you should be comfortable with:
- **JavaScript (ES6+)**: Arrow functions, async/await, modules.
- **TypeScript**: Interfaces, types, and generic patterns.
- **React 18**: Hooks (`useState`, `useEffect`, `useContext`, `useMemo`), functional components, and lazy loading.
- **Modern CSS**: Flexbox, Grid, and responsive design.

---

## 🛠️ Tech Stack Guide

The Cohort uses a cutting-edge tech stack for a fast, responsive, and secure experience.

### Frontend
- **React & Vite**: Fast development server and optimized production builds.
- **Tailwind CSS**: Utility-first styling for rapid UI development.
- **Framer Motion**: Powering smooth, high-end animations and glassmorphic effects.
- **Lucide React**: Our icon library of choice.

### Backend & Data
- **Supabase**: Backend-as-a-Service providing:
  - **PostgreSQL Database**: Relational data storage.
  - **Authentication**: Secure JWT-based user management.
  - **Storage**: Asset hosting for study materials.
  - **RLS (Row Level Security)**: Data access control directly at the database level.
- **Vercel Functions**: Serverless Node.js endpoints located in `/api` for sensitive logic (e.g., AI integration, scheduled tasks).

---

## 🏗️ Architecture Overview

The project is structured logically to separate concerns:

```text
/
├── api/                # Vercel Serverless Functions (Node.js/TS)
├── supabase/           # SQL migrations and database schema documentation
├── src/
│   ├── components/     # Reusable UI building blocks
│   ├── context/        # Global state providers (Auth, Theme, Toast)
│   ├── hooks/          # Custom hooks for business logic and data fetching
│   ├── lib/            # Shared service clients (Supabase client)
│   ├── pages/          # Full page components and their sub-layouts
│   ├── services/       # Business logic layer (interacts with Supabase/APIs)
│   ├── utils/          # Pure helper functions and security validators
│   ├── App.tsx         # Main entry point and routing config
│   └── main.tsx        # React DOM initialization
└── public/             # Static assets (images, icons, manifest)
```

### Key Patterns
1. **Lazy Loading**: Pages are loaded on-demand using `React.lazy` and `Suspense` in `App.tsx`.
2. **Context for Global State**: We use React Context for things that truly need to be global (Auth, Theme).
3. **Custom Hooks**: Most complex logic (Gamification, Quiz fetching, PWA control) is encapsulated in hooks.
4. **Service Layer**: Components rarely call Supabase directly; they use `src/services` for data operations.

---

## 📊 Data Model (Database Schema)

The core data entities are:
- **Profiles**: User data including XP, level, and roles.
- **Subjects & Modules**: The academic hierarchy.
- **Quizzes & Questions**: The assessment engine.
- **Attempts**: Tracks student performance.
- **Challenges**: P2P competitive quiz system.
- **Events**: Academic calendar and deadlines.
- **Support Tickets**: Helpdesk flow.

> [!TIP]
> You can find the full schema definition in [supabase/schema.sql](file:///c:/Users/Muhmd/Documents/GitHub/CSC/supabase/schema.sql).

---

## 💻 Development Workflow

### Adding a New Feature
1. **Define the Data**: If needed, update `supabase/schema.sql` and run migrations.
2. **Create a Service**: Add logic in `src/services/` to interact with the data.
3. **Build the UI**: 
   - Create components in `src/components/`.
   - Use Tailwind for styling and Framer Motion for transitions.
4. **Wire it Up**: Add a new route in `src/App.tsx` or update an existing page.

### Styling Standards
- Follow the **Glassmorphism** aesthetic: `bg-white/10 backdrop-blur-md border border-white/20`.
- Use the curated color palette defined in `tailwind.config.js`.

---

## 📚 Learning Resources

- [Official React Docs](https://react.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Framer Motion API](https://www.framer.com/motion/)
- [Vite Guide](https://vitejs.dev/guide/)

---

*Happy Coding! Let's build the future of education together.*
