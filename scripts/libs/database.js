const sqlite = require('sqlite3');
const fse = require('fs-extra');
const path = require('path');
const { printSuccess } = require('./print');

class Database {
  constructor(dbPath) {
    this.db = new sqlite.Database(dbPath);
  }

  init() {
    return new Promise((resolve, reject) => {
      const initSQL = fse
        .readFileSync(path.join(__dirname, '../sql/init.sql'))
        .toString();
      this.db.exec(initSQL, (err) => {
        if (err) return reject(err);

        resolve();
      });
    });
  }

  run(sql, params) {
    return new Promise((resolve, reject) => {
      this.db.prepare(sql).run(params, (err) => {
        if (err) {
          return reject(err);
        }

        resolve();
      });
    });
  }
}

module.exports = {
  Database,
};
