-- Phase 1: Tenant Vault Schema Migration
-- Applied Manual SQL for Tenant Integrations and Crypto Fields
BEGIN;
-- 1. Create Tenant Integrations Table
CREATE TABLE IF NOT EXISTS "tenant_integrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hospital_id" INTEGER NOT NULL,
    "provider_code" VARCHAR(50) NOT NULL,
    "client_id" VARCHAR(255),
    "client_secret_data" TEXT,
    "client_secret_iv" VARCHAR(32),
    "client_secret_tag" VARCHAR(32),
    "private_key_data" TEXT,
    "private_key_iv" VARCHAR(32),
    "private_key_tag" VARCHAR(32),
    "hfr_id" VARCHAR(100),
    "tier_level" VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_integrations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tenant_integrations_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- Unique index for Provider per Hospital
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_integrations_hospital_id_provider_code_key" ON "tenant_integrations"("hospital_id", "provider_code");
-- 2. Create Invoice Split Ledger (For Insurance/Split Billing)
CREATE TABLE IF NOT EXISTS "invoice_split_ledger" (
    "id" SERIAL NOT NULL,
    "hospital_id" INTEGER NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "payer_type" VARCHAR(20) NOT NULL,
    "claimed_amount" DECIMAL(10, 2) NOT NULL,
    "approved_amount" DECIMAL(10, 2),
    "tds_deducted" DECIMAL(10, 2),
    "net_receivable" DECIMAL(10, 2),
    "denial_reason" TEXT,
    "status" VARCHAR(50) NOT NULL,
    "workflow_id" VARCHAR(100),
    "ai_risk_score" DECIMAL(5, 2),
    "audit_reason" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoice_split_ledger_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "invoice_split_ledger_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoice_split_ledger_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "invoice_split_ledger_workflow_id_idx" ON "invoice_split_ledger"("workflow_id");
-- 3. Create Tenant Package Rates
CREATE TABLE IF NOT EXISTS "tenant_package_rates" (
    "id" SERIAL NOT NULL,
    "hospital_id" INTEGER NOT NULL,
    "service_code" VARCHAR(50) NOT NULL,
    "base_rate" DECIMAL(10, 2) NOT NULL,
    "contract_class" VARCHAR(50) NOT NULL,
    CONSTRAINT "tenant_package_rates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tenant_package_rates_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
COMMIT;