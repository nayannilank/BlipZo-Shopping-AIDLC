# Requirements Document

## Introduction

BlipZo is a cloud-native e-commerce platform similar to Amazon, supporting Buyers and Sellers across Android (primary), Web (secondary), and iOS (future/optional) platforms. The platform enables Buyers to browse products, manage wishlists, place and track orders, manage addresses, and make payments. Sellers can register, list products, and configure return/exchange policies. The backend is built on AWS Serverless architecture using a Turborepo monorepo, with mock implementations for OTP and payment processing to support the academic project scope.

---

## Glossary

- **Platform**: The BlipZo e-commerce system as a whole, encompassing all client applications and backend services.
- **Buyer**: A registered user who browses, wishlists, purchases, and manages orders on the Platform.
- **Seller**: A registered user who lists and manages products and configures return/exchange policies on the Platform.
- **Auth_Service**: The AWS Cognito-backed service responsible for user registration, login, and token management.
- **Product_Service**: The backend Lambda service responsible for product creation, updates, deletion, and catalogue queries.
- **Catalogue_Service**: The backend service responsible for category-based product browsing and search.
- **Wishlist_Service**: The backend service responsible for managing a Buyer's wishlist.
- **Cart_Service**: The backend service responsible for managing a Buyer's shopping cart.
- **Order_Service**: The backend service responsible for order placement, cancellation, history, and return/exchange requests.
- **Address_Service**: The backend service responsible for managing a Buyer's saved delivery addresses.
- **Payment_Service**: The mock backend service responsible for processing payment transactions via UPI, Credit Card, Debit Card, or Cash on Delivery.
- **OTP**: A one-time password sent to a phone number for authentication; mock delivery is acceptable for this project.
- **JWT**: A JSON Web Token issued by Auth_Service upon successful authentication, used to authorize API requests.
- **RBAC**: Role-Based Access Control — the mechanism that restricts API and UI access based on the authenticated user's role (Buyer or Seller).
- **Wishlist**: A single, persistent list of products saved by a Buyer for future reference.
- **Cart**: A temporary collection of products a Buyer intends to purchase in a checkout session.
- **Order**: A confirmed purchase record created after a successful checkout.
- **Return_Exchange_Request**: A post-delivery request by a Buyer to return or exchange one or more items in an Order.
- **Seller_Policy**: A Seller-defined configuration specifying the return and exchange rules for their products.
- **DynamoDB**: Amazon DynamoDB — the primary database for all persistent data, designed using access-pattern-first principles.
- **S3**: Amazon S3 — used for storing product images and other static assets.
- **API_Gateway**: AWS API Gateway — the entry point for all client-to-backend HTTP requests.
- **Lambda**: AWS Lambda — the serverless compute layer executing all backend business logic.

---

## Requirements

### Requirement 1: User Registration

**User Story:** As a new user, I want to register an account with my email and password or phone number, so that I can access the Platform as a Buyer or Seller.

#### Acceptance Criteria

1. WHEN a user submits an email address containing exactly one `@` with a non-empty local part and domain, a password between 8 and 128 characters containing at least one uppercase letter, one lowercase letter, and one digit, and a role selection of either "Buyer" or "Seller", THE Auth_Service SHALL create a new account in AWS Cognito and return a success response containing the new user's ID.
2. WHEN a user submits a registration request with an email address that already exists in the system, THE Auth_Service SHALL return an error response indicating the email is already registered.
3. WHEN a user submits a registration request with a phone number in E.164 format (a `+` followed by 7–15 digits) and that phone number already exists in the system, THE Auth_Service SHALL return an error response indicating the phone number is already registered.
4. IF a user submits a registration request with a password shorter than 8 characters, longer than 128 characters, or missing at least one uppercase letter, one lowercase letter, or one digit, THEN THE Auth_Service SHALL return a validation error identifying which password rule was violated.
5. IF a user submits a registration request with a role value that is absent or not exactly "Buyer" or "Seller", THEN THE Auth_Service SHALL return a validation error indicating the role is invalid.
6. IF the AWS Cognito service is unavailable during registration, THEN THE Auth_Service SHALL return a service unavailability error without exposing internal infrastructure details.
7. THE Auth_Service SHALL assign the Buyer or Seller role to the new account at registration time and persist the role in the user's Cognito attributes.

---

