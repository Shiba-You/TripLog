-- docs/domain/01_基本設計/04_データモデル.md の全12テーブルをそのまま転記したもの。
-- 画面固有のビジネスロジックはここに追加しない。

CREATE EXTENSION IF NOT EXISTS postgis;

-- users（ユーザー）
CREATE TABLE users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name  text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- devices（端末・プッシュトークン）
CREATE TABLE devices (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users (id),
    platform     text NOT NULL,
    apns_token   text NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

-- trips（旅行 / ラベル単位）
CREATE TABLE trips (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users (id),
    name         text NOT NULL,
    description  text,
    color        text NOT NULL,
    started_on   date,
    ended_on     date,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

-- tracks（トラック / トラッキングセッション or インポートGPX）
CREATE TABLE tracks (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id         uuid NOT NULL REFERENCES trips (id),
    user_id         uuid NOT NULL REFERENCES users (id),
    source          text NOT NULL,
    status          text NOT NULL,
    started_at      timestamptz,
    ended_at        timestamptz,
    last_point_at   timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- track_points（トラックポイント / 位置情報の1点）
CREATE TABLE track_points (
    id            bigserial PRIMARY KEY,
    track_id      uuid NOT NULL REFERENCES tracks (id),
    user_id       uuid NOT NULL REFERENCES users (id),
    geom          geography(Point, 4326) NOT NULL,
    elevation_m   double precision,
    speed_mps     double precision,
    accuracy_m    double precision,
    recorded_at   timestamptz NOT NULL
);

CREATE INDEX idx_track_points_geom ON track_points USING GIST (geom);
CREATE INDEX idx_track_points_track_id_recorded_at ON track_points (track_id, recorded_at);

-- regions（行政区画 参照データ）
CREATE TABLE regions (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    region_type   text NOT NULL,
    code          text NOT NULL,
    name          text NOT NULL,
    parent_id     uuid REFERENCES regions (id),
    geom          geometry(MultiPolygon, 4326) NOT NULL
);

CREATE INDEX idx_regions_geom ON regions USING GIST (geom);
CREATE INDEX idx_regions_region_type_code ON regions (region_type, code);

-- visited_regions（訪問済みエリア / トロフィー）
CREATE TABLE visited_regions (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            uuid NOT NULL REFERENCES users (id),
    region_id          uuid NOT NULL REFERENCES regions (id),
    first_visited_at   timestamptz NOT NULL,
    first_trip_id      uuid REFERENCES trips (id),
    CONSTRAINT uq_visited_regions_user_region UNIQUE (user_id, region_id)
);

-- photos（写真）
CREATE TABLE photos (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id          uuid NOT NULL REFERENCES trips (id),
    user_id          uuid NOT NULL REFERENCES users (id),
    track_point_id   bigint REFERENCES track_points (id),
    geom             geography(Point, 4326),
    location_source  text NOT NULL,
    taken_at         timestamptz,
    r2_object_key    text NOT NULL,
    thumbnail_key    text,
    width            int,
    height           int,
    exif             jsonb,
    created_at       timestamptz NOT NULL DEFAULT now()
);

-- expenses（家計簿 / 旅費）
CREATE TABLE expenses (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id       uuid NOT NULL REFERENCES trips (id),
    user_id       uuid NOT NULL REFERENCES users (id),
    category      text NOT NULL,
    amount        numeric(12, 2) NOT NULL,
    currency      text NOT NULL,
    description   text,
    spent_at      timestamptz NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- comments（コメント / 日記）
-- target_type / target_id はポリモーフィック参照のため、DBレベルのFKは張らずサービス層で存在を検証する。
CREATE TABLE comments (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid NOT NULL REFERENCES users (id),
    target_type   text NOT NULL,
    target_id     uuid NOT NULL,
    body          text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_target ON comments (target_type, target_id, created_at);

-- ai_chat_sessions（AIチャット セッション）
CREATE TABLE ai_chat_sessions (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users (id),
    trip_id      uuid REFERENCES trips (id),
    title        text,
    created_at   timestamptz NOT NULL DEFAULT now()
);

-- ai_chat_messages（AIチャット メッセージ）
CREATE TABLE ai_chat_messages (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   uuid NOT NULL REFERENCES ai_chat_sessions (id),
    role         text NOT NULL,
    content      text NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now()
);
