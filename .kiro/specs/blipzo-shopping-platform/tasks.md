# Implementation Plan: BlipZo Shopping Platform

## Overview

Full-stack implementation of the BlipZo cloud-native e-commerce platform. The plan follows a bottom-up order: monorepo scaffolding → AWS CDK infrastructure → shared package → backend Lambda services (Auth → Product → Catalogue → Wishlist → Cart → Address → Payment → Order) → Web application → Mobile application → CI/CD pipeline → Integration and E2E tests. Each task builds on the previous, ending with all components wired together and verified.

## Tasks

- [x] 1. Monorepo scaffolding
  - [x] 1.1 Initialise Turborepo + pnpm workspace
    - Create root `package.json` with `"private": true` and pnpm workspace config
    - Create `pnpm-workspace.yaml` listing `apps/*`, `packages/*`, `services/*`, `infra/*`
    - Create `turbo.json` with `build`, `typecheck`, `lint`, `test:unit`, `test:property`, `test:integration` pipeline tasks and correct `dependsOn` / `outputs`
    - Add root `.nvmrc` / `.node-version` pinned to Node 22
    - _Requirements: 17.1, 17.3_

  - [x] 1.2 Configure ESLint, Prettier, and Husky
    - Add root `eslint.config.mjs` with TypeScript strict rules and import-order plugin
    - Add `.prettierrc` and `.prettierignore`
    - Install and configure Husky with a `pre-commit` hook running `pnpm turbo lint typecheck`
    - Add `lint-staged` config to scope linting to changed files
    - _Requirements: 17.3_

  - [x] 1.3 Configure root TypeScript
    - Create root `tsconfig.base.json` with `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `target: ES2022`, `module: NodeNext`
    - Ensure all workspace packages extend this base config
    - _Requirements: 17.1_

- [x] 2. AWS CDK infrastructure
  - [x] 2.1 Bootstrap CDK project and root stack
    - Scaffold `infra/cdk/` with `bin/blipzo.ts`, `cdk.json`, and `tsconfig.json`
    - Create `BlipzoStack.ts` as the root stack that accepts `stageName` and composes nested stacks
    - Loop over `['dev', 'qa', 'prod']` in `bin/blipzo.ts` to instantiate one stack per environment
    - _Requirements: 17.1, 17.2_

  - [x] 2.2 Implement AuthStack (Cognito)
    - Create `AuthStack.ts` with a Cognito User Pool matching the design spec: email + phone sign-in aliases, password policy (min 8, uppercase, lowercase, digit), custom attributes (`custom:role`, `custom:failedAttempts`, `custom:lockUntil`), `AdvancedSecurityMode.ENFORCED`
    - Create a Cognito User Pool Client with `ALLOW_USER_PASSWORD_AUTH` and `ALLOW_REFRESH_TOKEN_AUTH`
    - Export `userPool` and `userPoolClient` as stack outputs
    - _Requirements: 1.1, 2.1, 3.1, 17.1, 17.4_

  - [x] 2.3 Implement DatabaseStack (DynamoDB tables)
    - Create `BlipzoTable` reusable CDK construct with encryption at rest, TTL attribute support, and point-in-time recovery enabled
    - Create all tables: `blipzo-{env}-otp` (PK only, TTL on `expiresAt`), `blipzo-{env}-products` (PK+SK, GSI1-CategoryByDate, GSI2-SellerProducts), `blipzo-{env}-wishlists` (PK+SK), `blipzo-{env}-carts` (PK+SK), `blipzo-{env}-orders` (PK+SK, GSI1-BuyerOrders), `blipzo-{env}-return-exchange-requests` (PK+SK, GSI1-OrderRequests), `blipzo-{env}-addresses` (PK+SK), `blipzo-{env}-payments` (PK+SK)
    - Export all table ARNs and names
    - _Requirements: 15.5, 17.1, 17.2_

  - [x] 2.4 Implement StorageStack (S3)
    - Create `blipzo-{env}-product-images` S3 bucket with `BlockPublicAccess.BLOCK_ALL`, S3-managed encryption, and a 365-day lifecycle rule
    - Export bucket ARN and name
    - _Requirements: 5.8, 17.1_

  - [x] 2.5 Implement ApiStack (API Gateway)
    - Create a REST API with CORS pre-flight options, X-Ray tracing enabled, INFO-level access logging, and metrics enabled
    - Attach a `CognitoUserPoolsAuthorizer` using the User Pool from AuthStack
    - Define all resource paths and methods for Auth, Product, Catalogue, Wishlist, Cart, Order, Address services with correct authorizer and auth type per the API design table
    - _Requirements: 4.1, 4.2, 4.3, 17.1_

  - [x] 2.6 Implement LambdaStack (Lambda functions + IAM)
    - Create `SecureLambda` reusable CDK construct: Node.js 22 runtime, X-Ray active tracing, structured log group with 90-day retention, environment variables for table names and secret ARNs (never values)
    - Create one Lambda function per service (auth, product, catalogue, wishlist, cart, order, address, payment) using `SecureLambda`
    - Attach least-privilege IAM policies per the IAM design table (no wildcard actions or resources)
    - Wire each Lambda to its API Gateway resource/method
    - _Requirements: 15.3, 16.3, 17.1, 17.4, 17.5_

  - [x] 2.7 Implement ObservabilityStack (CloudWatch + X-Ray)
    - Create CloudWatch log groups for each Lambda (`/aws/lambda/blipzo-{env}-{service}`)
    - Create CloudWatch Alarms: `PaymentFailureCount > 10` in 5 min, `CatalogueResponseLatency p99 > 2000ms`, Lambda error rate > 1%
    - Create an SNS topic for alarm notifications and subscribe a placeholder email
    - Create a CloudWatch dashboard with widgets for order success rate, payment failure rate, and catalogue latency
    - _Requirements: 16.1, 16.3, 16.4_

  - [ ]\* 2.8 Verify CDK synth produces valid CloudFormation for all three environments
    - Run `cdk synth` for dev, qa, and prod stacks and assert zero synthesis errors
    - _Requirements: 17.1, 17.2_

- [x] 3. Shared package (`packages/shared`)
  - [x] 3.1 Scaffold shared package and TypeScript types
    - Create `packages/shared/` with its own `package.json` (`name: @blipzo/shared`), `tsconfig.json` extending root base, and `src/index.ts` barrel export
    - Write TypeScript interfaces in `src/types/`: `auth.ts`, `product.ts`, `catalogue.ts`, `wishlist.ts`, `cart.ts`, `order.ts`, `address.ts`, `payment.ts`, `errors.ts` — matching all interfaces defined in the design document
    - _Requirements: 18.4_

  - [x] 3.2 Implement Zod validation schemas
    - Write Zod schemas in `src/schemas/` for: `auth.schema.ts` (register, login, OTP request/verify), `product.schema.ts` (create, update, policy), `catalogue.schema.ts` (list request, search request), `wishlist.schema.ts`, `cart.schema.ts`, `order.schema.ts` (checkout, return/exchange), `address.schema.ts`
    - Ensure all field constraints match requirements exactly (e.g., password 8–128 chars with uppercase/lowercase/digit, price > 0 and ≤ 9999999.99, E.164 phone)
    - Export all schemas from `src/index.ts`
    - _Requirements: 1.1, 1.4, 5.1, 5.2, 9.1, 9.2_

  - [ ]\* 3.3 Write property tests for shared Zod schemas
    - **Property 3: Invalid passwords are rejected with specific errors**
    - **Property 12: Invalid product fields are rejected with field-specific errors**
    - **Validates: Requirements 1.4, 5.2, 5.7**

  - [ ]\* 3.4 Write unit tests for shared schemas
    - Test all valid boundary values (min/max lengths, min/max prices, valid E.164 formats)
    - Test all invalid boundary values (empty strings, price = 0, price > 9999999.99, phone without `+`)
    - _Requirements: 1.1, 1.4, 5.1, 9.1_

- [x] 4. Auth_Service Lambda
  - [x] 4.1 Scaffold auth-service and implement registration handler
    - Create `services/auth-service/` with `package.json`, `tsconfig.json`, `src/handler.ts`, `src/service.ts`, `src/validators.ts`, `src/errors.ts`
    - Install Middy (`@middy/core`, `@middy/http-json-body-parser`, `@middy/http-error-handler`, `@middy/correlation-ids`) and AWS SDK v3 Cognito client
    - Implement `POST /auth/register`: validate with `registerSchema` from `@blipzo/shared`, call `AdminCreateUser` on Cognito, set `custom:role` attribute, return `201 { userId, message }`
    - Map Cognito `UsernameExistsException` → `409 CONFLICT`; `ServiceUnavailableException` → `503 SERVICE_UNAVAILABLE`
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7_

  - [ ]\* 4.2 Write property tests for registration
    - **Property 1: Registration creates a retrievable account with the correct role**
    - **Property 2: Duplicate registration is rejected**
    - **Property 3: Invalid passwords are rejected with specific errors**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.7**

  - [x] 4.3 Implement email/password login with account lockout
    - Implement `POST /auth/login`: validate with `loginSchema`, read `custom:lockUntil` from Cognito; if locked return `423 ACCOUNT_LOCKED`
    - Call `AdminInitiateAuth` with `USER_PASSWORD_AUTH`; on success reset `custom:failedAttempts` to 0 and return `AuthResponse` (accessToken, refreshToken, userId, role)
    - On `NotAuthorizedException` or `UserNotFoundException` increment `custom:failedAttempts`; after 5 failures within 15 min set `custom:lockUntil = now + 15 min`; always return generic `401 INVALID_CREDENTIALS`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]\* 4.4 Write property tests for login and lockout
    - **Property 4: Successful login returns a JWT with correct claims and bounded expiry**
    - **Property 5: Invalid credentials return a generic error without revealing which field is wrong**
    - **Property 6: Locked accounts reject all login attempts**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 4.4**

  - [x] 4.5 Implement OTP request and verify handlers
    - Implement `POST /auth/otp/request`: validate E.164 phone, check user exists in Cognito, generate 6-digit numeric OTP, write to `blipzo-{env}-otp` table with `expiresAt = now + 600s` TTL and `attemptCount = 0`, log OTP to CloudWatch (dev/qa only)
    - Implement `POST /auth/otp/verify`: read OTP record, check `used`, check `expiresAt`, check `attemptCount < 3`; on success mark `used = true` and return `AuthResponse`; on failure increment `attemptCount`; after 3 failures delete OTP record
    - Implement `POST /auth/token/refresh`: call Cognito `InitiateAuth` with `REFRESH_TOKEN_AUTH` and return new `accessToken`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]\* 4.6 Write property tests for OTP flow
    - **Property 7: OTP is a 6-digit numeric code with a 10-minute TTL**
    - **Property 8: OTP verification is a one-time operation (round trip)**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]\* 4.7 Write unit tests for auth-service
    - Test Cognito error mapping (all error types in the design mapping table)
    - Test lockout counter increment and reset logic
    - Test OTP expiry and attempt-count invalidation
    - _Requirements: 2.2, 2.3, 3.3, 3.4_

- [x] 5. Checkpoint — Auth service
  - Ensure all auth-service unit and property tests pass. Verify `cdk synth` still succeeds. Ask the user if questions arise.

- [ ] 6. Product_Service Lambda
  - [x] 6.1 Scaffold product-service and implement product creation
    - Create `services/product-service/` with standard Middy handler structure
    - Implement `POST /products`: validate with `createProductSchema`, generate pre-signed S3 PUT URLs for each image, write product record to DynamoDB only after all uploads are confirmed; if any S3 upload fails return `503` and write nothing to DynamoDB
    - Set `GSI1PK = CATEGORY#{primaryCategory}`, `GSI1SK = CREATED#{createdAt}`, `GSI2PK = SELLER#{sellerId}`, `GSI2SK = CREATED#{createdAt}`, `searchTokens = lowercase(name + ' ' + description)`
    - Return `201` with full `ProductRecord`
    - _Requirements: 5.1, 5.2, 5.8_

  - [ ] 6.2 Write property tests for product creation
    - **Property 11: Valid product creation persists all fields and returns a unique ID**
    - **Property 12: Invalid product fields are rejected with field-specific errors**
    - **Property 15: S3 upload failure prevents partial product creation (atomicity)**
    - **Validates: Requirements 5.1, 5.2, 5.8**

  - [x] 6.3 Implement product update and delete handlers
    - Implement `PATCH /products/{productId}`: read product, assert `sellerId === requestingUserId` (else `403`), validate supplied fields with `updateProductSchema`, apply partial update to DynamoDB using `UpdateExpression` for only supplied fields, return updated `ProductRecord`
    - Implement `DELETE /products/{productId}`: read product, assert ownership, set `isDeleted = true` in DynamoDB, return `200`
    - Implement `GET /products/seller/me`: query GSI2 with `SELLER#{sellerId}`, return paginated list
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]\* 6.4 Write property tests for product ownership and partial update
    - **Property 13: Sellers cannot modify products owned by other sellers**
    - **Property 14: Product update modifies only the supplied fields**
    - **Validates: Requirements 5.4, 5.5, 5.6**

  - [x] 6.5 Implement Seller_Policy handler
    - Implement `POST /products/{productId}/policy`: assert product ownership, validate `sellerPolicySchema` (returnWindowDays 0–30, exchangeAllowed boolean, optional conditions string), write `sellerPolicy` map onto the product DynamoDB item with a new `policyVersion` UUID and `createdAt` timestamp
    - Return `200` with updated `ProductRecord` including `sellerPolicy`
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [ ]\* 6.6 Write unit tests for product-service
    - Test validation errors for each invalid field (price = 0, name empty, image > 10 MB, > 10 images)
    - Test soft-delete does not physically remove the DynamoDB item
    - Test policy update stores new `policyVersion` UUID
    - _Requirements: 5.2, 5.3, 14.1_

