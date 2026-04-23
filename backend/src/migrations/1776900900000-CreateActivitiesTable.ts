import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateActivitiesTable1776900900000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "activities" (
        "id"               uuid      NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"          uuid      NOT NULL,
        "sport"            varchar   NOT NULL,
        "notes"            text,
        "duration_minutes" integer,
        "logged_at"        date      NOT NULL DEFAULT CURRENT_DATE,
        "created_at"       TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_activities" PRIMARY KEY ("id"),
        CONSTRAINT "FK_activities_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_activities_user_logged_at"
       ON "activities" ("user_id", "logged_at" DESC)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "activities"`);
  }
}
