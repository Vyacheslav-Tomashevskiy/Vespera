import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentsTable1737816100000 implements MigrationInterface {
  name = 'CreatePaymentsTable1737816100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old rent_payments table as we're creating a new comprehensive payments table
    await queryRunner.query(`DROP TABLE IF EXISTS "rent_payments" CASCADE`);

    // Create the new payments table
    await queryRunner.query(`
            CREATE TABLE "payments" (
                "id" SERIAL PRIMARY KEY,
                "payment_id" VARCHAR(36) NOT NULL UNIQUE,
                "agreement_id" uuid NOT NULL,
                "amount" DECIMAL(12,2) NOT NULL,
                "payment_date" TIMESTAMP NOT NULL,
                "payment_method" VARCHAR(50),
                "reference_number" VARCHAR(100),
                "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                "notes" TEXT,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "fk_payments_agreement" 
                    FOREIGN KEY ("agreement_id") 
                    REFERENCES "rent_agreements"("id") 
                    ON DELETE CASCADE
            )
        `);

    // Create indexes for better query performance
    await queryRunner.query(
      `CREATE INDEX "idx_payments_agreement_id" ON "payments"("agreement_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_payment_date" ON "payments"("payment_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_status" ON "payments"("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_payment_id" ON "payments"("payment_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_payment_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_payment_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_agreement_id"`);

    // Drop the payments table
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);

    // Recreate the old rent_payments table
    await queryRunner.query(`
            CREATE TABLE "rent_payments" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "amount" numeric(10,2) NOT NULL,
                "status" character varying NOT NULL DEFAULT 'pending',
                "paid_at" TIMESTAMP NOT NULL DEFAULT now(),
                "contract_id" uuid,
                CONSTRAINT "PK_deca3deaaf83de65c31d5efe8a3" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            ALTER TABLE "rent_payments" 
            ADD CONSTRAINT "FK_e19b070b0b7c5324b5c248efcdd" 
            FOREIGN KEY ("contract_id") 
            REFERENCES "rent_agreements"("id") 
            ON DELETE NO ACTION 
            ON UPDATE NO ACTION
        `);
  }
}