### Requirement 2: Email and Password Login

**User Story:** As a registered user, I want to log in with my email and password, so that I can access my account on the Platform.

#### Acceptance Criteria

1. WHEN a registered user submits a valid email and matching password, THE Auth_Service SHALL authenticate the user via AWS Cognito and return a signed JWT containing the user's ID and role, with an expiry of no more than 60 minutes.
2. IF a user submits an email that does not exist or a password that does not match, THEN THE Auth_Service SHALL return a generic authentication failure error without revealing which credential is incorrect.
3. IF a user submits more than 5 consecutive failed login attempts within a 15-minute window, THEN THE Auth_Service SHALL lock the account for 15 minutes and return an error indicating the account is temporarily locked.
4. WHILE an account is locked, THE Auth_Service SHALL reject all login attempts for that account and return an error indicating the account is locked, regardless of whether the submitted credentials are correct.
5. THE Auth_Service SHALL issue a refresh token alongside the JWT, with the refresh token valid for no more than 7 days, to support session renewal without re-authentication.

---

### Requirement 3: Phone and OTP Login

**User Story:** As a registered user, I want to log in using my phone number and a one-time password, so that I can access my account without remembering a password.

#### Acceptance Criteria

1. WHEN a registered user submits a phone number in E.164 format (between 8 and 15 digits following the country code) for OTP login, THE Auth_Service SHALL generate a 6-digit numeric OTP, associate it with the phone number with a 10-minute expiry, and trigger the mock OTP delivery mechanism.
2. WHEN a user submits the correct OTP within the 10-minute expiry window, THE Auth_Service SHALL authenticate the user, invalidate the OTP so it cannot be reused, and return a signed JWT containing the user's ID and role with an expiry of 1 hour.
3. IF a user submits an incorrect OTP, THEN THE Auth_Service SHALL return an error indicating the OTP is incorrect and increment the attempt count; after 3 consecutive failed attempts THE Auth_Service SHALL invalidate the OTP.
4. IF a user submits an OTP that has expired, THEN THE Auth_Service SHALL return an error indicating the OTP has expired and invalidate the OTP.
5. WHEN a user submits a phone number that is not registered, THE Auth_Service SHALL return an error indicating the phone number is not found.
6. IF the OTP delivery mechanism fails, THEN THE Auth_Service SHALL return an error indicating OTP delivery failure without exposing internal system details.

---

### Requirement 4: Role-Based Access Control

**User Story:** As a platform operator, I want all API endpoints to enforce role-based access, so that Buyers and Sellers can only perform actions permitted for their role.

#### Acceptance Criteria

1. WHEN a request arrives at a Seller-only endpoint (such as product creation or policy configuration) with a JWT containing the Buyer role, THE API_Gateway SHALL reject the request with a 403 Forbidden response.
2. WHEN a request arrives at a Buyer-only endpoint (such as order placement or wishlist management) with a JWT containing the Seller role, THE API_Gateway SHALL reject the request with a 403 Forbidden response.
3. IF a request arrives at any protected endpoint with an absent JWT, an expired JWT, or a JWT that fails signature verification, THEN THE API_Gateway SHALL reject the request with a 401 Unauthorized response.
4. THE Auth_Service SHALL embed the user's role as a claim in the JWT with a value of exactly "Buyer" or "Seller", so that downstream Lambda functions can enforce resource-level authorization by reading the claim.
5. IF a request arrives at any protected endpoint with a JWT containing a role value that is not "Buyer" or "Seller", THEN THE API_Gateway SHALL reject the request with a 403 Forbidden response.

---

### Requirement 5: Product Management by Seller

**User Story:** As a Seller, I want to add and delete products from my catalogue, so that I can control what I offer to Buyers.

#### Acceptance Criteria

