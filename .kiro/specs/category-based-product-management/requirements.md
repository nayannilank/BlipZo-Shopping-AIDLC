# Requirements Document

## Introduction

This feature introduces a hierarchical category and subcategory taxonomy to the BlipZo Shopping Platform, enabling category-specific product attributes, dynamic seller product forms, and structured buyer browsing experiences. The platform currently supports flat category strings on products. This feature replaces that with a rich, tree-based category system where each category/subcategory defines its own set of required and optional product attributes. The platform targets the Indian market exclusively, so sizing standards, regional preferences, and locale conventions apply.

## Glossary

- **Category_Tree**: A hierarchical data structure representing the full taxonomy of product categories and subcategories, stored in DynamoDB
- **Category**: A top-level classification node in the Category_Tree (e.g., Electronics, Clothing, Home & Kitchen, Books, Sports & Outdoors)
- **Subcategory**: A second-level classification node nested under a Category (e.g., Footwear under Clothing, Phones under Electronics)
- **Attribute_Schema**: A JSON definition specifying the required and optional fields, their data types, validation rules, and allowed values for products within a specific subcategory
- **Dynamic_Attribute**: A product field whose presence, type, and allowed values are determined by the Attribute_Schema of the product's subcategory
- **Catalogue_Service**: The backend service responsible for managing categories, subcategories, and browsing operations
- **Product_Service**: The backend service responsible for product creation, updates, and management
- **Seller**: An authenticated user with the seller role who lists products on the platform
- **Buyer**: An authenticated user who browses and purchases products on the platform
- **Add_Product_Form**: The multi-step UI form used by sellers to create a new product listing, which adapts dynamically based on the selected category and subcategory
- **Product_Detail_Page**: The UI page displaying full product information to buyers, rendered with category-specific layout and attributes
- **India_Sizing_Standard**: Indian sizing conventions for clothing (S, M, L, XL, XXL), footwear (IND 5–12 for adults, IND 1–5 for kids), and electronics (Indian plug types, voltage ratings)

## Requirements

### Requirement 1: Category Tree Management

**User Story:** As a platform administrator, I want to maintain a hierarchical category tree, so that products can be organized into meaningful classifications with subcategories.

#### Acceptance Criteria

1. THE Catalogue_Service SHALL store categories as a two-level hierarchy with Category as the parent and Subcategory as the child
2. WHEN the Catalogue_Service receives a request to list categories, THE Catalogue_Service SHALL return all top-level Category nodes with their unique identifiers and display names
3. WHEN a Buyer or Seller selects a Category, THE Catalogue_Service SHALL return all Subcategory nodes belonging to that Category with their unique identifiers and display names
4. THE Catalogue_Service SHALL support the following top-level categories: Electronics, Clothing, Home & Kitchen, Books, Sports & Outdoors
5. THE Catalogue_Service SHALL support the following subcategories: Phones, Laptops, and Accessories under Electronics; Footwear, Shirts, Pants, and Dresses under Clothing; Furniture, Appliances, and Decor under Home & Kitchen; Fiction, Non-Fiction, and Academic under Books; Equipment, Clothing, and Accessories under Sports & Outdoors
6. THE Category_Tree SHALL store each node with a categoryId, parentId (null for top-level), name, slug, level (1 for Category, 2 for Subcategory), and an isActive flag

### Requirement 2: Category-Specific Attribute Schema

**User Story:** As a platform administrator, I want each subcategory to define its own set of required and optional product attributes, so that product listings capture all relevant details for their category.

#### Acceptance Criteria

