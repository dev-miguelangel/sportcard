import { MigrationInterface, QueryRunner } from 'typeorm';

// Charset: digits 1-9 + Spanish alphabet without Ñ (35 chars total)
const CHARSET = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export class AddStringIdToUser1745020800000 implements MigrationInterface {
  name = 'AddStringIdToUser1745020800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add column as nullable first so existing rows don't violate NOT NULL
    await queryRunner.query(
      `ALTER TABLE "users" ADD "stringId" character varying(6)`,
    );

    // Generate a unique 6-char ID from the allowed charset for each existing user.
    // Uses PostgreSQL to pick random chars from the 35-char charset string.
    await queryRunner.query(`
      UPDATE "users"
      SET "stringId" = (
        SELECT string_agg(
          substr('${CHARSET}', floor(random() * ${CHARSET.length} + 1)::int, 1),
          ''
        )
        FROM generate_series(1, 6)
      )
    `);

    // Enforce NOT NULL and uniqueness
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "stringId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_users_stringId" UNIQUE ("stringId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "UQ_users_stringId"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "stringId"`);
  }
}
