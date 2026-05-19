---
inclusion: always
---

# Testing Standards

## Purpose

Testing standards ensure:
- Product reliability
- Platform stability
- Production readiness
- Regression prevention
- Secure deployments
- Cross-platform consistency

Testing is mandatory for:
- Web applications
- Android applications
- iOS applications
- Backend APIs
- Shared libraries
- Infrastructure workflows

No production deployment is allowed without passing required test gates.

---

# Testing Philosophy

## Quality Ownership

Quality is a shared responsibility across:
- Developers
- QA engineers
- Reviewers
- DevOps engineers
- Product teams

Testing is not only a QA responsibility.

---

## Shift-Left Testing

Testing must begin:
- During design
- During development
- During pull requests
- Before deployment

Avoid relying solely on post-development QA validation.

---

## Automation First

Prefer:
- Automated tests
- Repeatable validation
- CI-integrated testing

Manual testing should focus on:
- Exploratory validation
- UX validation
- Edge-case exploration

---

# Testing Pyramid

The platform should follow the testing pyramid:

```text id="vzjlwm"
                E2E Tests
           Integration Tests
               Unit Tests