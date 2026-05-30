export const nextBundleCode = `
CREATE OR REPLACE FUNCTION next_bundle_code(supplier_code TEXT)
RETURNS TEXT AS $$
DECLARE
    next_code TEXT;
    last_number INT;
BEGIN
    -- Compute the highest numeric suffix for this supplier (treating the suffix as a number)
    SELECT COALESCE(MAX((regexp_match(bundle_code, '_B([0-9]+)$'))[1]::INT), 0)
    INTO last_number
    FROM bundles
    WHERE bundle_code LIKE supplier_code || '_B%';

    -- Always return the next number (handles no-rows case via COALESCE)
    next_code := supplier_code || '_B' || (last_number + 1)::TEXT;

    RETURN next_code;
END;
$$ LANGUAGE plpgsql;
`;

export default nextBundleCode;
