export const nextDropshippingProductCode = `
CREATE OR REPLACE FUNCTION next_dropshipping_product_code(supplier_code TEXT, category_name TEXT)
RETURNS TEXT AS $$
DECLARE
    next_code TEXT;
    last_code TEXT;
    last_number TEXT;
    number INT;
    category_code TEXT;
BEGIN
    -- Convert category name to category code (first 3 letters, uppercase)
    category_code := UPPER(substring(category_name from 1 for 3));
    
    -- Get the last dropshipping product code for this supplier and category
    SELECT MAX(dp.dropshipping_code) INTO last_code
    FROM dropshipping_products dp
    JOIN products p ON dp.product_id = p.id
    JOIN product_categories pc ON p.id = pc.product_id
    JOIN categories c ON pc.category_id = c.id
    WHERE dp.dropshipping_code LIKE 'DS_' || supplier_code || '_' || category_code || '_P%';

    IF last_code IS NULL THEN
        -- If no codes exist yet, start with P1
        next_code := 'DS_' || supplier_code || '_' || category_code || '_P1';
    ELSE
        -- Extract the number part after the category code and '_P'
        last_number := substring(last_code from length('DS_' || supplier_code || '_' || category_code || '_P') + 1);
        
        -- Convert to integer and increment
        number := last_number::INT + 1;
        
        -- Format the next code
        next_code := 'DS_' || supplier_code || '_' || category_code || '_P' || number::TEXT;
    END IF;

    RETURN next_code;
END;
$$ LANGUAGE plpgsql;
`;

export default nextDropshippingProductCode;
