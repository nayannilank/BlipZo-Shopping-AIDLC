// Type exports
export type {
  RegisterRequest,
  LoginRequest,
  OtpRequestPayload,
  OtpVerifyPayload,
  AuthResponse,
} from './types/auth.js';

export type {
  CreateProductRequest,
  ImageUpload,
  ProductRecord,
  ProductListItem,
  SellerPolicy,
} from './types/product.js';

export type {
  CatalogueListRequest,
  CatalogueListResponse,
  CatalogueItem,
  SearchRequest,
} from './types/catalogue.js';

export type { WishlistItem, WishlistResponse, WishlistItemEnriched } from './types/wishlist.js';

export type { CartItem, CartResponse, CartItemEnriched } from './types/cart.js';

export type {
  CheckoutRequest,
  OrderRecord,
  OrderItem,
  ReturnExchangeRequest,
} from './types/order.js';

export type { AddressRecord, AddressSnapshot } from './types/address.js';

export type { PaymentRequest, MockPaymentDetails, PaymentResponse } from './types/payment.js';

export type { ErrorResponse } from './types/errors.js';

export type {
  CategoryNode,
  AttributeDataType,
  AttributeDefinition,
  AttributeSchema,
  CategoryTreeResponse,
  SubcategoryListResponse,
  AttributeSchemaResponse,
} from './types/category.js';

// Schema exports
export {
  registerSchema,
  loginSchema,
  otpRequestSchema,
  otpVerifySchema,
  passwordSchema,
  emailSchema,
  e164PhoneSchema,
  usernameSchema,
  firstNameSchema,
  lastNameSchema,
  genderSchema,
  dateOfBirthSchema,
  companyNameSchema,
  companyUrlSchema,
  companyAddressSchema,
  tanPanNumberSchema,
  gstNumberSchema,
  inceptionDateSchema,
} from './schemas/auth.schema.js';

export type {
  RegisterSchemaInput,
  LoginSchemaInput,
  OtpRequestSchemaInput,
  OtpVerifySchemaInput,
} from './schemas/auth.schema.js';

export {
  createProductSchema,
  updateProductSchema,
  sellerPolicySchema,
  imageUploadSchema,
} from './schemas/product.schema.js';

export type {
  CreateProductSchemaInput,
  UpdateProductSchemaInput,
  SellerPolicySchemaInput,
} from './schemas/product.schema.js';

export { catalogueListSchema, searchRequestSchema } from './schemas/catalogue.schema.js';

export type {
  CatalogueListSchemaInput,
  SearchRequestSchemaInput,
} from './schemas/catalogue.schema.js';

export { addToWishlistSchema, removeFromWishlistSchema } from './schemas/wishlist.schema.js';

export type {
  AddToWishlistSchemaInput,
  RemoveFromWishlistSchemaInput,
} from './schemas/wishlist.schema.js';

export { cartItemSchema, removeFromCartSchema } from './schemas/cart.schema.js';

export type { CartItemSchemaInput, RemoveFromCartSchemaInput } from './schemas/cart.schema.js';

export { checkoutSchema, returnExchangeRequestSchema } from './schemas/order.schema.js';

export type {
  CheckoutSchemaInput,
  ReturnExchangeRequestSchemaInput,
} from './schemas/order.schema.js';

export { addressSchema, updateAddressSchema } from './schemas/address.schema.js';

export type { AddressSchemaInput, UpdateAddressSchemaInput } from './schemas/address.schema.js';

export {
  categoryNodeSchema,
  attributeDataTypeSchema,
  attributeDefinitionSchema,
  attributeSchemaSchema,
  categoryTreeResponseSchema,
  subcategoryListResponseSchema,
  attributeSchemaResponseSchema,
} from './schemas/category.schema.js';

export type {
  AttributeDataTypeSchemaInput,
  AttributeDefinitionSchemaInput,
  CategoryNodeSchemaInput,
  AttributeSchemaSchemaInput,
  CategoryTreeResponseSchemaInput,
  SubcategoryListResponseSchemaInput,
  AttributeSchemaResponseSchemaInput,
} from './schemas/category.schema.js';

// Middleware exports
export { structuredLogger } from './middleware/logger.middleware.js';

export type { LoggerMiddlewareOptions } from './middleware/logger.middleware.js';

// Design token exports
export {
  blue,
  purple,
  neutral,
  semantic,
  brand,
  foreground,
  designTokens,
} from './design-tokens/index.js';

export type { ColorShade, BrandColorVariant, DesignTokens } from './design-tokens/index.js';
