export const nextWarehouseTransferCode = `
CREATE OR REPLACE FUNCTION next_warehouse_transfer_code()
RETURNS TEXT AS $$
DECLARE
    next_code TEXT;
    last_id INT;
BEGIN
    -- Get the latest warehouse transfer ID
    SELECT COALESCE(MAX(id), 0)
    INTO last_id
    FROM warehouse_transfers;

    -- Generate next warehouse transfer code
    next_code := 'WT_' || LPAD((last_id + 1)::TEXT, 9, '0');

    RETURN next_code;
END;
$$ LANGUAGE plpgsql;
`;
export default nextWarehouseTransferCode;

// -- Create sequence (if it doesn't exist)
// CREATE SEQUENCE IF NOT EXISTS warehouse_transfer_seq START 1;

// -- Function to generate next warehouse transfer code
// CREATE OR REPLACE FUNCTION next_warehouse_transfer_code()
// RETURNS TEXT AS $$
// DECLARE
//     next_num INT;
// BEGIN
//     next_num := nextval('warehouse_transfer_seq');  -- get next number
//     RETURN 'WT_' || LPAD(next_num::TEXT, 6, '0');   -- pad to 6 digits
// END;
// $$ LANGUAGE plpgsql;
