# Database Sequence Management

## Problem

When seeding database tables with explicit IDs in PostgreSQL, the auto-increment sequences don't automatically update. This causes conflicts when trying to insert new records after seeding, as the sequence will generate IDs that already exist.

For example, if you seed `warehouse_transfers` with IDs 1-10, the sequence `warehouse_transfers_id_seq` will still be at 1, causing the next insert to fail with a unique constraint violation.

## Solution

We've implemented an automatic sequence reset mechanism that runs after seeding to ensure all sequences are properly synchronized with the maximum ID values in their respective tables.

### How It Works

1. **Automatic Reset During Seeding**: The `resetAllSequences()` function is called at the end of the seeding process
2. **Safe Sequence Updates**: For each table with an auto-incrementing ID, the sequence is set to the maximum ID value
3. **Error Handling**: Tables without sequences (e.g., junction tables) are safely skipped

### Usage

#### During Regular Seeding

The sequence reset happens automatically when you run:

```bash
pnpm db:seed
```

This will:

1. Truncate all tables
2. Seed data with explicit IDs
3. Reset all sequences to match the maximum IDs
4. Display progress for each table

#### Manual Sequence Reset

If you manually insert data with explicit IDs (e.g., through SQL scripts), you can reset sequences without re-seeding:

```bash
pnpm db:reset-sequences
```

This standalone command will:

1. Connect to the database
2. Reset all sequences for all tables
3. Display which sequences were updated or skipped

### Files

- **[src/db/reset-sequences.ts](edoshop-backend/src/db/reset-sequences.ts)**: Core utility function that resets sequences
- **[src/db/run-reset-sequences.ts](edoshop-backend/src/db/run-reset-sequences.ts)**: Standalone script for manual sequence reset
- **[src/db/seed.ts](edoshop-backend/src/db/seed.ts)**: Main seeding script (calls `resetAllSequences()` at the end)

### Technical Details

The sequence reset uses the following SQL pattern for each table:

```sql
SELECT setval('table_name_id_seq', COALESCE((SELECT MAX(id) FROM table_name), 1), true);
```

This command:

- Finds the maximum ID in the table
- Sets the sequence to that value
- Uses `COALESCE` to handle empty tables (sets to 1)
- The `true` parameter ensures the next value will be `max_id + 1`

### Adding New Tables

When adding new tables with auto-incrementing IDs:

1. Add the table to the import in [src/db/models/index.ts](edoshop-backend/src/db/models/index.ts)
2. Add the table to the `tables` array in [src/db/reset-sequences.ts](edoshop-backend/src/db/reset-sequences.ts#L57-L149)
3. The sequence will automatically be reset during seeding

### Output Example

When running `pnpm db:seed`, you'll see output like:

```
=== Resetting sequences ===

✓ Reset sequence for countries
✓ Reset sequence for cities
✓ Reset sequence for warehouse_transfers
⊘ Skipped product_tags (no sequence found)
...

=== Sequence reset complete ===
```

### Benefits

1. **Automatic**: No manual intervention needed after seeding
2. **Safe**: Handles tables without sequences gracefully
3. **Comprehensive**: Covers all tables in the database
4. **Flexible**: Can be run independently when needed
5. **Visible**: Clear logging shows which sequences were reset

### Troubleshooting

If you encounter ID conflicts after seeding:

1. Check if the table is included in the `tables` array in `reset-sequences.ts`
2. Run `pnpm db:reset-sequences` manually to fix the issue
3. Verify the sequence exists: `SELECT * FROM pg_sequences WHERE schemaname = 'public';`
4. Check the current sequence value: `SELECT currval('table_name_id_seq');`