1. THE Catalogue_Service SHALL store an Attribute_Schema for each Subcategory defining the Dynamic_Attributes applicable to products in that Subcategory
2. THE Attribute_Schema SHALL define for each attribute: field name, display label, data type (text, number, single-select, multi-select, boolean), whether the field is required or optional, and allowed values for select fields
3. WHEN the Attribute_Schema for Footwear is requested, THE Catalogue_Service SHALL return attributes including: brand (text, required), available sizes (multi-select, required, values: IND 1 through IND 12), gender (single-select, required, values: Male, Female, Unisex), age group (single-select, required, values: Adult, Kids), available colours (multi-select, required), material (text, optional), sole type (text, optional)
4. WHEN the Attribute_Schema for Phones is requested, THE Catalogue_Service SHALL return attributes including: brand (text, required), model (text, required), RAM (single-select, required, values in GB), storage (single-select, required, values in GB), display size (number, required, in inches), battery capacity (number, required, in mAh), operating system (single-select, required, values: Android, iOS), colour (multi-select, required)
5. WHEN the Attribute_Schema for Laptops is requested, THE Catalogue_Service SHALL return attributes including: brand (text, required), model (text, required), processor (text, required), RAM (single-select, required, values in GB), storage type (single-select, required, values: SSD, HDD, Hybrid), storage capacity (single-select, required, values in GB/TB), display size (number, required, in inches), operating system (single-select, required, values: Windows, macOS, Linux, ChromeOS), colour (multi-select, optional)
6. WHEN the Attribute_Schema for Shirts is requested, THE Catalogue_Service SHALL return attributes including: brand (text, required), size (multi-select, required, values: XS, S, M, L, XL, XXL, XXXL), gender (single-select, required, values: Male, Female, Unisex), fabric (text, required), sleeve type (single-select, required, values: Full Sleeve, Half Sleeve, Sleeveless), colour (multi-select, required), pattern (single-select, optional, values: Solid, Striped, Checked, Printed, Floral)
7. WHEN the Attribute_Schema for Books is requested, THE Catalogue_Service SHALL return attributes including: author (text, required), ISBN (text, required), publisher (text, required), language (single-select, required), number of pages (number, required), format (single-select, required, values: Paperback, Hardcover), edition (text, optional)
8. THE Attribute_Schema SHALL be versioned so that changes to attribute definitions do not break existing product listings

### Requirement 3: Dynamic Product Creation with Category Attributes

**User Story:** As a Seller, I want the add product form to adapt based on my selected category and subcategory, so that I can provide all relevant details for my product type.

#### Acceptance Criteria

1. WHEN a Seller initiates product creation, THE Add_Product_Form SHALL present a category selection step as the first step
2. WHEN a Seller selects a Category, THE Add_Product_Form SHALL display the available Subcategories for that Category
3. WHEN a Seller selects a Subcategory, THE Add_Product_Form SHALL fetch the Attribute_Schema for that Subcategory and render the appropriate form fields
4. THE Add_Product_Form SHALL render text inputs, number inputs, single-select dropdowns, multi-select controls, and boolean toggles based on the attribute data type defined in the Attribute_Schema
5. THE Add_Product_Form SHALL enforce required field validation based on the Attribute_Schema before allowing form submission
6. THE Product_Service SHALL validate submitted Dynamic_Attributes against the Attribute_Schema for the selected Subcategory before persisting the product
7. IF a Seller submits a product with attributes that do not conform to the Attribute_Schema, THEN THE Product_Service SHALL return a 400 response with field-level validation errors
8. WHEN a product is successfully created, THE Product_Service SHALL store the categoryId, subcategoryId, and all Dynamic_Attributes as a structured map on the product record
9. THE Add_Product_Form SHALL include common fields across all categories: product name (text, required), description (text, required), price in INR (number, required), stock quantity (number, required), and product images (file upload, at least one required)

### Requirement 4: Category-Specific Product Detail Display

**User Story:** As a Buyer, I want product detail pages to show relevant attributes based on the product's category, so that I can make informed purchase decisions.

#### Acceptance Criteria

1. WHEN a Buyer views a product in the Footwear subcategory, THE Product_Detail_Page SHALL display available sizes, gender, age group, available colours, material, and sole type in a structured specifications section
2. WHEN a Buyer views a product in the Phones subcategory, THE Product_Detail_Page SHALL display brand, model, RAM, storage, display size, battery capacity, operating system, and colour options in a structured specifications section
3. WHEN a Buyer views a product in the Books subcategory, THE Product_Detail_Page SHALL display author, ISBN, publisher, language, number of pages, format, and edition in a structured specifications section
4. THE Product_Detail_Page SHALL render attribute labels using the display label from the Attribute_Schema
5. THE Product_Detail_Page SHALL group Dynamic_Attributes into a "Specifications" section separate from the product description and images
6. WHEN a Dynamic_Attribute has no value (optional field not filled), THE Product_Detail_Page SHALL omit that attribute from the display

### Requirement 5: Buyer Category Browsing Experience

**User Story:** As a Buyer, I want to browse products by navigating through categories and subcategories, so that I can discover products within my area of interest.

#### Acceptance Criteria