- [x] 7. Catalogue_Service Lambda
  - [x] 7.1 Scaffold catalogue-service and implement category browsing
    - Create `services/catalogue-service/` with standard Middy handler structure (read-only DynamoDB access)
    - Implement `GET /catalogue/categories`: scan the Categories table and return all category IDs and names
    - Implement `GET /catalogue/categories/{categoryId}`: validate `categoryId` exists, query GSI1 with `PK = CATEGORY#{categoryId}`, filter `isDeleted = false`, apply cursor-based pagination (base64-encode `LastEvaluatedKey`), return `CatalogueListResponse`
    - Return `404` for unknown category, `200` with empty list when no products exist
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.7_

  - [ ]\* 7.2 Write property tests for catalogue pagination
    - **Property 16: Catalogue returns only active products sorted by creation date descending**
    - **Property 17: Catalogue pagination stays within bounds and cursors are consistent**
    - **Validates: Requirements 6.1, 6.5**

  - [x] 7.3 Implement product detail and search handlers
    - Implement `GET /catalogue/products/{productId}`: `GetItem` by `PRODUCT#{productId}`, return `404` if not found or `isDeleted = true`, else return full product detail including `sellerPolicy` summary
    - Implement `GET /catalogue/search`: validate `q` (1–100 non-whitespace chars), query GSI1 with `FilterExpression contains(searchTokens, lowercase(q))`, apply pagination, return `CatalogueListResponse`
    - _Requirements: 6.2, 6.3, 6.6, 6.7_

  - [ ]\* 7.4 Write property tests for search correctness
    - **Property 18: Search returns only active products matching the query case-insensitively**
    - **Validates: Requirements 6.6**

  - [ ]\* 7.5 Write unit tests for catalogue-service
    - Test `404` for deleted product detail request
    - Test empty-list `200` response when no products match category or search
    - Test cursor decoding/encoding round trip
    - _Requirements: 6.3, 6.4, 6.7_

