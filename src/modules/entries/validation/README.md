# Entry Validation System

## Overview

This document describes the improved validation system for entry operations, which replaces the previous complex Zod-based validation with a layered approach that separates concerns and improves maintainability.

## Architecture

The validation system follows a **3-layer approach**:

### Layer 1: Schema Validation (Zod)

- **Purpose**: Basic data type validation and input sanitization
- **Location**: `entries.schema.ts`
- **Responsibilities**:
  - Type checking (string, number, boolean)
  - Basic constraints (min length, positive numbers)
  - Required field validation
  - Data format validation (dates, IDs)

### Layer 2: Business Logic Validation

- **Purpose**: Entry type and state-specific field requirements
- **Location**: `validation/validators/`
- **Responsibilities**:
  - Field requirement validation based on entry type and state
  - Cross-field business rule validation
  - Code format validation (e.g., series code must start with bundle code)

### Layer 3: Database Constraints Validation

- **Purpose**: Entity existence and referential integrity
- **Location**: `validation/validators/database-constraints.validator.ts`
- **Responsibilities**:
  - Validate that referenced entities exist in the database
  - Check foreign key constraints
  - Validate code uniqueness

## Validation Flow

```
Request Data
     ↓
[Layer 1] Zod Schema Validation
     ↓
[Layer 2] Business Logic Validation
     ↓
[Layer 3] Database Constraints Validation
     ↓
Service Logic
```

## Entry Type Validators

### BundleValidator

**New Bundles:**

- `supplierCode` (required)
- `productCode` (optional)

**Returned Bundles:**

- Not allowed (throws error)

### SeriesValidator

**New Series:**

- `supplierCode` (required)
- `bundleCode` (required)
- `colorId` (required)
- `productCode` (optional)

**Business Rules:**

- Bundle code must start with supplier code followed by "\_B"

**Returned Series:**

- `seriesCode` (required)
- `colorId` (required)
- `customerCode` OR `customerName` (required)

### ItemValidator

**New Items:**

- `supplierCode` (required)
- `bundleCode` (required)
- `colorId` (required)
- `seriesCode` (required)
- `sizeId` (required)

**Business Rules:**

- Item code must start with series code
- Item code must start with bundle code

**Returned Items:**

- `itemCode` (required)
- `colorId` (required)
- `sizeId` (required)
- `customerCode` OR `customerName` (required)

### PackageValidator

**New Packages:**

- `supplierCode` (required)
- `colorId` (required)
- `sizeId` (required)
- `customerCode` (required)
- `customerName` (required)
- `itemCode` (required)
- `binLocation` (required)

**Returned Packages:**

- `packageCode` (required)
- `orderId` (required)
- `customerCode` OR `customerName` (required)

## Usage

### In Service Layer

```typescript
import { EntryValidationService } from "./validation/entry-validation.service";

export class EntriesService {
  private readonly validationService: EntryValidationService;

  constructor() {
    this.validationService = new EntryValidationService();
  }

  async createEntry(entryData: CreateEntriesRequest): Promise<CreateEntriesResponse> {
    // Run all validation layers
    await this.validationService.validate(entryData);

    // Proceed with business logic
    // ...
  }
}
```

### Adding New Validators

1. Create a new validator class extending `BaseEntryValidator`
2. Implement `validateFieldRequirements` method
3. Optionally implement `validateBusinessRules` method
4. Register the validator in `EntryValidationService`

Example:

```typescript
export class CustomValidator extends BaseEntryValidator {
  validateFieldRequirements(data: CreateEntriesRequest): void {
    const requiredFields = ["field1", "field2"];
    this.validateRequiredFields(data, requiredFields, "Custom error message");
  }

  validateBusinessRules(data: CreateEntriesRequest): void {
    // Custom business logic
  }
}
```

## Benefits

### 1. Separation of Concerns

- **Schema**: Handles data types and basic validation
- **Business Logic**: Handles entry-specific rules
- **Database**: Handles entity existence

### 2. Maintainability

- Each validator focuses on a specific entry type
- Business rules are clearly separated from data validation
- Easy to modify or extend validation logic

### 3. Performance

- Database validations are optimized with parallel queries
- Can implement caching for frequently validated entities
- Validation fails fast at appropriate layers

### 4. Testability

- Each validator can be tested independently
- Clear separation makes unit testing easier
- Mock database calls for isolated testing

### 5. Extensibility

- Easy to add new entry types
- Simple to add new validation rules
- Flexible architecture for future requirements

## Migration Notes

### From Old System

The previous system used complex Zod `.refine()` chains that mixed data validation with business logic. The new system:

- Removes complex `.refine()` logic from Zod schemas
- Moves business logic to dedicated validator classes
- Separates database validation from field validation
- Provides better error messages and validation flow

### Backward Compatibility

- The same `CreateEntriesRequest` type is maintained
- API endpoints remain unchanged
- Error messages are improved but maintain similar structure

## File Structure

```
src/modules/entries/
├── validation/
│   ├── entry-validation.service.ts    # Main validation orchestrator
│   ├── index.ts                       # Export barrel
│   └── validators/
│       ├── base.validator.ts          # Base validator interface
│       ├── bundle.validator.ts        # Bundle-specific validation
│       ├── series.validator.ts        # Series-specific validation
│       ├── item.validator.ts          # Item-specific validation
│       ├── package.validator.ts       # Package-specific validation
│       └── database-constraints.validator.ts  # DB validation
├── entries.schema.ts                  # Simplified Zod schemas
└── entries.service.ts                 # Updated to use new validation
```

## Error Handling

The validation system provides clear, actionable error messages:

- **Schema errors**: Data type and format issues
- **Business logic errors**: Missing required fields for specific entry types
- **Database errors**: Entity not found or referential integrity issues

Each layer throws appropriate errors that bubble up to the API response with meaningful messages for the client.