1. WHEN a Buyer navigates to the category browsing page, THE Catalogue_Service SHALL return all active top-level Categories with their names and icons
2. WHEN a Buyer selects a top-level Category, THE Catalogue_Service SHALL return the first-level tree of available Subcategories under that Category
3. WHEN a Buyer selects a Subcategory, THE Catalogue_Service SHALL return a paginated list of products belonging to that Subcategory, sorted by most recently listed first
4. THE Catalogue_Service SHALL support cursor-based pagination with a configurable page size (default 20 items) for subcategory product listings
5. WHILE a Buyer is browsing a Subcategory, THE Catalogue_Service SHALL display the category breadcrumb path (e.g., "Clothing > Footwear") for navigation context
6. THE Catalogue_Service SHALL exclude soft-deleted products from all category browsing results

### Requirement 6: Category-Specific Filtering

**User Story:** As a Buyer, I want to filter products within a subcategory by category-specific attributes, so that I can narrow down results to find exactly what I need.

#### Acceptance Criteria

1. WHEN a Buyer is browsing a Subcategory, THE Catalogue_Service SHALL present filterable attributes based on the Attribute_Schema for that Subcategory
2. WHEN a Buyer applies a filter on a single-select attribute (e.g., gender = Male), THE Catalogue_Service SHALL return only products matching that attribute value
3. WHEN a Buyer applies a filter on a multi-select attribute (e.g., size includes "IND 8"), THE Catalogue_Service SHALL return products where the attribute contains the selected value
4. WHEN a Buyer applies multiple filters simultaneously, THE Catalogue_Service SHALL return products matching all applied filter conditions (AND logic)
5. THE Catalogue_Service SHALL support price range filtering (minimum and maximum price in INR) across all subcategories
6. THE Catalogue_Service SHALL return the count of matching products for each filter option to help Buyers understand result distribution
7. IF no products match the applied filters, THEN THE Catalogue_Service SHALL return an empty result set with a total count of zero

### Requirement 7: Product Data Storage for Category Attributes

**User Story:** As a platform engineer, I want product records to store category-specific attributes in a flexible schema, so that the system can accommodate varying attribute sets across subcategories without schema migrations.

#### Acceptance Criteria

1. THE Product_Service SHALL store Dynamic_Attributes as a map (key-value structure) within the product DynamoDB item, keyed by attribute field name
2. THE Product_Service SHALL store the subcategoryId on each product record to enable attribute validation and schema lookups
3. THE Product_Service SHALL store the Attribute_Schema version used at product creation time on the product record
4. WHEN a Seller updates a product, THE Product_Service SHALL validate updated Dynamic_Attributes against the current Attribute_Schema for the product's Subcategory
5. THE Product_Service SHALL index products by subcategoryId using a Global Secondary Index to support efficient subcategory-based queries
6. THE Product_Service SHALL support querying products by subcategoryId with optional filter expressions on Dynamic_Attribute values

### Requirement 8: Seller Product Update with Category Attributes

**User Story:** As a Seller, I want to update category-specific attributes on my existing products, so that I can keep product information accurate and current.

#### Acceptance Criteria

1. WHEN a Seller edits an existing product, THE Add_Product_Form SHALL pre-populate all Dynamic_Attributes with their current values
2. THE Add_Product_Form SHALL render the form fields based on the Attribute_Schema for the product's existing Subcategory
3. THE Product_Service SHALL reject attempts to change a product's Category or Subcategory after creation
4. WHEN a Seller submits updated Dynamic_Attributes, THE Product_Service SHALL validate the updated values against the Attribute_Schema before persisting
5. IF the Attribute_Schema has been updated since the product was created, THEN THE Product_Service SHALL validate against the current schema version and update the stored schema version on successful save

### Requirement 9: Category Search Integration

**User Story:** As a Buyer, I want search results to include category-specific attributes in the response, so that I can quickly assess product relevance from search results.

#### Acceptance Criteria

1. WHEN a Buyer performs a product search, THE Catalogue_Service SHALL include the category name and subcategory name in each search result item
2. THE Catalogue_Service SHALL include up to three key Dynamic_Attributes (as defined by the Attribute_Schema's display priority) in search result items for quick preview
3. WHEN a Buyer performs a search, THE Catalogue_Service SHALL support filtering results by a specific Category or Subcategory
4. THE Catalogue_Service SHALL generate search tokens from Dynamic_Attribute values (brand, model, author) in addition to product name and description
