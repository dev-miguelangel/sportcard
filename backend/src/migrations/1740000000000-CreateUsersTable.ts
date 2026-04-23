import { MigrationInterface, QueryRunner } from 'typeorm';

// Creates the base users table for fresh installs.
// Columns added by incremental migrations (stringId, onboarding fields, role, status)
// are intentionally omitted — those migrations run after this one.
// Uses IF NOT EXISTS so existing databases (where the table was auto-created by
// TypeORM synchronize before the migration system was introduced) are unaffected.
export class CreateUsersTable1740000000000 implements MigrationInterface {
    name = 'CreateUsersTable1740000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"             uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "googleId"       character varying NOT NULL,
        "email"          character varying NOT NULL,
        "name"           character varying NOT NULL,
        "avatar"         character varying,
        "onboardingStep" integer       NOT NULL DEFAULT 1,
        "createdAt"      TIMESTAMP     NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMP     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_googleId" UNIQUE ("googleId"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    }
}
