import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContactTable1776900400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "contact" (
        "id"         uuid      NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"    uuid      NOT NULL,
        "contact_id" uuid      NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contact"              PRIMARY KEY ("id"),
        CONSTRAINT "UQ_contact_user_contact" UNIQUE ("user_id", "contact_id"),
        CONSTRAINT "FK_contact_user"
          FOREIGN KEY ("user_id")    REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_contact_contact"
          FOREIGN KEY ("contact_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "contact"`);
  }
}
