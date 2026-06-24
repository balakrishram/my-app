# Database migration: rename + drop columns on `holdings`

Run these against your **existing** MySQL database (the one that already
has your real holdings in it). This does not touch any rows — only column
names/definitions.

## 0. Back up first

```bash
mysqldump -u root -p stocksage holdings > holdings_backup.sql
```

If anything goes wrong you can restore with:
```bash
mysql -u root -p stocksage < holdings_backup.sql
```

## 1. Connect to MySQL

```bash
mysql -u root -p stocksage
```

## 2. Check current structure (optional, just to see what you have)

```sql
DESCRIBE holdings;
```

## 3. Rename the columns

Requires MySQL 8.0+ / MariaDB 10.5+ (for `RENAME COLUMN`). If your version
is older, see the alternative at the bottom of this file.

```sql
ALTER TABLE holdings RENAME COLUMN symbol  TO ticker;
ALTER TABLE holdings RENAME COLUMN avgCost TO avgPurchasePrice;
ALTER TABLE holdings RENAME COLUMN ltp     TO currentPrice;
```

## 4. Drop the day-change column

```sql
ALTER TABLE holdings DROP COLUMN dayChgPct;
```

## 5. Verify

```sql
DESCRIBE holdings;
SELECT * FROM holdings LIMIT 5;
```

You should see columns: `ticker, name, qty, avgPurchasePrice, currentPrice`
— nothing else — and your existing rows/values unchanged under their new
names.

## 6. Restart the app

```bash
npm run server     # or npm run dev:all
```

`db.js`'s `CREATE TABLE IF NOT EXISTS` already matches this new shape, so it
won't try to recreate or alter anything — it only fires on a database that
has no `holdings` table at all (e.g. a fresh install).

---

## Alternative: MySQL/MariaDB versions without `RENAME COLUMN`

If step 3 fails with a syntax error, use `CHANGE COLUMN` instead (you must
restate the full column definition):

```sql
ALTER TABLE holdings CHANGE COLUMN symbol  ticker           VARCHAR(20)    NOT NULL;
ALTER TABLE holdings CHANGE COLUMN avgCost avgPurchasePrice DECIMAL(14,4)  NOT NULL;
ALTER TABLE holdings CHANGE COLUMN ltp     currentPrice     DECIMAL(14,4)  NOT NULL;
ALTER TABLE holdings DROP COLUMN dayChgPct;
```

Note: `ticker` was the table's `PRIMARY KEY` under its old name `symbol` —
`CHANGE COLUMN`/`RENAME COLUMN` keep the primary key attached automatically,
so you don't need to re-add it.