1. WHEN an authenticated Seller submits a valid product creation request containing a name (1–200 characters), description (1–2000 characters), price (greater than 0 and at most 9,999,999.99), stock quantity (0–999,999), at least one category, and between 1 and 10 images each no larger than 10 MB in JPEG, PNG, or WebP format, THE Product_Service SHALL persist the product in DynamoDB, upload images to S3, and return the created product record with a unique product ID.
2. IF an authenticated Seller submits a product creation request with any required field missing or invalid (e.g., price ≤ 0, name empty), THEN THE Product_Service SHALL return a validation error indicating which field(s) failed validation and the reason, without creating the product.
3. WHEN an authenticated Seller submits a delete request for a product they own that is not already marked as deleted, THE Product_Service SHALL mark the product as deleted in DynamoDB and return a success response.
4. IF an authenticated Seller submits a delete request for a product owned by a different Seller, THEN THE Product_Service SHALL return an authorization error without modifying the product.
5. WHEN an authenticated Seller submits a product update request for a product they own with at least one valid field, THE Product_Service SHALL update only the supplied fields in the product record in DynamoDB (applying the same bounds as creation) and return the updated product.
6. IF an authenticated Seller submits a product update request for a product owned by a different Seller, THEN THE Product_Service SHALL return an authorization error without modifying the product.
7. IF an authenticated Seller submits a product update request with any supplied field invalid, THEN THE Product_Service SHALL return a validation error indicating which field(s) failed validation without modifying the product.
8. THE Product_Service SHALL store product images in S3 and persist only the S3 object URLs in DynamoDB; IF an S3 upload fails, THEN THE Product_Service SHALL return an error and SHALL NOT persist any partial product record in DynamoDB.

---

### Requirement 6: Product Catalogue and Category Browsing

**User Story:** As a Buyer, I want to browse products by category and view product details, so that I can discover items I want to purchase.

#### Acceptance Criteria

1. WHEN a user (authenticated or unauthenticated) requests the product catalogue for a valid category ID, THE Catalogue_Service SHALL return a paginated list of active (not deleted and not suspended) products in that category sorted by most recently listed first, each including product ID, name, price, primary image URL, average rating, and seller name.
2. WHEN a user requests product details for a specific product ID, THE Catalogue_Service SHALL return the full product record including name, description, price, stock quantity, all image URLs, category list, seller name, average rating, and return/exchange policy summary.
3. IF a user requests a product ID that does not exist or has been deleted, THEN THE Catalogue_Service SHALL return a 404 Not Found error.
4. IF a user requests a category ID that does not exist, THEN THE Catalogue_Service SHALL return a 404 Not Found error.
5. THE Catalogue_Service SHALL return catalogue pages of between 1 and 20 products per request (defaulting to 20) and support cursor-based pagination.
6. WHEN a user submits a search query of 1–100 non-whitespace-only characters, THE Catalogue_Service SHALL return a paginated list of active products whose name or description contains the query string case-insensitively, sorted by most recently listed first.
7. IF no products exist in the requested category or matching the search query, THEN THE Catalogue_Service SHALL return an empty list with a 200 success response rather than an error.

---

### Requirement 7: Wishlist Management

**User Story:** As a Buyer, I want to add and remove products from my wishlist, so that I can save items I am interested in for later.

#### Acceptance Criteria

1. THE Platform SHALL maintain exactly one Wishlist per Buyer account, with a maximum capacity of 200 product entries.
2. WHEN an authenticated Buyer submits a request to add a product to their Wishlist, THE Wishlist_Service SHALL add the product ID to the Buyer's Wishlist in DynamoDB and return the updated Wishlist.
3. IF an authenticated Buyer submits a request to add a product that is already in their Wishlist, THEN THE Wishlist_Service SHALL return the current Wishlist without creating a duplicate entry.
4. IF an authenticated Buyer submits a request to add a product ID that does not exist in the catalogue, THEN THE Wishlist_Service SHALL return a 404 Not Found error without modifying the Wishlist.
5. WHEN an authenticated Buyer submits a request to remove a product from their Wishlist, THE Wishlist_Service SHALL remove the product ID from the Wishlist and return the updated Wishlist.
6. IF an authenticated Buyer submits a request to remove a product ID that is not in their Wishlist, THEN THE Wishlist_Service SHALL return the current Wishlist unchanged (idempotent removal).
7. WHEN an authenticated Buyer requests their Wishlist, THE Wishlist_Service SHALL return all product IDs in the Wishlist along with current product name, price, primary image URL, and availability status for each item.
8. WHEN a product in a Buyer's Wishlist is deleted by the Seller, THE Wishlist_Service SHALL retain the product ID in the Wishlist but mark the item as unavailable in the Wishlist response.
9. IF an unauthenticated user submits any Wishlist request, THEN THE Wishlist_Service SHALL return a 401 Unauthorized error.

---

