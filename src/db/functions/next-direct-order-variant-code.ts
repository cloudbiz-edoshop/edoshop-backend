export const nextDirectOrderVariantCode = `
CREATE OR REPLACE FUNCTION next_direct_order_variant_code(product_code TEXT, color_name TEXT, size_name TEXT)
RETURNS TEXT AS $$
DECLARE
    variant_code TEXT;
    color_code TEXT;
    size_code TEXT;
BEGIN
    -- Convert color name to color code (first 3 letters, uppercase)
    color_code := UPPER(substring(color_name from 1 for 3));
    
    -- Convert size name to size code (first 2 letters, uppercase)
    size_code := UPPER(substring(size_name from 1 for 2));
    
    -- Format: ProductCode_ColorCode_SizeCode
    variant_code := product_code || '_' || color_code || '_' || size_code;
    
    RETURN variant_code;
END;
$$ LANGUAGE plpgsql;
`;

export default nextDirectOrderVariantCode;
