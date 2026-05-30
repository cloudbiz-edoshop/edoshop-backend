export const nextSeriesCode = `
CREATE OR REPLACE FUNCTION next_series_code(bundle_code TEXT)
RETURNS TEXT AS $$
DECLARE
    next_code TEXT;
    last_number INT;
BEGIN
    -- Compute the highest numeric suffix for this bundle
    SELECT COALESCE(MAX((regexp_match(series_code, '_S([0-9]+)$'))[1]::INT), 0)
    INTO last_number
    FROM series
    WHERE series_code LIKE bundle_code || '_S%';

    next_code := bundle_code || '_S' || (last_number + 1)::TEXT;

    RETURN next_code;
END;
$$ LANGUAGE plpgsql;
`;

export default nextSeriesCode;
