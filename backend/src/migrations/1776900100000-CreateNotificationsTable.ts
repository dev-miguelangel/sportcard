import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsTable1776900100000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "notifications_type_enum" AS ENUM ('broadcast', 'event', 'system')`,
    );

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"    UUID,
        "event_id"   UUID,
        "title"      VARCHAR     NOT NULL,
        "body"       TEXT        NOT NULL,
        "type"       "notifications_type_enum" NOT NULL DEFAULT 'system',
        "read_at"    TIMESTAMP,
        "created_at" TIMESTAMP   NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user"  FOREIGN KEY ("user_id")  REFERENCES "users"("id")  ON DELETE CASCADE,
        CONSTRAINT "FK_notifications_event" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_id" ON "notifications" ("user_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "notifications_type_enum"`);
  }
}
