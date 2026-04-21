import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEventsTable1776816000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "events_status_enum" AS ENUM (
        'draft', 'open', 'closed', 'cancelled', 'finished'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "events" (
        "id"                  uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "sport"               varchar     NOT NULL,
        "type"                varchar     NOT NULL,
        "title"               varchar     NOT NULL,
        "description"         text,
        "location_name"       varchar     NOT NULL,
        "start_datetime"      TIMESTAMP   NOT NULL,
        "end_datetime"        TIMESTAMP,
        "max_participants"    integer,
        "is_public"           boolean     NOT NULL DEFAULT true,
        "requires_approval"   boolean     NOT NULL DEFAULT false,
        "share_token"         uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "status"              "events_status_enum" NOT NULL DEFAULT 'open',
        "organizer_id"        uuid        NOT NULL,
        "created_at"          TIMESTAMP   NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMP   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_events"              PRIMARY KEY ("id"),
        CONSTRAINT "UQ_events_share_token"  UNIQUE ("share_token"),
        CONSTRAINT "FK_events_organizer"    FOREIGN KEY ("organizer_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "events"`);
    await queryRunner.query(`DROP TYPE "events_status_enum"`);
  }
}
