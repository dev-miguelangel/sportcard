import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoleAndStatusToUser1776900000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "user_role_enum" AS ENUM ('user', 'admin')`);
    await queryRunner.query(`CREATE TYPE "user_status_enum" AS ENUM ('active', 'blocked')`);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "role"   "user_role_enum"   NOT NULL DEFAULT 'user',
        ADD COLUMN "status" "user_status_enum" NOT NULL DEFAULT 'active'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role", DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
    await queryRunner.query(`DROP TYPE "user_status_enum"`);
  }
}