- [x] 8. Wishlist_Service Lambda
  - [x] 8.1 Scaffold wishlist-service and implement add/remove/get handlers
    - Create `services/wishlist-service/` with standard Middy handler structure
    - Implement `GET /wishlist`: query `blipzo-{env}-wishlists` with `PK = BUYER#{buyerId}`, batch-get product details from Products table, enrich each item with `name`, `price`, `primaryImageUrl`, `isAvailable` (false if `isDeleted = true`)
    - Implement `POST /wishlist/items`: verify product exists in Products table (else `404`), use `TransactWriteItems` to check counter item `SK=COUNT < 200` and `PutItem` the wishlist entry atomically; if already present return current wishlist unchanged
    - Implement `DELETE /wishlist/items/{productId}`: `DeleteItem` (idempotent — no error if not present), return updated wishlist
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_

  - [ ]\* 8.2 Write property tests for wishlist invariants
    - **Property 19: Wishlist add/remove is a round trip**
    - **Property 20: Wishlist add is idempotent (no duplicates)**
    - **Property 21: Wishlist remove is idempotent**
    - **Property 22: Wishlist capacity is enforced at 200 items**
    - **Property 23: Deleted products in wishlist are marked unavailable, not removed**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.5, 7.6, 7.8**

  - [ ]\* 8.3 Write unit tests for wishlist-service
    - Test `401` for unauthenticated requests
    - Test `404` when adding a non-existent product
    - Test enrichment marks deleted product as `isAvailable: false`
    - _Requirements: 7.4, 7.8, 7.9_

