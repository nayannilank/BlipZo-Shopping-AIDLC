---
inclusion: always
---

# Security Standards

## Purpose

These standards define mandatory security practices for:
- Web applications
- Android applications
- iOS applications
- Backend APIs
- AWS infrastructure
- CI/CD pipelines
- Shared libraries
- AI-assisted development workflows

Security is a mandatory engineering responsibility and must be integrated into:
- Design
- Development
- Testing
- Deployment
- Operations

---

# Security Principles

## Zero Trust Model

The platform must assume:
- No implicit trust
- Every request requires validation
- Every identity requires verification
- Every resource requires authorization

---

## Defense in Depth

Security controls must exist across:
- Client applications
- APIs
- Infrastructure
- Networks
- Data layers
- CI/CD pipelines

No single security mechanism should be treated as sufficient.

---

## Least Privilege

All systems must operate with:
- Minimal required permissions
- Scoped access boundaries
- Role-based access control

Avoid:
- Broad administrative permissions
- Wildcard IAM permissions

---

## Secure by Default

Applications must:
- Deny by default
- Require explicit authorization
- Use secure configurations
- Avoid insecure fallbacks

---

# Authentication Standards

## Authentication Requirements

All protected systems must enforce:
- Secure authentication
- Session validation
- Token validation
- Expiration handling

---

## Authentication Mechanisms

Preferred:
- AWS Cognito
- OAuth2
- JWT-based authentication

---

## Multi-Factor Authentication

MFA should be enabled for:
- Administrative access
- Privileged operations
- Production access

---

## Token Handling

Tokens must:
- Be short-lived where practical
- Be securely stored
- Be validated server-side

Never:
- Store tokens in plain text
- Expose tokens in logs
- Hardcode authentication credentials

---

# Authorization Standards

## Role-Based Access Control

Applications must implement:
- RBAC policies
- Resource-level authorization
- Permission validation

---

## Authorization Enforcement

Authorization checks must occur:
- Server-side
- For every protected resource
- Independently from frontend validation

Never trust client-side authorization alone.

---

# Input Validation Standards

## Validate All External Input

Mandatory validation:
- Request body
- Query parameters
- Path parameters
- Headers
- Event payloads
- File uploads

Preferred:
- Schema-driven validation using Zod

---

## Input Sanitization

Applications must sanitize:
- User-generated content
- HTML content
- Rich text inputs
- Dynamic query parameters

---

## Injection Prevention

Applications must protect against:
- SQL injection
- NoSQL injection
- Command injection
- Template injection

Avoid:
- Dynamic query construction without validation

---

# Output Security Standards

## Output Encoding

Applications must:
- Encode output appropriately
- Prevent XSS vulnerabilities
- Sanitize rendered HTML

---

## Sensitive Data Exposure

Applications must never expose:
- Internal stack traces
- Infrastructure details
- Secrets
- Sensitive internal identifiers

---

# API Security Standards

## HTTPS Enforcement

All APIs must:
- Use HTTPS only
- Reject insecure transport

---

## API Gateway Security

APIs should implement:
- Request validation
- Rate limiting
- WAF protection
- JWT validation

---

## API Error Handling

Error responses must:
- Avoid sensitive information leakage
- Use standardized error structures
- Remain developer-friendly but secure

---

## Rate Limiting

Critical APIs must implement:
- Request throttling
- Abuse prevention
- Bot protection where applicable

---

# Mobile Security Standards

## Secure Storage

Mobile applications must use:
- Secure encrypted storage
- Platform-native secure mechanisms

Never store:
- Tokens in plain storage
- Sensitive information in logs
- Secrets in source code

---

## Mobile Application Hardening

Applications should:
- Minimize exposed debug information
- Disable insecure debugging in production
- Protect against tampering where possible

---

## Deep Linking Security

Deep links must:
- Validate parameters
- Prevent unauthorized access
- Avoid exposing sensitive data

---

## Device Permission Management

Applications must:
- Request minimum required permissions
- Explain permission usage clearly
- Handle denied permissions gracefully

---

# Web Application Security Standards

## Browser Security Headers

Web applications should implement:
- CSP headers
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security

---

## CSRF Protection

Applications must protect against:
- Cross-site request forgery attacks

Use:
- SameSite cookies
- CSRF tokens where applicable

---

## XSS Prevention

Applications must:
- Escape dynamic content
- Avoid unsafe HTML rendering
- Sanitize rich content

Avoid:
- Unsafe innerHTML usage

---

# Backend Security Standards

## Service Isolation

Services should:
- Operate independently
- Restrict resource access
- Avoid unnecessary trust relationships

---

## Secure Error Handling

Backend services must:
- Handle failures gracefully
- Avoid leaking implementation details
- Log errors securely

---

## Retry & Idempotency Security

Event-driven systems must:
- Handle duplicate events safely
- Prevent replay abuse
- Support idempotent processing

---

# AWS Security Standards

## IAM Security

Mandatory:
- Least privilege policies
- Resource-level access control

Never allow:
```json id="w2f6xz"
{
  "Action": "*",
  "Resource": "*"
}