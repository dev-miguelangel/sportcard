import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEventParticipantsTable1776816100000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "event_participants_status_enum" AS ENUM ('approved', 'pending', 'waiting', 'rejected')
    `);

    await queryRunner.query(`
      CREATE TABLE "event_participants" (
        "id"         UUID NOT NULL DEFAULT uuid_generate_v4(),
        "event_id"   UUID NOT NULL,
        "user_id"    UUID NOT NULL,
        "status"     "event_participants_status_enum" NOT NULL,
        "message"    TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_event_participants" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_event_participants_event_user" UNIQUE ("event_id", "user_id"),
        CONSTRAINT "FK_event_participants_event" FOREIGN KEY ("event_id")
          REFERENCES "events"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_event_participants_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "event_participants"`);
    await queryRunner.query(`DROP TYPE "event_participants_status_enum"`);
  }
}
