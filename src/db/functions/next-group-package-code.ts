export const nextGroupPackageCode = `
CREATE OR REPLACE FUNCTION next_group_package_code()
RETURNS TEXT AS $$
DECLARE
    next_code TEXT;
    last_number INT;
BEGIN
    SELECT COALESCE(MAX((regexp_match(group_package_code, '^GPKG-([0-9]+)$'))[1]::INT), 0)
    INTO last_number
    FROM group_packages
    WHERE group_package_code LIKE 'GPKG-%';

    next_code := 'GPKG-' || LPAD((last_number + 1)::TEXT, 4, '0');

    RETURN next_code;
END;
$$ LANGUAGE plpgsql;
`;

export default nextGroupPackageCode;