- [ ] 9. Cart_Service Lambda
  - [x] 9.1 Scaffold cart-service and implement cart handlers
    - Create `services/cart-service/` with standard Middy handler structure
    - Implement `PUT /cart/items`: validate `quantity` (0–999); if `quantity = 0` call `DeleteItem`; else verify product exists and `quantity ≤ stockQuantity` (else `400 INSUFFICIENT_STOCK`), `PutItem` replacing existing entry
    - Implement `GET /cart`: query `blipzo-{env}-carts` with `PK = BUYER#{buyerId}`, batch-get product details, compute `subtotal = round(price * quantity, 2)` per item and `total = round(sum(subtotals), 2)`, return `CartResponse`
    - Implement `DELETE /cart/items/{productId}`: `DeleteItem`, return updated cart
    - Implement `DELETE /cart`: `BatchWriteItem` to delete all items for buyer, return empty cart
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [ ]\* 9.2 Write property tests for cart invariants
    - **Property 24: Cart quantity replacement (not accumulation)**
    - **Property 25: Cart totals are correctly calculated and rounded**
    - **Property 26: Cart stock validation prevents over-ordering**
    - **Validates: Requirements 8.2, 8.4, 8.5**

  - [ ]\* 9.3 Write unit tests for cart-service
    - Test `quantity = 0` removes item
    - Test `401` for unauthenticated requests
    - Test `404` for non-existent product
    - Test clear cart returns empty `CartResponse`
    - _Requirements: 8.3, 8.7, 8.8_

- [x] 10. Address_Service Lambda
  - [x] 10.1 Scaffold address-service and implement CRUD handlers
    - Create `services/address-service/` with standard Middy handler structure
    - Implement `POST /addresses`: validate with `addressSchema` (fullName, E.164 phone, line1, city, state, postalCode, country), `PutItem` with `PK = BUYER#{buyerId}`, `SK = ADDRESS#{uuid}`, return `201` with `AddressRecord`
    - Implement `GET /addresses`: query by `PK = BUYER#{buyerId}`, return all addresses
    - Implement `PATCH /addresses/{addressId}`: assert ownership (`GetItem` and check `buyerId`), validate supplied fields, `UpdateExpression` for changed fields only, return updated address
    - Implement `DELETE /addresses/{addressId}`: assert ownership, `DeleteItem`, return `200`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.7_

  - [x] 10.2 Implement default address handler
    - Implement `POST /addresses/{addressId}/default`: use `TransactWriteItems` to set `isDefault = true` on the target address and `isDefault = false` on the previously default address in a single atomic write
    - _Requirements: 9.6_

  - [ ]\* 10.3 Write property tests for address invariants
    - **Property 27: Default address invariant — exactly one default per buyer**
    - **Property 28: Address ownership is enforced**
    - **Validates: Requirements 9.6, 9.7**

  - [ ]\* 10.4 Write unit tests for address-service
    - Test validation errors for missing required fields and invalid E.164 phone
    - Test `404` for update/delete of address owned by another buyer
    - _Requirements: 9.2, 9.7_

- [x] 11. Payment_Service Lambda
  - [x] 11.1 Scaffold payment-service and implement mock payment handler
    - Create `services/payment-service/` with standard Middy handler structure (invoked Lambda-to-Lambda, no API Gateway route)
    - Implement `processPayment(PaymentRequest): Promise<PaymentResponse>`: for UPI/CreditCard/DebitCard return `{ success: true, transactionId: uuid(), paymentStatus: 'Paid' }`; for CashOnDelivery return `{ success: true, paymentStatus: 'Pending' }`; for unsupported method throw `400 VALIDATION_ERROR`
    - Write `PaymentRecord` to `blipzo-{env}-payments` table with `orderId`, `method`, `status`, `transactionId` — never write `mockCardLast4`, `mockUpiRef`, or any credential field
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]\* 11.2 Write unit tests for payment-service
    - Test each supported payment method returns correct `paymentStatus`
    - Test unsupported method returns `400`
    - Test DynamoDB write never includes card/UPI fields
    - _Requirements: 11.1, 11.2, 11.3, 11.5_

- [x] 12. Order_Service Lambda
  - [x] 12.1 Scaffold order-service and implement checkout handler
    - Create `services/order-service/` with standard Middy handler structure
    - Implement `POST /orders/checkout`: (1) validate `CheckoutRequest`; (2) query cart items; (3) batch-get product stock — if any item has `quantity > stockQuantity` return `400 INSUFFICIENT_STOCK` listing out-of-stock items; (4) invoke Payment Lambda via AWS SDK; (5) use `TransactWriteItems` to atomically create `OrderRecord` + decrement all stock quantities; (6) clear buyer cart via `BatchWriteItem`; (7) return `201` with `OrderRecord`
    - Set `paymentStatus = 'Paid'` for non-CoD, `'Pending'` for CoD; `orderStatus = 'Confirmed'`; snapshot delivery address from Address table
    - On payment failure return `402 PAYMENT_FAILED` with no side effects; on Payment Lambda unreachable return `503`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]\* 12.2 Write property tests for checkout atomicity and field persistence
    - **Property 29: Checkout is atomic — all steps succeed or none persist**
    - **Property 30: Checkout persists all required order fields**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.6**

  - [x] 12.3 Implement order history and detail handlers
    - Implement `GET /orders`: query GSI1 (`BUYER#{buyerId}`) with `ScanIndexForward=false`, support `limit` (1–100, default 20) and cursor pagination, return paginated `OrderRecord` summaries
    - Implement `GET /orders/{orderId}`: `GetItem`, assert `buyerId === requestingUserId` (else `404`), return full `OrderRecord`
    - _Requirements: 12.1, 12.2, 12.3_

  - [ ]\* 12.4 Write property tests for order history and ownership
    - **Property 31: Order history is paginated and sorted by timestamp descending**
    - **Property 32: Order ownership is enforced — buyers cannot see other buyers' orders**
    - **Validates: Requirements 12.1, 12.3**

  - [x] 12.5 Implement order cancellation handler
    - Implement `POST /orders/{orderId}/cancel`: assert ownership, check `orderStatus` is `Confirmed` or `Processing` (else `400 INVALID_STATUS`), update `orderStatus = 'Cancelled'`, invoke Payment Lambda mock refund for non-CoD orders; if refund succeeds set `refundStatus = 'Completed'`; if refund fails set `refundStatus = 'Pending'` (do not roll back cancellation)
    - _Requirements: 12.4, 12.5, 12.6_

  - [ ]\* 12.6 Write property tests for cancellation rules
    - **Property 33: Cancellation is only permitted for eligible order statuses**
    - **Property 34: Refund failure during cancellation sets refund status to Pending**
    - **Validates: Requirements 12.4, 12.5, 12.6**

  - [x] 12.7 Implement return/exchange request handlers
    - Implement `POST /orders/{orderId}/return-exchange`: assert ownership, assert `orderStatus = 'Delivered'`, read `sellerPolicy` from product record, check `returnWindowDays > 0` and request is within window (else `400`), create `ReturnExchangeRequest` record with `policyVersionAtRequest` snapshot, return `201` with `requestId`
    - Implement `GET /orders/return-exchange/{requestId}`: assert ownership, return `ReturnExchangeRequest` with current status and `sellerNotes`
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 14.3, 14.4_

  - [ ]\* 12.8 Write property tests for return/exchange eligibility
    - **Property 35: Return/exchange eligibility is determined by Seller_Policy at request time**
    - **Property 36: Policy updates do not retroactively affect pending return requests**
    - **Validates: Requirements 13.1, 13.2, 14.3, 14.4**

  - [ ]\* 12.9 Write unit tests for order-service
    - Test checkout with empty cart returns validation error
    - Test CoD sets `paymentStatus = 'Pending'` and `transactionId` is absent
    - Test cancellation of `Shipped` order returns `400`
    - Test return request for non-delivered order returns `400`
    - _Requirements: 10.1, 10.5, 12.6, 13.3_

