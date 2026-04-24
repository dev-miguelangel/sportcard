import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSportsTable1776901000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sports" (
        "id"         SERIAL      NOT NULL,
        "name"       varchar     NOT NULL,
        "icon"       varchar     NOT NULL,
        "emoji"      varchar     NOT NULL,
        "gradient"   varchar     NOT NULL,
        "is_active"  boolean     NOT NULL DEFAULT true,
        "order"      integer     NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sports"       PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sports_name"  UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "sports" ("name", "icon", "emoji", "gradient", "order") VALUES
        ('Fútbol',      'sports_soccer',        '⚽', 'linear-gradient(135deg,#003d20,#006b35)',  0),
        ('Fútbol 7',    'sports_soccer',        '⚽', 'linear-gradient(135deg,#004d28,#007a40)',  1),
        ('Básquetbol',  'sports_basketball',    '🏀', 'linear-gradient(135deg,#5c1f00,#9c3d00)',  2),
        ('Tenis',       'sports_tennis',        '🎾', 'linear-gradient(135deg,#2d4a00,#4a7a00)',  3),
        ('Running',     'directions_run',       '🏃', 'linear-gradient(135deg,#003366,#0055aa)',  4),
        ('Ciclismo',    'directions_bike',      '🚴', 'linear-gradient(135deg,#002244,#003d7a)',  5),
        ('Natación',    'pool',                 '🏊', 'linear-gradient(135deg,#001f3f,#003d7a)',  6),
        ('Balonmano',   'sports_handball',      '🤾', 'linear-gradient(135deg,#1a0033,#3d0080)',  7),
        ('Trekking',    'hiking',               '🥾', 'linear-gradient(135deg,#1a0f00,#4a2d00)',  8),
        ('Escalada',    'landscape',            '🧗', 'linear-gradient(135deg,#0d1a00,#1f4000)',  9),
        ('Voleibol',    'sports_volleyball',    '🏐', 'linear-gradient(135deg,#1a1a00,#4a4a00)', 10),
        ('Pádel',       'sports_tennis',        '🏓', 'linear-gradient(135deg,#003322,#006644)', 11),
        ('Rugby',       'sports_rugby_football','🏉', 'linear-gradient(135deg,#2d1600,#5c2d00)', 12),
        ('Crossfit',    'fitness_center',       '💪', 'linear-gradient(135deg,#1a0000,#4d0000)', 13),
        ('Yoga',        'self_improvement',     '🧘', 'linear-gradient(135deg,#1a001a,#3d003d)', 14)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sports"`);
  }
}
