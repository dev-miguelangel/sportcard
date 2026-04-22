import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTournamentTables1776900600000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "tournament_format_enum" AS ENUM (
        'cup', 'league', 'groups_playoffs', 'points'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "tournament_status_enum" AS ENUM (
        'draft', 'open', 'in_progress', 'finished'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tournament" (
        "id"                uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "name"              varchar      NOT NULL,
        "sport"             varchar      NOT NULL,
        "format"            "tournament_format_enum" NOT NULL,
        "status"            "tournament_status_enum" NOT NULL DEFAULT 'draft',
        "organizer_id"      uuid         NOT NULL,
        "max_teams"         integer,
        "registration_open" boolean      NOT NULL DEFAULT true,
        "requires_approval" boolean      NOT NULL DEFAULT false,
        "share_token"       uuid         NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
        "start_date"        date,
        "end_date"          date,
        "created_at"        TIMESTAMP    NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tournament" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tournament_organizer"
          FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "tournament_team_status_enum" AS ENUM (
        'pending', 'approved', 'rejected'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tournament_team" (
        "id"            uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "tournament_id" uuid         NOT NULL,
        "team_id"       uuid         NOT NULL,
        "status"        "tournament_team_status_enum" NOT NULL DEFAULT 'pending',
        "group_name"    varchar,
        "registered_at" TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tournament_team"             PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tournament_team_pair"        UNIQUE ("tournament_id", "team_id"),
        CONSTRAINT "FK_tournament_team_tournament"
          FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tournament_team_team"
          FOREIGN KEY ("team_id")       REFERENCES "team"("id")       ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tournament_team"`);
    await queryRunner.query(`DROP TYPE  "tournament_team_status_enum"`);
    await queryRunner.query(`DROP TABLE "tournament"`);
    await queryRunner.query(`DROP TYPE  "tournament_status_enum"`);
    await queryRunner.query(`DROP TYPE  "tournament_format_enum"`);
  }
}