- [x] 13. Checkpoint — All backend services
  - Ensure all service unit and property tests pass. Run `pnpm turbo typecheck` across all services. Ask the user if questions arise.

- [ ] 14. Observability middleware (all services)
  - [ ] 14.1 Implement structured logger Middy middleware
    - Create `packages/shared/src/middleware/logger.middleware.ts`: a Middy middleware that emits a structured JSON log entry on every request containing `correlationId` (from `@middy/correlation-ids`), `service`, `timestamp`, and `statusCode`
    - On unhandled error log `errorType` and `message` only — no stack trace, no JWT, no password, no payment credential
    - Apply middleware to all eight Lambda handlers
    - _Requirements: 16.1, 16.2_

  - [ ] 14.2 Implement CloudWatch custom metrics emission
    - Add `aws-embedded-metrics` to order-service, payment-service, and catalogue-service
    - Emit `OrderPlacementSuccess` metric on successful checkout, `PaymentFailureCount` on payment failure, `CatalogueResponseLatency` (duration in ms) on every catalogue response
    - _Requirements: 16.4_

  - [ ]\* 14.3 Write property tests for structured log correctness
    - **Property 37: Structured logs contain all required fields for every Lambda invocation**
    - **Property 38: Error logs do not contain stack traces or sensitive data**
    - **Validates: Requirements 16.1, 16.2**

- [ ] 15. Web application (`apps/web`)
  - [ ] 15.1 Scaffold web app with Vite + React 19 + Tailwind
    - Create `apps/web/` with Vite + React 19 + TypeScript template
    - Install and configure Tailwind CSS, React Router, Zustand, TanStack Query, React Hook Form, Zod, Axios
    - Create `src/api/client.ts`: Axios instance with `VITE_API_BASE_URL`, request interceptor attaching `Authorization: Bearer <token>`, response interceptor for 401 → token refresh → retry
    - Create Zustand stores: `auth.store.ts` (accessToken, refreshToken, userId, role — persisted to `localStorage`), `cart.store.ts` (optimistic cart state), `ui.store.ts` (offline indicator, modal state)
    - Add `navigator.onLine` listener in `ui.store.ts`; queue non-critical mutations for retry on reconnect
    - _Requirements: 18.1, 18.4, 18.5_

  - [ ] 15.2 Implement auth pages (Register, Login, OTP)
    - Create `src/pages/Auth/RegisterPage.tsx`: React Hook Form + Zod `registerSchema` from `@blipzo/shared`, role selector (Buyer/Seller), call `POST /auth/register`, redirect to login on success
    - Create `src/pages/Auth/LoginPage.tsx`: email/password form, call `POST /auth/login`, store tokens in `auth.store`, redirect to home
    - Create `src/pages/Auth/OtpPage.tsx`: phone input → `POST /auth/otp/request`; OTP input → `POST /auth/otp/verify`; store tokens on success
    - Implement protected route wrapper that redirects unauthenticated users to `/login`
    - _Requirements: 1.1, 2.1, 3.1, 3.2, 18.1_

  - [ ] 15.3 Implement catalogue pages (Home, Category, Product Detail, Search)
    - Create `src/pages/Home/HomePage.tsx`: display category list fetched via TanStack Query from `GET /catalogue/categories`
    - Create `src/pages/ProductDetail/ProductDetailPage.tsx`: fetch `GET /catalogue/products/{productId}`, display all product fields, seller policy summary, Add to Cart / Add to Wishlist buttons
    - Create `src/pages/Home/CategoryPage.tsx`: paginated product grid from `GET /catalogue/categories/{categoryId}` with infinite scroll or next-page button
    - Create search bar component calling `GET /catalogue/search?q=...` with debounce; display results in a paginated grid
    - _Requirements: 6.1, 6.2, 6.5, 6.6, 18.1_

  - [ ] 15.4 Implement wishlist page
    - Create `src/pages/Wishlist/WishlistPage.tsx`: fetch `GET /wishlist`, display enriched items with availability badge, Remove button calling `DELETE /wishlist/items/{productId}`
    - Add to Wishlist button on product detail calls `POST /wishlist/items` with optimistic update via TanStack Query mutation
    - _Requirements: 7.2, 7.5, 7.7, 18.1_

  - [ ] 15.5 Implement cart page and checkout flow
    - Create `src/pages/Cart/CartPage.tsx`: fetch `GET /cart`, display items with quantity controls (PUT /cart/items), line subtotals, cart total, Clear Cart button, Proceed to Checkout button
    - Create `src/pages/Checkout/CheckoutPage.tsx`: address selector (fetch `GET /addresses`), payment method selector (UPI/CreditCard/DebitCard/CoD), Order Summary, Place Order button calling `POST /orders/checkout`
    - On success redirect to order confirmation page showing `orderId` and status
    - _Requirements: 8.1, 8.5, 8.6, 10.1, 18.1_

  - [ ] 15.6 Implement orders pages (History, Detail, Cancel, Return/Exchange)
    - Create `src/pages/Orders/OrdersPage.tsx`: paginated order history from `GET /orders`, each row showing order ID, date, total, status
    - Create `src/pages/Orders/OrderDetailPage.tsx`: full order detail, Cancel button (visible for Confirmed/Processing), Return/Exchange button (visible for Delivered)
    - Implement cancel flow: `POST /orders/{orderId}/cancel`, show refund status
    - Implement return/exchange form: type selector (Return/Exchange), submit `POST /orders/{orderId}/return-exchange`, show request ID
    - _Requirements: 12.1, 12.2, 12.4, 13.1, 18.1_

  - [ ] 15.7 Implement seller dashboard
    - Create `src/pages/SellerDashboard/` with route guard requiring `role === 'Seller'`
    - Product list page: fetch `GET /products/seller/me`, display with Edit and Delete actions
    - Add Product form: multi-step form with product fields + image upload (up to 10 files, validated client-side for size ≤ 10 MB and type JPEG/PNG/WebP), calls `POST /products`
    - Edit Product form: pre-populated with existing values, calls `PATCH /products/{productId}`
    - Policy configuration form: return window, exchange toggle, conditions, calls `POST /products/{productId}/policy`
    - _Requirements: 5.1, 5.3, 5.5, 14.1, 18.1_

  - [ ] 15.8 Implement address management page
    - Create `src/pages/Profile/AddressesPage.tsx`: list addresses, Add Address form (React Hook Form + `addressSchema`), Edit, Delete, Set Default actions
    - _Requirements: 9.1, 9.3, 9.4, 9.5, 9.6, 18.1_

  - [ ]\* 15.9 Write Vitest + React Testing Library unit tests for web components
    - Test auth forms: validation errors shown for invalid inputs, successful submit calls correct API
    - Test cart page: quantity update triggers PUT, subtotals and total render correctly
    - Test offline indicator renders when `navigator.onLine = false`
    - _Requirements: 18.1, 18.5_

  - [ ]\* 15.10 Write Playwright E2E tests for web critical flows
    - Registration → Login → Browse catalogue → Add to cart → Checkout flow
    - Seller: Login → Add product → Set policy
    - Viewport tests at 320px, 768px, 1280px, 1920px
    - _Requirements: 18.1_

