---
inclusion: always
---

# Technology Stack

## Engineering Philosophy

The platform follows:
- Cloud-native architecture
- Serverless-first engineering
- API-first integration
- Mobile-first user experience
- AI-assisted development workflows
- Infrastructure as Code
- Automation-first delivery practices

Technology selections should prioritize:
- Scalability
- Maintainability
- Security
- Developer productivity
- Operational simplicity
- Long-term ecosystem support

---

# Frontend Technologies

## Web Applications

### Core Framework

- React 19+
- TypeScript
- Vite

### Routing

- React Router

### State Management

Preferred:
- Zustand

Alternative:
- Redux Toolkit

### Data Fetching

- TanStack Query (React Query)

### Forms & Validation

- React Hook Form
- Zod

### Styling

Preferred:
- Tailwind CSS

Optional:
- CSS Modules
- Styled Components where justified

### UI Component Strategy

Preferred:
- Shared reusable component library
- Design system driven development
- Atomic or feature-driven component structure

### API Communication

- Axios

### Frontend Testing

- Vitest
- React Testing Library
- Playwright

---

# Mobile Technologies

## Cross-Platform Mobile Development

Preferred:
- React Native

Preferred Framework:
- Expo

## Mobile Language Standards

- TypeScript mandatory

## Navigation

- React Navigation

## Mobile State Management

Preferred:
- Zustand

Alternative:
- Redux Toolkit

## Mobile Data Fetching

- TanStack Query

## Mobile Styling

Preferred:
- NativeWind

Alternative:
- React Native StyleSheet

## Mobile Storage

Preferred:
- SecureStore
- Encrypted local storage

Avoid:
- Plain AsyncStorage for sensitive information

## Mobile Features

Applications should support:
- Deep linking
- Push notifications
- Offline-aware workflows
- Secure authentication
- Device permission management

## Mobile Testing

- React Native Testing Library
- Detox where E2E automation is required

---

# Backend Technologies

## Runtime

- Node.js 22+

## Language

- TypeScript mandatory

## API Layer

- AWS API Gateway

## Compute

- AWS Lambda

## Middleware

Preferred:
- Middy

## Validation

Preferred:
- Zod

Alternative:
- Joi

## Authentication & Authorization

Preferred:
- AWS Cognito

Authentication mechanisms:
- JWT
- OAuth2 where applicable

Authorization:
- Role-Based Access Control (RBAC)

## Event-Driven Services

Preferred AWS services:
- Amazon EventBridge
- Amazon SNS
- Amazon SQS

## Workflow Orchestration

Preferred:
- AWS Step Functions

Use when:
- Long-running workflows exist
- Human approvals are required
- Retry orchestration is necessary
- Multi-step distributed workflows exist

---

# Database Technologies

## Primary Database

Preferred:
- Amazon DynamoDB

## DynamoDB Standards

- Access-pattern-first design
- Avoid scans
- Prefer indexed queries
- Use TTL where applicable
- Single-table design only when justified

## Caching

Preferred:
- Amazon ElastiCache
- API-level caching where beneficial

## Object Storage

- Amazon S3

Use cases:
- File uploads
- Static assets
- Document storage
- Backup storage

---

# Infrastructure Technologies

## Infrastructure as Code

Preferred:
- AWS CDK


## Cloud Platform

- AWS mandatory

## Deployment Strategy

Preferred:
- Multi-environment deployments
- Immutable deployments
- Blue/green or canary deployments

## Environment Isolation

Required environments:
- Development
- QA/Test
- Production

---

# CI/CD Technologies

## Source Control

- GitHub

## CI/CD Platform

Preferred:
- GitHub Actions

## CI/CD Requirements

Pipelines must include:
- Type checking
- Lint validation
- Unit testing
- Integration testing
- Security scanning
- Infrastructure validation
- Deployment automation

## Mobile Deployment

Android:
- Play Store pipeline automation

iOS:
- App Store deployment automation

Preferred tooling:
- Expo EAS
- Fastlane where required

---

# Code Quality & Developer Experience

## Linting

- ESLint mandatory

## Formatting

- Prettier mandatory

## Git Hooks

Preferred:
- Husky

## Commit Standards

Preferred:
- Conventional Commits

## Monorepo Tooling

Preferred:
- Turborepo

Alternative:
- Nx

## Package Management

Preferred:
- pnpm

---

# Testing Technologies

## Unit Testing

Frontend:
- Vitest

Backend:
- Jest or Vitest

## Component Testing

- React Testing Library
- React Native Testing Library

## API Testing

- Supertest

## End-to-End Testing

Web:
- Playwright

Mobile:
- Detox

## Performance Testing

Preferred:
- k6

---

# Security Technologies

## Secrets Management

Preferred:
- AWS Secrets Manager

Alternative:
- AWS Systems Manager Parameter Store

## API Protection

- AWS WAF
- Rate limiting
- JWT validation
- Input validation

## Dependency Security

Preferred tooling:
- Dependabot
- Snyk
- GitHub Advanced Security where available

---

# Observability Technologies

## Logging

- AWS CloudWatch Logs

Logging requirements:
- Structured JSON logs
- Correlation IDs mandatory

## Metrics

- CloudWatch Metrics

## Tracing

Preferred:
- AWS X-Ray

## Monitoring

Preferred:
- CloudWatch Alarms
- Centralized dashboards

---

# AI-Assisted Development Tooling

## AI Development Workflow

The project supports:
- AI-assisted coding
- AI-assisted testing
- AI-assisted code reviews
- AI-assisted documentation generation

## AI Governance

AI-generated code must:
- Follow coding standards
- Include tests
- Pass CI/CD checks
- Be reviewed by engineers
- Avoid hallucinated implementations

## Recommended AI Engineering Practices

- Prompt templates for consistency
- Reusable steering files
- Architecture-aware prompting
- Security-aware prompting
- Test-first AI generation

---

# Shared Cross-Platform Standards

## Shared Libraries

Preferred shared packages:
- Shared types
- Shared validation schemas
- Shared API contracts
- Shared utilities
- Shared business logic

## Design System

The project should maintain:
- Shared design tokens
- Shared typography system
- Shared component patterns
- Shared accessibility standards

## API Consistency

All platforms must:
- Consume standardized APIs
- Follow consistent authentication flows
- Use shared error handling models

---

# Performance Standards

## Frontend

Applications should:
- Lazy load large modules
- Optimize bundle size
- Reduce unnecessary renders
- Cache server state intelligently

## Mobile

Applications should:
- Minimize startup time
- Reduce battery usage
- Handle low-memory devices gracefully
- Support intermittent connectivity

## Backend

Services should:
- Minimize Lambda cold starts
- Reuse connections where possible
- Optimize DynamoDB access patterns
- Avoid synchronous bottlenecks