### Requirement 8: Cart Management

**User Story:** As a Buyer, I want to add products to my cart and adjust quantities, so that I can prepare my order before checkout.

#### Acceptance Criteria

1. WHEN an authenticated Buyer submits a request to add a product to their Cart with a quantity between 1 and 999 inclusive, THE Cart_Service SHALL add the product and quantity to the Buyer's Cart in DynamoDB and return the updated Cart.
2. WHEN an authenticated Buyer submits a request to add a product that is already in their Cart, THE Cart_Service SHALL replace the existing quantity with the submitted quantity (between 1 and 999 inclusive) and return the updated Cart.
3. WHEN an authenticated Buyer submits a request to set a Cart item quantity to 0, THE Cart_Service SHALL remove that item from the Cart and return the updated Cart.
4. IF an authenticated Buyer submits a request to add a product with a quantity exceeding the product's available stock, THEN THE Cart_Service SHALL return an error indicating insufficient stock without modifying the Cart.
5. WHEN an authenticated Buyer requests their Cart, THE Cart_Service SHALL return all Cart items with product name, price, and primary image URL fetched from the Product catalogue at the time of the request, the requested quantity, a line-item subtotal rounded to 2 decimal places for each item, and the Cart total rounded to 2 decimal places.
6. WHEN an authenticated Buyer submits a request to clear their Cart, THE Cart_Service SHALL remove all items from the Cart and return an empty Cart response.
7. IF an unauthenticated user submits any Cart request, THEN THE Cart_Service SHALL return a 401 Unauthorized error.
8. IF an authenticated Buyer submits a request referencing a product ID that does not exist, THEN THE Cart_Service SHALL return a 404 Not Found error without modifying the Cart.

---

### Requirement 9: Address Management

**User Story:** As a Buyer, I want to save and manage multiple delivery addresses, so that I can select the appropriate address at checkout.

#### Acceptance Criteria

1. WHEN an authenticated Buyer submits a valid address containing a full name (1–100 characters), phone number in E.164 format, address line 1 (1–200 characters), city (1–100 characters), state (1–100 characters), postal code, and country, THE Address_Service SHALL persist the address in DynamoDB and return the created address record with a unique address ID.
2. IF an authenticated Buyer submits an address with any required field missing, a phone number not in E.164 format, or a postal code that does not match the expected format for the given country, THEN THE Address_Service SHALL return a validation error identifying the specific failing field(s) and reason.
3. WHEN an authenticated Buyer requests their saved addresses, THE Address_Service SHALL return all addresses associated with the Buyer's account.
4. WHEN an authenticated Buyer submits a delete request for an address they own, THE Address_Service SHALL remove the address from DynamoDB and return a success response.
5. WHEN an authenticated Buyer submits an update request for an address they own with valid fields, THE Address_Service SHALL update the address record and return the updated address.
6. WHEN an authenticated Buyer designates an address as their default address, THE Address_Service SHALL mark that address as default and remove the default designation from any previously default address for that Buyer.
7. IF an authenticated Buyer submits a delete or update request for an address they do not own or that does not exist, THEN THE Address_Service SHALL return a 404 Not Found error without modifying any address record.

---

### Requirement 10: Checkout and Order Placement

**User Story:** As a Buyer, I want to check out my cart by selecting an address and payment method, so that I can place an order for the products in my cart.

#### Acceptance Criteria

1. WHEN an authenticated Buyer submits a checkout request with a valid Cart (at least one item), a valid saved address ID, and a supported payment method (UPI, Credit Card, Debit Card, or Cash on Delivery), THE Order_Service SHALL execute the following steps in order: (1) validate stock availability for all Cart items, (2) invoke the Payment_Service, (3) create an Order record in DynamoDB with payment status "Paid" for non-CoD or "Pending" for CoD, (4) decrement product stock quantities, (5) clear the Buyer's Cart, and (6) return the created Order with a unique order ID and order status "Confirmed".
2. IF a checkout request is submitted and one or more Cart items have insufficient stock, THEN THE Order_Service SHALL return an error listing the out-of-stock items without creating an Order or invoking the Payment_Service.
3. IF a checkout request is submitted and the Payment_Service returns a payment failure, THEN THE Order_Service SHALL return a payment failure error without creating an Order.
4. IF a checkout request is submitted and the Payment_Service is unreachable, THEN THE Order_Service SHALL return a service unavailability error without creating an Order.
5. WHEN an authenticated Buyer submits a checkout request with a Cash on Delivery payment method, THE Payment_Service SHALL record the pending payment and return a success response without processing a real transaction.
6. THE Order_Service SHALL persist each Order with the Buyer ID, order timestamp, delivery address snapshot, list of ordered items with quantities and prices at time of purchase, payment method, payment status ("Paid" or "Pending"), and order status.

