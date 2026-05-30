export const nextItemCode = `
CREATE OR REPLACE FUNCTION next_item_code(series_code TEXT)
RETURNS TEXT AS $$
DECLARE
    next_code TEXT;
    last_number INT;
BEGIN
    -- Compute the highest numeric suffix for this series
    SELECT COALESCE(MAX((regexp_match(item_code, '_I([0-9]+)$'))[1]::INT), 0)
    INTO last_number
    FROM items
    WHERE item_code LIKE series_code || '_I%';

    next_code := series_code || '_I' || (last_number + 1)::TEXT;

    RETURN next_code;
END;
$$ LANGUAGE plpgsql;
`;

export default nextItemCode;
