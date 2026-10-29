CREATE TABLE IF NOT EXISTS "customer_wallet_settings" (
  "id" serial PRIMARY KEY,
  "wallet_enabled" boolean NOT NULL DEFAULT false,
  "deposits_enabled" boolean NOT NULL DEFAULT true,
  "withdrawals_enabled" boolean NOT NULL DEFAULT false,
  "withdrawal_fee_percent" numeric(5, 2) NOT NULL DEFAULT 2,
  "withdrawal_fee_min_xaf" numeric(12, 2) NOT NULL DEFAULT 500,
  "min_withdrawal_xaf" numeric(12, 2) NOT NULL DEFAULT 1000,
  "max_withdrawal_xaf" numeric(12, 2) NOT NULL DEFAULT 5000000,
  "withdrawal_requires_approval" boolean NOT NULL DEFAULT true,
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "updated_by" integer REFERENCES "users"("id")
);

INSERT INTO "customer_wallet_settings" ("wallet_enabled")
SELECT false
WHERE NOT EXISTS (SELECT 1 FROM "customer_wallet_settings");

CREATE TABLE IF NOT EXISTS "customer_wallets" (
  "id" serial PRIMARY KEY,
  "customer_id" integer NOT NULL REFERENCES "customers"("id"),
  "currency" varchar(3) NOT NULL,
  "available_balance" numeric(14, 2) NOT NULL DEFAULT 0,
  "reserved_balance" numeric(14, 2) NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "customer_wallets_customer_currency_unique" UNIQUE ("customer_id", "currency"),
  CONSTRAINT "customer_wallets_available_nonneg" CHECK ("available_balance" >= 0),
  CONSTRAINT "customer_wallets_reserved_nonneg" CHECK ("reserved_balance" >= 0)
);

CREATE TABLE IF NOT EXISTS "customer_wallet_deposits" (
  "id" serial PRIMARY KEY,
  "customer_id" integer NOT NULL REFERENCES "customers"("id"),
  "amount" numeric(14, 2) NOT NULL,
  "currency" varchar(3) NOT NULL DEFAULT 'XAF',
  "payment_method_id" integer REFERENCES "payment_methods"("id"),
  "payment_status" varchar(32) NOT NULL DEFAULT 'pending',
  "transaction_reference" varchar(100),
  "credited_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "customer_wallet_withdrawals" (
  "id" serial PRIMARY KEY,
  "customer_id" integer NOT NULL REFERENCES "customers"("id"),
  "amount" numeric(14, 2) NOT NULL,
  "fee_amount" numeric(14, 2) NOT NULL DEFAULT 0,
  "net_amount" numeric(14, 2) NOT NULL,
  "currency" varchar(3) NOT NULL DEFAULT 'XAF',
  "status" varchar(32) NOT NULL DEFAULT 'pending',
  "customer_note" text,
  "admin_note" text,
  "reviewed_by" integer REFERENCES "users"("id"),
  "reviewed_at" timestamp,
  "paid_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "customer_wallet_transactions" (
  "id" serial PRIMARY KEY,
  "customer_id" integer NOT NULL REFERENCES "customers"("id"),
  "wallet_id" integer NOT NULL REFERENCES "customer_wallets"("id"),
  "transaction_type" varchar(32) NOT NULL,
  "amount" numeric(14, 2) NOT NULL,
  "currency" varchar(3) NOT NULL,
  "available_balance_after" numeric(14, 2) NOT NULL,
  "reserved_balance_after" numeric(14, 2) NOT NULL,
  "reference" varchar(100),
  "reason" text,
  "order_id" integer REFERENCES "orders"("id"),
  "deposit_id" integer REFERENCES "customer_wallet_deposits"("id"),
  "withdrawal_id" integer REFERENCES "customer_wallet_withdrawals"("id"),
  "created_by" integer REFERENCES "users"("id"),
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "customer_wallet_tx_customer_id_idx"
  ON "customer_wallet_transactions" ("customer_id", "created_at" DESC);
