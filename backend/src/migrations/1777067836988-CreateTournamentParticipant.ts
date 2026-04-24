import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTournamentParticipant1777067836988 implements MigrationInterface {
    name = 'CreateTournamentParticipant1777067836988'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."tournament_participants_status_enum" AS ENUM('pending', 'approved', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "tournament_participants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tournament_id" uuid NOT NULL, "user_id" uuid NOT NULL, "status" "public"."tournament_participants_status_enum" NOT NULL DEFAULT 'approved', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_9c462cf47221792fdfe7a66a921" UNIQUE ("tournament_id", "user_id"), CONSTRAINT "PK_89ff15f4f125bcab7f5531dd501" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "share_token" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "share_token" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "tournament" ALTER COLUMN "share_token" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tournament" ALTER COLUMN "share_token" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "tournament_participants" ADD CONSTRAINT "FK_90bb0f064cef8d2ae4aaad10687" FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tournament_participants" ADD CONSTRAINT "FK_8836b1441db3023bcbc52718ca7" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tournament_participants" DROP CONSTRAINT "FK_8836b1441db3023bcbc52718ca7"`);
        await queryRunner.query(`ALTER TABLE "tournament_participants" DROP CONSTRAINT "FK_90bb0f064cef8d2ae4aaad10687"`);
        await queryRunner.query(`ALTER TABLE "tournament" ALTER COLUMN "share_token" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tournament" ALTER COLUMN "share_token" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "share_token" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "share_token" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`DROP TABLE "tournament_participants"`);
        await queryRunner.query(`DROP TYPE "public"."tournament_participants_status_enum"`);
    }

}
