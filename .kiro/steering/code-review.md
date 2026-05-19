---
inclusion: always
---

# Code Review Standards

## Purpose

The code review process exists to ensure:
- High engineering quality
- Security compliance
- Maintainability
- Scalability
- Architectural consistency
- Production readiness

Code reviews are mandatory for:
- Web applications
- Android applications
- iOS applications
- Backend APIs
- Infrastructure as Code
- Shared libraries
- CI/CD workflows

No production code may be merged without review approval.

---

# Core Review Principles

## Review the System, Not Just the Code

Reviewers must evaluate:
- Business impact
- Architectural alignment
- Operational implications
- Security implications
- Scalability concerns
- Maintainability impact

---

## Maintainability First

Code should prioritize:
- Readability
- Simplicity
- Consistency
- Long-term maintainability

Avoid approving:
- Clever but unclear implementations
- Excessive abstraction
- Over-engineered solutions

---

## Shared Ownership

Code quality is:
- A team responsibility
- Not limited to the original author

Reviewers are expected to:
- Improve engineering quality
- Share knowledge
- Maintain consistency
- Protect platform integrity

---

# Pull Request Requirements

## Mandatory PR Information

Every PR must include:
- Clear title
- Summary of changes
- Business purpose
- Testing evidence
- Deployment considerations if applicable

---

## UI Changes

PRs affecting UI must include:
- Screenshots
- Mobile screenshots where applicable
- Responsive behavior validation
- Accessibility considerations

For mobile apps:
- Android screenshots
- iOS screenshots
- Device compatibility notes

---

## Infrastructure Changes

Infrastructure PRs must include:
- Deployment impact
- Rollback strategy
- Environment impact
- Security considerations
- Cost considerations

---

# Pull Request Size Standards

## Preferred PR Size

Preferred:
- Small focused PRs

Target:
- Under 500 changed lines where practical

---

## Avoid Large PRs

Large PRs reduce:
- Review quality
- Review speed
- Change traceability

Split large work into:
- Incremental changes
- Feature slices
- Independent deliverables

---

# Review Categories

## 1. Architecture Review

Reviewers must validate:
- Alignment with existing architecture
- Proper layering
- Proper separation of concerns
- Reusability opportunities
- Shared library usage
- API consistency

### Backend Validation

Validate:
- Thin Lambda handlers
- Business logic separation
- Event-driven design compliance
- Idempotency support
- Retry handling

### Frontend Validation

Validate:
- Component modularity
- State management correctness
- Rendering efficiency
- Reusable UI patterns

### Mobile Validation

Validate:
- Cross-platform compatibility
- Platform-specific behavior handling
- Offline handling
- Device responsiveness

---

## 2. Code Quality Review

Reviewers must validate:
- Readability
- Naming quality
- Function size
- Component complexity
- Proper typing
- Code consistency

Avoid approving:
- Deep nesting
- Duplicate logic
- Large monolithic components
- Unclear abstractions

---

## 3. Security Review

Security validation is mandatory.

Reviewers must verify:
- Input validation
- Authorization enforcement
- Authentication handling
- Secrets protection
- Secure API behavior
- Secure storage usage

### Never Approve

- Hardcoded secrets
- Insecure token handling
- Missing authorization checks
- Sensitive logging
- Unsafe dependency usage

---

# Mobile Security Validation

For Android and iOS applications:
- Validate secure token storage
- Validate permission handling
- Validate secure deep linking
- Validate protection of local data

---

## 4. Performance Review

Reviewers must validate:
- Efficient rendering
- Efficient API usage
- Database query efficiency
- Lambda execution efficiency
- Mobile responsiveness

### Backend Performance Checks

Validate:
- Avoidance of unnecessary scans
- Efficient DynamoDB access
- Minimal cold-start impact
- Proper async handling

### Frontend Performance Checks

Validate:
- Memoization where justified
- Avoidance of unnecessary re-renders
- Lazy loading implementation
- Bundle optimization awareness

### Mobile Performance Checks

Validate:
- Startup performance
- Battery efficiency
- Network optimization
- Low-memory handling

---

## 5. Testing Review

Reviewers must verify:
- Appropriate test coverage
- Edge case validation
- Error scenario coverage
- Regression protection

### Mandatory Validation

Ensure:
- Tests pass
- Critical logic is tested
- APIs are validated
- UI behaviors are tested

---

## 6. Observability Review

Reviewers must verify:
- Structured logging
- Correlation IDs
- Proper error tracking
- Monitoring compatibility

Critical workflows should expose:
- Logs
- Metrics
- Traces

---

# TypeScript Review Standards

Reviewers must validate:
- Strict typing
- Minimal type assertions
- Avoidance of any
- Proper interface usage
- Strong API contracts

Never approve:
```ts id="h2wq9f"
const data: any = response;