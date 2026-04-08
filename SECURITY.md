# Security Policy

This document describes how to report vulnerabilities, what is considered in scope, how remediation is handled, and how this project applies defense-in-depth controls.

## Supported Versions

Security updates are provided for the latest production branch.

Older snapshots, forks, and custom deployments are not guaranteed to receive coordinated patches.

## Reporting Vulnerabilities

Do not post exploit details in public issues.

Preferred channels:

1. GitHub Security Advisory report for this repository.
2. Private maintainer contact if advisory reporting is unavailable.

Include the following in your report:

- Vulnerability type and impact
- Affected component, file, or endpoint
- Reproducible steps with minimal proof of concept
- Preconditions and required permissions
- Suggested mitigation if available

## Disclosure Expectations

- Acknowledge receipt as soon as possible.
- Validate and triage severity.
- Prepare and test remediation.
- Coordinate disclosure timeline with the reporter.

Please allow reasonable time for fixes before public disclosure.

## Scope

In scope:

- Client application code under `src/`
- Serverless routes under `api/`
- Security headers and deployment policy under `vercel.json`
- Auth, authorization, and data access controls

Out of scope unless a clear exploit path exists:

- Social engineering
- Physical device access scenarios
- Misconfiguration in third-party accounts not controlled by this repository

## Severity Guidance

Examples of high-priority issues:

- Authentication bypass
- Authorization escalation
- Sensitive data exposure
- Stored XSS or exploitable reflected XSS
- SQL/RLS policy bypass through client or API misuse
- Broken access control in admin or moderation routes

Examples of medium-priority issues:

- CSRF weaknesses in meaningful state-changing flows
- Weak validation enabling integrity attacks
- Security header regressions that materially expand attack surface

Examples of lower-priority issues:

- Hardening opportunities without direct exploitability
- Informational findings with no practical abuse path

## Security Controls in This Project

This repository includes layered security controls, including:

- Input validation and sanitization at service boundaries
- Role-aware authorization checks for sensitive actions
- CSP, HSTS, frame protections, and content type protections via deployment headers
- Client-side security middleware for additional browser hardening
- Safe handling patterns around rate limiting and lockout behavior
- Environment variable validation for critical runtime configuration

## Secrets and Credentials

- Never commit production secrets.
- Use environment variables for all sensitive values.
- Keep service-role credentials server-side only.
- Rotate credentials immediately if exposure is suspected.

## Dependency and Supply Chain Hygiene

- Keep runtime and tooling dependencies updated.
- Prefer pinned or controlled version ranges in lockfile workflow.
- Validate security impact before introducing new packages.

## Secure Development and Review Checklist

Before merging security-sensitive changes, confirm:

- Access checks are server-validated where required.
- Error messages do not leak internal details.
- Inputs are validated and constrained.
- Changes do not weaken CSP or security headers.
- Build passes and critical paths are tested.

## Incident Response Notes

If active abuse is suspected:

1. Contain impact and disable affected paths when possible.
2. Rotate impacted keys and tokens.
3. Patch and verify.
4. Document incident scope and resolution.

## Safe Harbor

Good-faith security research that avoids privacy violations, data destruction, and service disruption is welcomed.

Testing must be limited to systems and data you are authorized to access.