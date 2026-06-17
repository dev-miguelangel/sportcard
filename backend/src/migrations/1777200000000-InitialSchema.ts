import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1777200000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // ── ENUMS ───────────────────────────────────────────────────────────────
    await queryRunner.query(`CREATE TYPE "user_role_enum"   AS ENUM ('user', 'admin')`);
    await queryRunner.query(`CREATE TYPE "user_status_enum" AS ENUM ('active', 'blocked')`);

    await queryRunner.query(`
      CREATE TYPE "events_status_enum" AS ENUM (
        'draft', 'open', 'closed', 'cancelled', 'finished'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "event_participants_status_enum" AS ENUM (
        'approved', 'pending', 'waiting', 'rejected'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "event_gender_enum" AS ENUM ('male', 'female', 'mixed', 'open')
    `);

    await queryRunner.query(`
      CREATE TYPE "notifications_type_enum" AS ENUM (
        'broadcast', 'event', 'system',
        'invitation', 'team_invite',
        'match_scheduled', 'match_result', 'tournament_update',
        'guardian_approval'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "tournament_format_enum" AS ENUM (
        'cup', 'league', 'groups_playoffs', 'points'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "tournament_status_enum" AS ENUM (
        'draft', 'open', 'in_progress', 'finished', 'cancelled'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "tournament_team_status_enum" AS ENUM ('pending', 'approved', 'rejected')
    `);

    await queryRunner.query(`
      CREATE TYPE "tournament_participants_status_enum" AS ENUM ('pending', 'approved', 'rejected')
    `);

    await queryRunner.query(`
      CREATE TYPE "team_member_status_enum" AS ENUM ('invited', 'confirmed', 'rejected')
    `);

    await queryRunner.query(`
      CREATE TYPE "match_status_enum" AS ENUM (
        'scheduled', 'played', 'cancelled', 'postponed'
      )
    `);

    // ── USERS ───────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"                   uuid                NOT NULL DEFAULT uuid_generate_v4(),
        "googleId"             character varying   NOT NULL,
        "email"                character varying   NOT NULL,
        "name"                 character varying   NOT NULL,
        "avatar"               character varying,
        "onboardingStep"       integer             NOT NULL DEFAULT 1,
        "role"                 "user_role_enum"    NOT NULL DEFAULT 'user',
        "status"               "user_status_enum"  NOT NULL DEFAULT 'active',
        "phone"                character varying,
        "birthDate"            date,
        "gender"               character varying,
        "city"                 character varying,
        "sports"               text[]              NOT NULL DEFAULT '{}',
        "bloodType"            character varying,
        "allergies"            character varying,
        "medicalConditions"    character varying,
        "medications"          character varying,
        "emergencyName"        character varying,
        "emergencyPhone"       character varying,
        "emergencyRelation"    character varying,
        "guardian_id"          uuid,
        "stringId"             character varying(6) NOT NULL DEFAULT '',
        "createdAt"            TIMESTAMP           NOT NULL DEFAULT now(),
        "updatedAt"            TIMESTAMP           NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users"            PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_googleId"   UNIQUE ("googleId"),
        CONSTRAINT "UQ_users_email"      UNIQUE ("email"),
        CONSTRAINT "UQ_users_stringId"   UNIQUE ("stringId"),
        CONSTRAINT "FK_users_guardian"
          FOREIGN KEY ("guardian_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // ── SPORTS ──────────────────────────────────────────────────────────────
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
        CONSTRAINT "PK_sports"      PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sports_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "sports" ("name", "icon", "emoji", "gradient", "order") VALUES
        ('Fútbol',      'sports_soccer',         '⚽', 'linear-gradient(135deg,#003d20,#006b35)',  0),
        ('Fútbol 7',    'sports_soccer',         '⚽', 'linear-gradient(135deg,#004d28,#007a40)',  1),
        ('Básquetbol',  'sports_basketball',     '🏀', 'linear-gradient(135deg,#5c1f00,#9c3d00)',  2),
        ('Tenis',       'sports_tennis',         '🎾', 'linear-gradient(135deg,#2d4a00,#4a7a00)',  3),
        ('Running',     'directions_run',        '🏃', 'linear-gradient(135deg,#003366,#0055aa)',  4),
        ('Ciclismo',    'directions_bike',       '🚴', 'linear-gradient(135deg,#002244,#003d7a)',  5),
        ('Natación',    'pool',                  '🏊', 'linear-gradient(135deg,#001f3f,#003d7a)',  6),
        ('Balonmano',   'sports_handball',       '🤾', 'linear-gradient(135deg,#1a0033,#3d0080)',  7),
        ('Trekking',    'hiking',                '🥾', 'linear-gradient(135deg,#1a0f00,#4a2d00)',  8),
        ('Escalada',    'landscape',             '🧗', 'linear-gradient(135deg,#0d1a00,#1f4000)',  9),
        ('Voleibol',    'sports_volleyball',     '🏐', 'linear-gradient(135deg,#1a1a00,#4a4a00)', 10),
        ('Pádel',       'sports_tennis',         '🏓', 'linear-gradient(135deg,#003322,#006644)', 11),
        ('Rugby',       'sports_rugby_football', '🏉', 'linear-gradient(135deg,#2d1600,#5c2d00)', 12),
        ('Crossfit',    'fitness_center',        '💪', 'linear-gradient(135deg,#1a0000,#4d0000)', 13),
        ('Yoga',        'self_improvement',      '🧘', 'linear-gradient(135deg,#1a001a,#3d003d)', 14)
    `);

    // ── TEAM ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "team" (
        "id"               uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "name"             varchar      NOT NULL,
        "sport"            varchar      NOT NULL,
        "coach_id"         uuid         NOT NULL,
        "logo_url"         varchar,
        "min_age"          integer,
        "max_age"          integer,
        "is_amateur"       boolean      NOT NULL DEFAULT false,
        "team_id"          varchar(11)  NOT NULL UNIQUE DEFAULT '',
        "icon_name"        varchar(100) NOT NULL DEFAULT 'shield',
        "background_color" varchar(7)   NOT NULL DEFAULT '#1e1e1e',
        "icon_color"       varchar(7)   NOT NULL DEFAULT '#00e87a',
        "created_at"       TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "PK_team" PRIMARY KEY ("id"),
        CONSTRAINT "FK_team_coach"
          FOREIGN KEY ("coach_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    // ── EVENTS ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "events" (
        "id"                  uuid                  NOT NULL DEFAULT uuid_generate_v4(),
        "sport"               varchar               NOT NULL,
        "type"                varchar               NOT NULL,
        "title"               varchar               NOT NULL,
        "description"         text,
        "location_name"       varchar               NOT NULL,
        "start_datetime"      TIMESTAMP             NOT NULL,
        "end_datetime"        TIMESTAMP,
        "max_participants"    integer,
        "is_public"           boolean               NOT NULL DEFAULT true,
        "requires_approval"   boolean               NOT NULL DEFAULT false,
        "share_token"         uuid                  NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
        "status"              "events_status_enum"  NOT NULL DEFAULT 'open',
        "organizer_id"        uuid                  NOT NULL,
        "closing_notes"       text,
        "results"             text,
        "min_age"             integer,
        "max_age"             integer,
        "gender"              "event_gender_enum",
        "challenger_team_id"  uuid,
        "challenged_team_id"  uuid,
        "created_at"          TIMESTAMP             NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMP             NOT NULL DEFAULT now(),
        CONSTRAINT "PK_events"           PRIMARY KEY ("id"),
        CONSTRAINT "FK_events_organizer"
          FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_events_challenger_team"
          FOREIGN KEY ("challenger_team_id") REFERENCES "team"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_events_challenged_team"
          FOREIGN KEY ("challenged_team_id") REFERENCES "team"("id") ON DELETE SET NULL
      )
    `);

    // ── EVENT PARTICIPANTS ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "event_participants" (
        "id"         UUID  NOT NULL DEFAULT uuid_generate_v4(),
        "event_id"   UUID  NOT NULL,
        "user_id"    UUID  NOT NULL,
        "status"     "event_participants_status_enum" NOT NULL,
        "message"    TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_event_participants"            PRIMARY KEY ("id"),
        CONSTRAINT "UQ_event_participants_event_user" UNIQUE ("event_id", "user_id"),
        CONSTRAINT "FK_event_participants_event"
          FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_event_participants_user"
          FOREIGN KEY ("user_id")  REFERENCES "users"("id")  ON DELETE CASCADE
      )
    `);

    // ── NOTIFICATIONS ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id"         UUID      NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"    UUID,
        "event_id"   UUID,
        "title"      VARCHAR   NOT NULL,
        "body"       TEXT      NOT NULL,
        "type"       "notifications_type_enum" NOT NULL DEFAULT 'system',
        "metadata"   jsonb,
        "read_at"    TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user"
          FOREIGN KEY ("user_id")  REFERENCES "users"("id")  ON DELETE CASCADE,
        CONSTRAINT "FK_notifications_event"
          FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_id" ON "notifications" ("user_id")`,
    );

    // ── CONTACT ──────────────────────────────────────────────────────────────
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

    // ── CONTACT GROUPS ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE contact_groups (
        id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name       VARCHAR     NOT NULL,
        description VARCHAR,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE contact_group_members (
        id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id   UUID        NOT NULL REFERENCES contact_groups(id) ON DELETE CASCADE,
        user_id    UUID        NOT NULL REFERENCES users(id)          ON DELETE CASCADE,
        added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_contact_group_member UNIQUE (group_id, user_id)
      )
    `);

    // ── TEAM MEMBER ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "team_member" (
        "id"        uuid      NOT NULL DEFAULT uuid_generate_v4(),
        "team_id"   uuid      NOT NULL,
        "user_id"   uuid      NOT NULL,
        "position"  varchar,
        "status"    "team_member_status_enum" NOT NULL DEFAULT 'invited',
        "joined_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_team_member"           PRIMARY KEY ("id"),
        CONSTRAINT "UQ_team_member_team_user" UNIQUE ("team_id", "user_id"),
        CONSTRAINT "FK_team_member_team"
          FOREIGN KEY ("team_id") REFERENCES "team"("id")  ON DELETE CASCADE,
        CONSTRAINT "FK_team_member_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // ── TOURNAMENT ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "tournament" (
        "id"                uuid                      NOT NULL DEFAULT uuid_generate_v4(),
        "name"              varchar                   NOT NULL,
        "sport"             varchar                   NOT NULL,
        "format"            "tournament_format_enum"  NOT NULL,
        "status"            "tournament_status_enum"  NOT NULL DEFAULT 'draft',
        "organizer_id"      uuid                      NOT NULL,
        "max_teams"         integer,
        "registration_open" boolean                   NOT NULL DEFAULT true,
        "requires_approval" boolean                   NOT NULL DEFAULT false,
        "share_token"       uuid                      NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
        "min_age"           integer,
        "max_age"           integer,
        "allow_individual"  boolean                   NOT NULL DEFAULT false,
        "start_date"        date,
        "end_date"          date,
        "created_at"        TIMESTAMP                 NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMP                 NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tournament" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tournament_organizer"
          FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    // ── TOURNAMENT TEAM ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "tournament_team" (
        "id"            uuid                          NOT NULL DEFAULT uuid_generate_v4(),
        "tournament_id" uuid                          NOT NULL,
        "team_id"       uuid                          NOT NULL,
        "status"        "tournament_team_status_enum" NOT NULL DEFAULT 'pending',
        "group_name"    varchar,
        "registered_at" TIMESTAMP                     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tournament_team"      PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tournament_team_pair" UNIQUE ("tournament_id", "team_id"),
        CONSTRAINT "FK_tournament_team_tournament"
          FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tournament_team_team"
          FOREIGN KEY ("team_id")       REFERENCES "team"("id")       ON DELETE CASCADE
      )
    `);

    // ── TOURNAMENT PARTICIPANTS ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "tournament_participants" (
        "id"            uuid                                  NOT NULL DEFAULT uuid_generate_v4(),
        "tournament_id" uuid                                  NOT NULL,
        "user_id"       uuid                                  NOT NULL,
        "status"        "tournament_participants_status_enum" NOT NULL DEFAULT 'approved',
        "created_at"    TIMESTAMP                             NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tournament_participants"            PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tournament_participants_pair"       UNIQUE ("tournament_id", "user_id"),
        CONSTRAINT "FK_tournament_participants_tournament"
          FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tournament_participants_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // ── MATCH ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "match" (
        "id"               uuid               NOT NULL DEFAULT uuid_generate_v4(),
        "tournament_id"    uuid               NOT NULL,
        "home_team_id"     uuid,
        "away_team_id"     uuid,
        "event_id"         uuid,
        "round"            varchar            NOT NULL,
        "bracket_position" integer,
        "next_match_id"    uuid,
        "home_score"       integer,
        "away_score"       integer,
        "home_penalties"   integer,
        "away_penalties"   integer,
        "status"           "match_status_enum" NOT NULL DEFAULT 'scheduled',
        "played_at"        TIMESTAMP,
        "created_at"       TIMESTAMP          NOT NULL DEFAULT now(),
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

    // ── ACTIVITIES ───────────────────────────────────────────────────────────
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
      `CREATE INDEX "IDX_activities_user_logged_at" ON "activities" ("user_id", "logged_at" DESC)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "activities"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "match"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tournament_participants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tournament_team"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tournament"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "team_member"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contact_group_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contact_groups"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contact"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "event_participants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "team"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "match_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "team_member_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tournament_participants_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tournament_team_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tournament_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tournament_format_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notifications_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "event_gender_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "event_participants_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "events_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
  }
}