---

### Requirement 11: Payment Processing (Mock)

**User Story:** As a Buyer, I want to pay using UPI, Credit Card, Debit Card, or Cash on Delivery, so that I can complete my purchase using my preferred payment method.

#### Acceptance Criteria

1. WHEN the Payment_Service receives a payment request with method UPI, Credit Card, or Debit Card and a valid mock payload, THE Payment_Service SHALL return a successful payment confirmation with a mock transaction ID.
2. WHEN the Payment_Service receives a payment request with method Cash on Delivery, THE Payment_Service SHALL return a success response with payment status "Pending" and no transaction ID.
3. IF the Payment_Service receives a payment request with an unsupported payment method, THEN THE Payment_Service SHALL return a validation error.
4. IF the Payment_Service encounters an internal error during processing, THEN THE Payment_Service SHALL return a standardized error response and THE Order_Service SHALL not create an Order record.
5. THE Payment_Service SHALL not store real card numbers, UPI IDs, or any sensitive financial credentials in DynamoDB or logs.

---

### Requirement 12: Order Management by Buyer

**User Story:** As a Buyer, I want to view my order history and cancel eligible orders, so that I can track and manage my purchases.

#### Acceptance Criteria

1. WHEN an authenticated Buyer requests their order history, THE Order_Service SHALL return a paginated list (default page size 20, maximum 100 per page) of all Orders associated with the Buyer, sorted by order timestamp descending, each including order ID, order date, total amount, order status, and a summary of ordered items.
2. WHEN an authenticated Buyer requests the details of a specific order they own, THE Order_Service SHALL return the full Order record including all items, quantities, prices, delivery address, payment method, payment status, and current order status.
3. IF an authenticated Buyer requests details of an order that does not belong to them, THEN THE Order_Service SHALL return a 404 Not Found error without revealing whether the order exists.
4. WHEN an authenticated Buyer submits a cancellation request for an Order with status "Confirmed" or "Processing", THE Order_Service SHALL update the Order status to "Cancelled", trigger a mock refund via the Payment_Service for non-Cash-on-Delivery orders, and return the updated Order including the resulting refund status.
5. IF the Payment_Service refund call fails during cancellation, THEN THE Order_Service SHALL keep the Order status as "Cancelled" and set the refund status to "Pending" in the Order record.
6. IF an authenticated Buyer submits a cancellation request for an Order with status "Shipped", "Delivered", or "Cancelled", THEN THE Order_Service SHALL return an error indicating the Order cannot be cancelled at its current status.

---

### Requirement 13: Return and Exchange Requests

**User Story:** As a Buyer, I want to request a return or exchange for delivered orders, so that I can resolve issues with my purchases.

#### Acceptance Criteria

1. WHEN an authenticated Buyer submits a return or exchange request for an Order with status "Delivered" and within the Seller's defined return window, THE Order_Service SHALL create a Return_Exchange_Request record in DynamoDB with status "Pending" and return the request ID.
2. IF an authenticated Buyer submits a return or exchange request for an Order outside the Seller's defined return window, THEN THE Order_Service SHALL return an error indicating the return window has expired.
3. IF an authenticated Buyer submits a return or exchange request for an Order that has not yet been delivered, THEN THE Order_Service SHALL return an error indicating the Order is not eligible for return or exchange.
4. WHEN an authenticated Buyer requests the status of a Return_Exchange_Request they own, THE Order_Service SHALL return the current status and any Seller notes associated with the request.
5. THE Order_Service SHALL validate return and exchange eligibility against the Seller_Policy associated with the product at the time of the request.

---

### Requirement 14: Seller Return and Exchange Policy Configuration

**User Story:** As a Seller, I want to configure return and exchange policies for my products, so that Buyers know the terms under which they can return or exchange items.

#### Acceptance Criteria

