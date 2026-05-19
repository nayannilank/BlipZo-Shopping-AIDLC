---
inclusion: always
---

# Coding Standards

## Purpose

These standards define the mandatory engineering conventions for:
- Web applications
- Android applications
- iOS applications
- Backend APIs
- AWS serverless infrastructure
- Shared libraries

The goal is to ensure:
- Readability
- Maintainability
- Scalability
- Security
- Consistency
- AI-assisted development compatibility

---

# Core Engineering Principles

## Readability First

Code must prioritize:
- Clarity over cleverness
- Simplicity over unnecessary abstraction
- Explicit behavior over implicit behavior

Prefer:
- Small focused functions
- Clear naming
- Predictable structure

Avoid:
- Deeply nested logic
- Over-engineering
- Unnecessary indirection
- Magic values

---

# General Standards

## Single Responsibility Principle

Each:
- Function
- Component
- Service
- Module

should have one clear responsibility.

---

## DRY Principles

Avoid duplicated:
- Logic
- Validation rules
- API contracts
- Constants
- Utility functions

Extract reusable functionality into shared packages where appropriate.

---

## KISS Principle

Prefer:
- Straightforward implementations
- Easily understandable flows
- Minimal complexity

Avoid:
- Premature optimization
- Complex inheritance structures
- Overly generic abstractions

---

# TypeScript Standards

## Strict Mode

TypeScript strict mode is mandatory.

Required:
- strict: true
- noImplicitAny: true
- strictNullChecks: true

---

## Type Safety

Avoid:
- any
- unknown without narrowing
- type assertions unless justified

Prefer:
- Explicit interfaces
- Type-safe contracts
- Discriminated unions
- Strongly typed APIs

---

## Function Typing

All exported functions must include:
- Explicit parameter types
- Explicit return types

Example:

```ts
export async function createUser(
  payload: CreateUserRequest
): Promise<UserResponse> {
  ...
}