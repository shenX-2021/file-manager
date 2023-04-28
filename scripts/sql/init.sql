CREATE TABLE tb_user(
  account TEXT NOT NULL DEFAULT '',
  pwd TEXT NOT NULL DEFAULT '',
  salt TEXT NOT NULL DEFAULT ''
);

CREATE TABLE tb_file(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL DEFAULT '',
  file_hash TEXT UNIQUE NOT NULL DEFAULT '',
  start_hash TEXT NOT NULL DEFAULT '',
  end_hash TEXT NOT NULL DEFAULT '',
  file_path TEXT NOT NULL DEFAULT '',
  size INTEGER NOT NULL DEFAULT 0,
  status  INTEGER NOT NULL DEFAULT 0,
  check_status  INTEGER NOT NULL DEFAULT 0,
  gmt_created INTEGER NOT NULL DEFAULT 0,
  gmt_modified INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX file_name ON tb_file(file_name);

CREATE TABLE tb_version(
  version_no INTEGER NOT NULL DEFAULT 0
);

INSERT INTO tb_version(version_no) VALUES (1);
