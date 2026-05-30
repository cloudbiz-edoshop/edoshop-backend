export const nextCustomerCode = `
CREATE OR REPLACE FUNCTION next_customer_code()
RETURNS TEXT AS $$
DECLARE
    next_code TEXT;
    last_code TEXT;
    last_pure_code TEXT;
    prefix TEXT;
    first_letter CHAR(1);
    second_letter CHAR(1) DEFAULT NULL;
    number INT;
BEGIN
    -- Get the last customer code from the table, locking the row
    SELECT MAX(customer_code) INTO last_code FROM customers;


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

        -- Validate last_pure_code (example: two letters followed by two digits)
        IF last_pure_code !~ '^[A-Z]{1,2}[0-9]{2}$' THEN
            RAISE EXCEPTION 'Invalid customer_code format: %', last_pure_code;
        END IF;


        -- Extract the prefix (one or two letters) and number
        IF LENGTH(last_pure_code) >= 3 AND last_pure_code ~ '^[A-Z]{2}' THEN
            -- This is a two-letter prefix (like AA01)
            prefix := SUBSTRING(last_pure_code, 1, 2);
            first_letter := LEFT(prefix, 1);
            second_letter := RIGHT(prefix, 1);
            number := SUBSTRING(last_pure_code, 3)::INT;
        ELSE
            -- This is a single-letter prefix (like A01)
            prefix := LEFT(last_pure_code, 1);
            first_letter := prefix;
            second_letter := NULL;
            number := SUBSTRING(last_pure_code, 2)::INT;
        END IF;

        -- Increment the number
        number := number + 1;

        -- If the number exceeds 99, increment the letter pattern
        IF number > 99 THEN
            IF second_letter IS NULL THEN
                -- If we're at Z99, move to AA01
                IF first_letter = 'Z' THEN
                    first_letter := 'A';
                    second_letter := 'A';
                ELSE
                    -- Otherwise just increment the letter
                    first_letter := CHR(ASCII(first_letter) + 1);
                END IF;
            ELSE
                -- We already have two letters
                second_letter := CHR(ASCII(second_letter) + 1);

                -- If second letter exceeds Z, increment first letter and reset second
                IF second_letter > 'Z' THEN
                    first_letter := CHR(ASCII(first_letter) + 1);
                    second_letter := 'A';

                    -- If first letter exceeds Z after incrementing, we've exhausted the pattern
                    IF first_letter > 'Z' THEN
                        RAISE EXCEPTION 'Customer code limit reached (ZZ99)';
                    END IF;
                END IF;
            END IF;

            number := 1;
        END IF;

        -- Format the next code
        IF second_letter IS NULL THEN
            next_code := first_letter || LPAD(number::TEXT, 2, '0');
        ELSE
            next_code := first_letter || second_letter || LPAD(number::TEXT, 2, '0');
        END IF;
    END IF;

    RETURN next_code;
END;
$$ LANGUAGE plpgsql;
`;

export default nextCustomerCode;
