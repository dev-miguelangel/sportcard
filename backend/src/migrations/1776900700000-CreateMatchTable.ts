import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMatchTable1776900700000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "match_status_enum" AS ENUM (
        'scheduled', 'played', 'cancelled', 'postponed'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "match" (
        "id"               uuid      NOT NULL DEFAULT uuid_generate_v4(),
        "tournament_id"    uuid      NOT NULL,
        "home_team_id"     uuid,
        "away_team_id"     uuid,
        "event_id"         uuid,
        "round"            varchar   NOT NULL,
        "bracket_position" integer,
        "next_match_id"    uuid,
        "home_score"       integer,
        "away_score"       integer,
        "home_penalties"   integer,
        "away_penalties"   integer,
        "status"           "match_status_enum" NOT NULL DEFAULT 'scheduled',
        "played_at"        TIMESTAMP,
        "created_at"       TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_match" PRIMARY KEY ("id"),
        CONSTRAINT "FK_match_tournament"
          FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_match_home_team"
          FOREIGN KEY ("home_team_id")  REFERENCES "team"("id")       ON DELETE SET NULL,
        CONSTRAINT "FK_match_away_team"
          FOREIGN KEY ("away_team_id")  REFERENCES "team"("id")       ON DELETE SET NULL,
        CONSTRAINT "FK_match_event"
          FOREIGN KEY ("event_id")      REFERENCES "events"("id")     ON DELETE SET NULL,
        CONSTRAINT "FK_match_next_match"
          FOREIGN KEY ("next_match_id") REFERENCES "match"("id")      ON DELETE SET NULL
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "match"`);
    await queryRunner.query(`DROP TYPE  "match_status_enum"`);
  }
}
