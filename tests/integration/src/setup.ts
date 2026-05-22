/**
 * Global test setup for integration tests.
 * Sets environment variables that all services expect.
 */

process.env['USER_POOL_ID'] = 'us-east-1_TestPool';
process.env['USER_POOL_CLIENT_ID'] = 'test-client-id';
process.env['OTP_TABLE_NAME'] = 'blipzo-test-otp';
process.env['PRODUCTS_TABLE_NAME'] = 'blipzo-test-products';
process.env['CARTS_TABLE_NAME'] = 'blipzo-test-carts';
process.env['WISHLISTS_TABLE_NAME'] = 'blipzo-test-wishlists';
process.env['ORDERS_TABLE_NAME'] = 'blipzo-test-orders';
process.env['ADDRESSES_TABLE_NAME'] = 'blipzo-test-addresses';
process.env['PAYMENTS_TABLE_NAME'] = 'blipzo-test-payments';
process.env['RETURN_EXCHANGE_REQUESTS_TABLE_NAME'] = 'blipzo-test-return-exchange-requests';
process.env['PRODUCT_IMAGES_BUCKET'] = 'blipzo-test-product-images';
process.env['PAYMENT_FUNCTION_NAME'] = 'blipzo-test-payment-service';
process.env['CATEGORIES_TABLE_NAME'] = 'blipzo-test-categories';
process.env['STAGE'] = 'test';
process.env['AWS_REGION'] = 'us-east-1';
