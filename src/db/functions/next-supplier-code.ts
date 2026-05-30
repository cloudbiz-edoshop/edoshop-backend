export const nextSupplierCode = `
CREATE OR REPLACE FUNCTION next_supplier_code()
RETURNS TEXT AS $$
DECLARE
    next_code TEXT;
    last_code TEXT;
    last_pure_code TEXT;
    letter CHAR(1);
    number INT;
BEGIN
    -- Get the last supplier code from the table
    SELECT MAX(supplier_code) INTO last_code FROM suppliers;

    IF last_code IS NULL THEN
        -- If no codes exist yet, start with A01
        next_code := 'A01';
    ELSE
        -- Extract the pure code part after the hyphen if it exists
        IF position('-' in last_code) > 0 THEN
            last_pure_code := substring(last_code from position('-' in last_code) + 1);
        ELSE
            last_pure_code := last_code;
        END IF;

        -- Extract the letter and number from the last code
        letter := LEFT(last_pure_code, 1);
        number := SUBSTRING(last_pure_code, 2)::INT;

        -- Increment the number
        number := number + 1;

        -- If the number exceeds 99, increment the letter
        IF number > 99 THEN
            letter := CHR(ASCII(letter) + 1);
            number := 1;
        END IF;

        -- Check if the letter has gone beyond Z. If so, this logic needs extending to handle AA01 etc.
        IF letter > 'Z' THEN
            RAISE EXCEPTION 'Supplier code limit reached (A-Z)'; -- Or implement a rollover mechanism
        END IF;

        -- Format the next code
        next_code := letter || LPAD(number::TEXT, 2, '0');
    END IF;

    RETURN next_code;
END;
$$ LANGUAGE plpgsql;

`;

export default nextSupplierCode;