- [ ] 16. Mobile application (`apps/mobile`)
  - [ ] 16.1 Scaffold mobile app with Expo + React Native + NativeWind
    - Create `apps/mobile/` using `npx create-expo-app` with TypeScript template
    - Install NativeWind, Zustand, TanStack Query, React Navigation (Stack + Bottom Tabs), Axios, `expo-secure-store`
    - Create `src/api/client.ts`: same Axios interceptor pattern as web; store tokens in `expo-secure-store` (never plain AsyncStorage)
    - Reuse Zustand store logic from `@blipzo/shared` where possible; adapt persistence layer to `expo-secure-store`
    - Configure `RootNavigator.tsx`, `BuyerTabs.tsx` (Home, Search, Cart, Orders, Profile), `SellerStack.tsx`
    - _Requirements: 18.2, 18.4, 18.5_

  - [ ] 16.2 Implement auth screens (Register, Login, OTP)
    - Create `src/screens/Auth/RegisterScreen.tsx`, `LoginScreen.tsx`, `OtpScreen.tsx` mirroring web auth flows using React Native form components and `@blipzo/shared` Zod schemas for validation
    - _Requirements: 1.1, 2.1, 3.1, 18.2_

  - [ ] 16.3 Implement catalogue screens (Home, Category, Product Detail, Search)
    - Create `src/screens/Home/HomeScreen.tsx`: category grid using `FlatList`
    - Create `src/screens/Home/CategoryScreen.tsx`: paginated product list with `FlatList` + `onEndReached` for infinite scroll
    - Create `src/screens/ProductDetail/ProductDetailScreen.tsx`: full product detail, image carousel, Add to Cart / Wishlist buttons
    - Create `src/screens/Search/SearchScreen.tsx`: search bar with debounce, results `FlatList`
    - _Requirements: 6.1, 6.2, 6.5, 6.6, 18.2_

  - [ ] 16.4 Implement wishlist, cart, and checkout screens
    - Create `src/screens/Wishlist/WishlistScreen.tsx`: wishlist items with availability badge and remove action
    - Create `src/screens/Cart/CartScreen.tsx`: cart items with quantity stepper, subtotals, total, checkout button
    - Create `src/screens/Checkout/CheckoutScreen.tsx`: address picker, payment method picker, order summary, Place Order button
    - _Requirements: 7.7, 8.5, 10.1, 18.2_

  - [ ] 16.5 Implement orders and address screens
    - Create `src/screens/Orders/OrdersScreen.tsx` and `OrderDetailScreen.tsx` with cancel and return/exchange flows
    - Create `src/screens/Profile/AddressesScreen.tsx` with full CRUD and default address selection
    - _Requirements: 12.1, 12.4, 13.1, 9.1, 18.2_

  - [ ] 16.6 Implement seller dashboard screens
    - Create `src/screens/SellerDashboard/` with product list, add/edit product forms (including image picker using `expo-image-picker`), and policy configuration form
    - _Requirements: 5.1, 5.5, 14.1, 18.2_

  - [ ]\* 16.7 Write React Native Testing Library unit tests for mobile screens
    - Test auth screens: validation errors for invalid inputs
    - Test cart screen: quantity update and total recalculation
    - Test offline banner renders when network is unavailable
    - _Requirements: 18.2, 18.5_

  - [ ]\* 16.8 Write Detox E2E tests for Android critical flows
    - Registration → Login → Browse → Add to cart → Checkout on Android emulator (API 26+)
    - _Requirements: 18.2_