1. WHEN an authenticated Seller submits a policy configuration for a product they own, specifying a return window in days (0–30), whether exchanges are allowed, and any conditions, THE Product_Service SHALL persist the Seller_Policy in DynamoDB and associate it with the product.
2. IF an authenticated Seller submits a policy configuration for a product they do not own, THEN THE Product_Service SHALL return a 403 Forbidden error.
3. WHEN a Seller sets the return window to 0 days, THE Platform SHALL treat the product as non-returnable and non-exchangeable.
4. WHEN a Seller updates an existing Seller_Policy, THE Product_Service SHALL persist the updated policy and apply it to future Return_Exchange_Requests; existing pending requests SHALL continue to be evaluated against the policy that was active at the time of request creation.

---

### Requirement 15: Platform Availability and Performance

**User Story:** As a user, I want the Platform to load quickly and remain available, so that I can shop without interruption.

#### Acceptance Criteria

1. THE Platform SHALL target 99.9% monthly uptime for all production API endpoints.
2. WHEN a Buyer requests the product catalogue, THE Catalogue_Service SHALL return a response within 2 seconds under normal load conditions (up to 100 concurrent requests).
3. THE Platform SHALL use AWS Lambda and API_Gateway to scale automatically in response to traffic increases without manual intervention.
4. WHEN a Lambda function experiences a cold start, THE Platform SHALL complete the cold start and return a response within 5 seconds for catalogue and authentication endpoints.
5. THE Platform SHALL use DynamoDB access-pattern-first design to avoid full-table scans on all production query paths.

---

### Requirement 16: Observability and Logging

**User Story:** As a platform operator, I want all backend services to emit structured logs and traces, so that I can diagnose issues and monitor system health.

#### Acceptance Criteria

1. THE Lambda SHALL emit structured JSON logs to AWS CloudWatch Logs for every request, including a correlation ID, service name, request timestamp, and response status code.
2. IF an unhandled error occurs in any Lambda, THEN THE Lambda SHALL log the error type and message to CloudWatch Logs without including stack traces, secrets, or sensitive user data in the log output.
3. THE Platform SHALL enable AWS X-Ray tracing on all Lambda functions and API_Gateway stages to support distributed request tracing.
4. THE Platform SHALL emit CloudWatch Metrics for order placement success rate, payment failure rate, and catalogue response latency.

---

### Requirement 17: Infrastructure and Deployment

**User Story:** As a developer, I want the infrastructure to be defined as code and deployed via CI/CD, so that environments are consistent and deployments are automated.

#### Acceptance Criteria

1. THE Platform SHALL define all AWS infrastructure (Lambda, API_Gateway, DynamoDB tables, S3 buckets, Cognito user pools, IAM roles) using AWS CDK in TypeScript.
2. THE Platform SHALL support three isolated deployment environments: Development, QA/Test, and Production, each with independent DynamoDB tables, S3 buckets, and Cognito user pools.
3. WHEN a pull request is merged to the main branch, THE CI/CD pipeline SHALL run type checking, linting, unit tests, and integration tests before deploying to the Development environment.
4. THE Platform SHALL store all secrets (API keys, Cognito client secrets) in AWS Secrets Manager and SHALL NOT hardcode any secret values in source code or CDK stacks.
5. THE Platform SHALL enforce least-privilege IAM policies for all Lambda execution roles, granting access only to the specific DynamoDB tables, S3 buckets, and services each Lambda requires.

---

### Requirement 18: Multi-Platform Client Support

**User Story:** As a user, I want to access BlipZo on Android and Web with a consistent experience, so that I can shop from any device.

#### Acceptance Criteria

1. THE Platform SHALL provide a Web application built with React 19+, TypeScript, and Tailwind CSS that is responsive and accessible on screen widths from 320px to 1920px.
2. THE Platform SHALL provide an Android application built with React Native and Expo that supports Android API level 26 (Android 8.0) and above.
3. WHERE the iOS platform is enabled in future, THE Platform SHALL provide an iOS application built with React Native and Expo that supports iOS 14 and above.
4. THE Web application and Android application SHALL consume the same versioned REST APIs exposed through API_Gateway, using shared TypeScript type definitions from a shared package in the Turborepo monorepo.
5. WHEN the client application loses network connectivity, THE client application SHALL display a user-friendly offline indicator and queue non-critical actions for retry when connectivity is restored.
