export const nextPackageCode = `
CREATE OR REPLACE FUNCTION next_package_code()
RETURNS TEXT AS $$
DECLARE
    next_code TEXT;
    last_number INT;
BEGIN
    -- Compute highest numeric suffix after 'PKG_'
    SELECT COALESCE(MAX((regexp_match(package_code, '^PKG_([0-9]+)$'))[1]::INT), 0)
    INTO last_number
    FROM packages
    WHERE package_code LIKE 'PKG_%';

    -- Next number with leading zero for < 10
    next_code := 'PKG_' || LPAD((last_number + 1)::TEXT, 2, '0');

    RETURN next_code;
END;
$$ LANGUAGE plpgsql;
`;

export default nextPackageCode;