- [ ] 17. Checkpoint — Web and Mobile applications
  - Ensure all web and mobile unit tests pass. Verify `pnpm turbo typecheck` passes across all apps. Ask the user if questions arise.

- [ ] 18. CI/CD pipeline (GitHub Actions)
  - [ ] 18.1 Create validate workflow
    - Create `.github/workflows/ci.yml` triggered on `push` to `main` and all `pull_request` events
    - Steps: `actions/checkout@v4`, `pnpm/action-setup@v3`, `pnpm install --frozen-lockfile`, `pnpm turbo typecheck`, `pnpm turbo lint`, `pnpm turbo test:unit`, `pnpm turbo test:property`, `pnpm turbo test:integration`
    - Cache pnpm store using `actions/cache` keyed on `pnpm-lock.yaml` hash
    - _Requirements: 17.3_

  - [ ] 18.2 Create deploy-dev job
    - Add `deploy-dev` job to `ci.yml` with `needs: validate` and `if: github.ref == 'refs/heads/main'`
    - Steps: `pnpm turbo build`, `cd infra/cdk && npx cdk deploy BlipzoStack-dev --require-approval never`
    - Configure AWS credentials via `aws-actions/configure-aws-credentials` using GitHub OIDC (no long-lived access keys)
    - _Requirements: 17.2, 17.3, 17.4_

  - [ ] 18.3 Add security scanning step
    - Add `pnpm audit --audit-level=high` step to the validate job to fail the pipeline on high-severity dependency vulnerabilities
    - Add `cdk synth` step to validate CloudFormation output before deploy
    - _Requirements: 17.3_

  - [ ]\* 18.4 Write unit tests for Turborepo pipeline configuration
    - Verify `turbo.json` pipeline tasks have correct `dependsOn` and `outputs` by running `pnpm turbo run build --dry-run` and asserting expected task graph
    - _Requirements: 17.3_

- [ ] 19. Integration tests and E2E tests
  - [ ] 19.1 Write backend integration tests (Vitest + AWS SDK)
    - Create `tests/integration/` at repo root
    - Auth flow: register → login → verify JWT claims → refresh token
    - Product flow: create product → update product → delete product → verify soft-delete
    - Catalogue flow: browse category → paginate → search
    - Wishlist flow: add → get (enriched) → remove → verify idempotent remove
    - Cart flow: add items → get cart with totals → clear cart
    - Address flow: create → set default → verify single default invariant → delete
    - Checkout flow: add to cart → checkout → verify order record → cancel → verify refund status
    - Return/exchange flow: checkout → (simulate delivery) → submit return request → verify policy snapshot
    - _Requirements: 15.1, 15.2, 17.3_

  - [ ] 19.2 Write API Gateway RBAC integration tests
    - Test Buyer JWT on Seller-only endpoints returns `403`
    - Test Seller JWT on Buyer-only endpoints returns `403`
    - Test missing JWT on protected endpoints returns `401`
    - Test expired JWT returns `401`
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [ ]\* 19.3 Write k6 performance tests for catalogue and auth endpoints
    - Catalogue endpoint: 100 virtual users, 60-second ramp, assert p99 < 2000ms
    - Auth login endpoint: 50 virtual users, assert p99 < 5000ms (cold start budget)
    - _Requirements: 15.2, 15.4_

- [ ] 20. Final checkpoint — Full platform
  - Ensure all unit, property, integration, and E2E tests pass. Run `pnpm turbo typecheck` and `pnpm turbo lint` with zero errors. Verify `cdk synth` succeeds for all three environments. Ask the user if questions arise.

- [ ] 21. Design tokens and color theme setup
  - [ ] 21.1 Define shared design tokens (color palette) in the shared package
    - Create `packages/shared/src/design-tokens/colors.ts` exporting the blue and purple color palette as named constants (e.g., `brand.primary` for blue, `brand.secondary` for purple) with light/dark shades for hover, active, and disabled states
    - Include WCAG AA-compliant foreground colors for each background shade (ensure contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text)
    - Export a `designTokens` object consumable by both Tailwind CSS config and NativeWind theme config
    - Add barrel export from `packages/shared/src/index.ts`
    - _Requirements: 20.3, 20.4_

  - [ ] 21.2 Apply blue-purple color theme to web app (Tailwind config)
    - Update `apps/web/tailwind.config.ts` to import color tokens from `@blipzo/shared` and extend the Tailwind theme with `colors.brand.primary` (blue) and `colors.brand.secondary` (purple)
    - Update global CSS / Tailwind base layer to apply brand colors to buttons, links, headers, and navigation elements
    - Verify all color combinations meet WCAG AA contrast ratio requirements
    - _Requirements: 20.1, 20.4_

  - [ ] 21.3 Apply blue-purple color theme to mobile app (NativeWind/theme config)
    - Update `apps/mobile/tailwind.config.ts` (NativeWind) to import color tokens from `@blipzo/shared` and extend the theme with the same brand primary (blue) and secondary (purple) colors
    - Update shared navigation theme and component styles to use brand colors for buttons, links, headers, and tab bar
    - Verify all color combinations meet WCAG AA contrast ratio requirements
    - _Requirements: 20.2, 20.4_

  - [ ]\* 21.4 Write unit tests for design token accessibility compliance
    - Test that all foreground/background color pairs in the design tokens meet WCAG AA contrast ratio (≥ 4.5:1 for normal text)
    - Test that the exported token structure matches the expected schema for both Tailwind and NativeWind consumption
    - _Requirements: 20.3, 20.4_

