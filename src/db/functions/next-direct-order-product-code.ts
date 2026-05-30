export const nextDirectOrderProductCode = `
CREATE OR REPLACE FUNCTION next_direct_order_product_code(bundle_code TEXT)
RETURNS TEXT AS $$
DECLARE
    next_code TEXT;
    last_code TEXT;
    last_number TEXT;
    number INT;
BEGIN
    -- Get the last direct order product code for this bundle
    SELECT MAX(dop.direct_order_code) INTO last_code
    FROM direct_order_products dop
    JOIN products p ON dop.product_id = p.id
    WHERE dop.direct_order_code LIKE 'DO_' || bundle_code || '_P%';

    IF last_code IS NULL THEN
        -- If no codes exist yet, start with P1
        next_code := 'DO_' || bundle_code || '_P1';
    ELSE
        -- Extract the number part after the bundle code and '_P'
        last_number := substring(last_code from length('DO_' || bundle_code || '_P') + 1);
        
        -- Convert to integer and increment
        number := last_number::INT + 1;
        
        -- Format the next code
        next_code := 'DO_' || bundle_code || '_P' || number::TEXT;
    END IF;

    RETURN next_code;
END;
$$ LANGUAGE plpgsql;
`;

export default nextDirectOrderProductCode;
