# The Cohort

The Cohort is an Arabic-first learning platform for Computer Science students.

It combines structured study material, quizzes, challenges, moderation workflows, support tickets, PWA capabilities, and AI-assisted educational flows.

## Table of Contents

- Overview
- Key Features
- Tech Stack
- Architecture
- Prerequisites
- Local Setup
- Environment Variables
- Available Scripts
- Security Posture
- Deployment
- Open Source Workflow
- Troubleshooting
- License

## Overview

The project is built as a Vite + React + TypeScript frontend with Supabase for authentication and data access, plus Vercel serverless endpoints for secure backend operations.

The platform targets educational use cases where reliability, safety, and clear access control are important.

## Key Features

- Academic material browsing and subject-based navigation
- Quiz engine with challenge mode and scoring workflows
- Support ticket and messaging flow
- Admin dashboards for moderation and content operations
- PWA support, offline behavior, and push notifications
- AI-powered educational helpers through a secured backend route

## Tech Stack

- Frontend: React 18, TypeScript, Vite
- Styling: Tailwind CSS, Framer Motion
- Data and Auth: Supabase
- Serverless API: Vercel Functions
- Build and Tooling: TypeScript compiler, Vite bundler

## Architecture

Top-level structure:

- [src](src)
	- [src/pages](src/pages): app pages and admin pages
	- [src/components](src/components): reusable UI blocks
	- [src/services](src/services): data and business operations
	- [src/utils](src/utils): utility and security helpers
	- [src/lib](src/lib): shared clients such as Supabase
- [api](api): serverless endpoints for sensitive operations
- [public](public): static assets
- [supabase](supabase): SQL migrations and database evolution files

## Prerequisites

- Node.js 18+
- npm 9+
- Supabase project with required schema
- Vercel account for production deployment

## Local Setup

1. Clone the repository.
2. Install dependencies.
3. Create a local environment file from [.env.example](.env.example).
4. Start development server.

Example commands:

npm install
npm run dev

## Environment Variables

Use [.env.example](.env.example) as the source of truth.

Frontend variables:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_WEB3FORMS_ACCESS_KEY
- VITE_APP_VERSION

Serverless variables:

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- GEMINI_API_KEY
- GOOGLE_API_KEY
- ALLOWED_ORIGINS
- APP_ORIGIN
- GEMINI_REQUIRE_AUTH
- CRON_SECRET
- REMINDER_DISPATCH_SECRET

Important:

- Never commit real secrets.
- Keep production secrets only in Vercel environment settings.
- Rotate keys immediately if exposure is suspected.

## Available Scripts

- npm run dev: start local dev server
- npm run build: type-check then build production bundle
- npm run preview: preview built output locally

## Security Posture

Security controls implemented in this codebase include:

- Environment validation for required keys and URL formats
- Input validation and sanitization at service boundaries
- Role and authorization checks in protected flows
- Browser-side security middleware for common client protections
- Strict headers configured in [vercel.json](vercel.json)
- Dedicated disclosure guidance in [SECURITY.md](SECURITY.md)

For vulnerability reporting, follow [SECURITY.md](SECURITY.md).

## Deployment

Production deployment targets Vercel.

Relevant files:

- [vercel.json](vercel.json): rewrites, headers, cron schedule
- [api/gemini.ts](api/gemini.ts): secured AI endpoint
- [api/reminder-dispatch.ts](api/reminder-dispatch.ts): scheduled reminder dispatch

Recommended deployment checklist:

1. Configure all required environment variables in Vercel.
2. Confirm Supabase URL and keys are correct.
3. Run local build before pushing.
4. Verify headers and cron behavior in deployed environment.

## Open Source Workflow

Before contributing, read:

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [SECURITY.md](SECURITY.md)
- [LICENSE](LICENSE)

Typical contribution flow:

1. Fork repository.
2. Create branch.
3. Implement focused change.
4. Run build and validate behavior.
5. Open pull request with clear description.

## Troubleshooting

Common startup issues:

- Missing environment variable errors:
	- Ensure local env file contains all required fields from [.env.example](.env.example).
- Supabase URL validation error:
	- Use HTTPS Supabase project URL in VITE_SUPABASE_URL.
- Build issues after dependency changes:
	- Remove node_modules and reinstall dependencies.

## License

This project is licensed under MIT. See [LICENSE](LICENSE).