- [ ] 22. Logo asset setup and integration
  - [ ] 22.1 Copy and configure logo asset for web and mobile
    - Copy `/Users/nayannilank/Desktop/Nayan/Projects/Logo_Fun.png` to `apps/web/public/logo.png` for the web app
    - Copy `/Users/nayannilank/Desktop/Nayan/Projects/Logo_Fun.png` to `apps/mobile/assets/logo.png` for the mobile app
    - Generate required splash screen asset sizes from the logo for Expo (e.g., `splash.png` at recommended 1284×2778 resolution with the logo centered on a brand-colored background)
    - _Requirements: 19.1, 19.2, 19.4_

  - [ ] 22.2 Add logo to web app header/navigation
    - Update the web app's header/navigation component to display the logo image (`/logo.png`) with proper `alt` text ("BlipZo")
    - Apply CSS to maintain original aspect ratio (`object-fit: contain` or equivalent) without distortion
    - Ensure the logo is responsive and appropriately sized across all breakpoints (320px–1920px)
    - _Requirements: 19.1, 19.4_

  - [ ] 22.3 Add logo to mobile app header/navigation
    - Update the mobile app's navigation header (React Navigation) to display the logo image from `assets/logo.png`
    - Use `resizeMode: 'contain'` to maintain original aspect ratio without distortion
    - Ensure the logo renders correctly on various Android screen densities
    - _Requirements: 19.2, 19.4_

  - [ ] 22.4 Configure mobile splash screen with logo
    - Update `apps/mobile/app.json` (or `app.config.ts`) to configure the Expo splash screen with the logo centered on a brand-colored background (using the primary blue from design tokens)
    - Set `splash.resizeMode` to `contain` to maintain aspect ratio
    - Ensure the splash screen displays until the app is fully loaded (use `expo-splash-screen` `preventAutoHideAsync` / `hideAsync` pattern in the root component)
    - _Requirements: 19.3, 19.4_

  - [ ]\* 22.5 Write unit tests for logo rendering
    - Test web header component renders an `<img>` element with correct `src` and `alt` attributes
    - Test mobile header renders the logo `Image` component with `resizeMode: 'contain'`
    - Test that the logo element has appropriate accessibility properties
    - _Requirements: 19.1, 19.2, 19.4_

- [ ] 23. Checkpoint — Branding and theme
  - Ensure all design token tests pass. Verify logo renders correctly in web and mobile headers. Verify splash screen displays on mobile app launch. Run `pnpm turbo typecheck` with zero errors. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP, but all property and unit tests are strongly recommended before any production deployment per the testing standards
- Each task references specific requirements for full traceability
- Checkpoints (tasks 5, 13, 17, 20) are integration gates — do not proceed past a checkpoint with failing tests
- Property-based tests use `fast-check` with a minimum of 100 iterations; increase to 500 for checkout atomicity (Property 29) and cart total rounding (Property 25)
- All secrets must be fetched from AWS Secrets Manager at Lambda runtime — never hardcoded in source or CDK stacks
- The Payment_Service is invoked Lambda-to-Lambda (not via API Gateway); no public route is exposed
- Search is implemented via DynamoDB `FilterExpression` on `searchTokens` for academic scope; production would use OpenSearch
- iOS support (Requirement 18.3) is deferred — the mobile app is scaffolded to support it via Expo but iOS-specific tasks are not included
- Tasks 21–23 cover branding (logo, splash screen, color theme) per Requirements 19 and 20; these depend on the web and mobile app scaffolding (tasks 15.1 and 16.1) being complete
- The logo source file is at `/Users/nayannilank/Desktop/Nayan/Projects/Logo_Fun.png` — it must be copied into the respective app asset directories, not referenced from the external path at runtime

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "3.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "3.2"] },
    { "id": 4, "tasks": ["2.5", "2.6", "2.7", "3.3", "3.4"] },
    { "id": 5, "tasks": ["2.8", "4.1"] },
    { "id": 6, "tasks": ["4.2", "4.3"] },
    { "id": 7, "tasks": ["4.4", "4.5"] },
    { "id": 8, "tasks": ["4.6", "4.7", "6.1"] },
    { "id": 9, "tasks": ["6.2", "6.3"] },
    { "id": 10, "tasks": ["6.4", "6.5", "7.1"] },
    { "id": 11, "tasks": ["6.6", "7.2", "7.3"] },
    { "id": 12, "tasks": ["7.4", "7.5", "8.1"] },
    { "id": 13, "tasks": ["8.2", "8.3", "9.1"] },
    { "id": 14, "tasks": ["9.2", "9.3", "10.1"] },
    { "id": 15, "tasks": ["10.2", "10.3", "10.4", "11.1"] },
    { "id": 16, "tasks": ["11.2", "12.1"] },
    { "id": 17, "tasks": ["12.2", "12.3"] },
    { "id": 18, "tasks": ["12.4", "12.5"] },
    { "id": 19, "tasks": ["12.6", "12.7"] },
    { "id": 20, "tasks": ["12.8", "12.9", "14.1"] },
    { "id": 21, "tasks": ["14.2", "14.3"] },
    { "id": 22, "tasks": ["15.1"] },
    { "id": 23, "tasks": ["15.2", "15.7"] },
    { "id": 24, "tasks": ["15.3", "15.8"] },
    { "id": 25, "tasks": ["15.4", "15.5"] },
    { "id": 26, "tasks": ["15.6", "15.9"] },
    { "id": 27, "tasks": ["15.10", "16.1"] },
    { "id": 28, "tasks": ["16.2"] },
    { "id": 29, "tasks": ["16.3"] },
    { "id": 30, "tasks": ["16.4", "16.7"] },
    { "id": 31, "tasks": ["16.5", "16.8"] },
    { "id": 32, "tasks": ["16.6"] },
    { "id": 33, "tasks": ["18.1"] },
    { "id": 34, "tasks": ["18.2", "18.3"] },
    { "id": 35, "tasks": ["18.4", "19.1"] },
    { "id": 36, "tasks": ["19.2"] },
    { "id": 37, "tasks": ["19.3"] },
    { "id": 38, "tasks": ["21.1"] },
    { "id": 39, "tasks": ["21.2", "21.3", "22.1"] },
    { "id": 40, "tasks": ["21.4", "22.2", "22.3", "22.4"] },
    { "id": 41, "tasks": ["22.5"] }
  ]
}
```
