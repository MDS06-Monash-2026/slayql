// scripts/generate-cache.ts
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { BigQuery } from '@google-cloud/bigquery';
import snowflake from 'snowflake-sdk';

const DB_BASE_DIR = path.join(process.cwd(), 'data', 'databases');
const SQLITE_BASE = path.join(process.cwd(), 'resource', 'databases', 'spider2-localdb');
const OUTPUT_FILE = path.join(process.cwd(), 'public', 'all_sample_data.json'); // Saving to public/ for easy fetching later

// ─── Helper: Recursive JSON Finder ─────────────────────────────────────
function findJsonFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findJsonFiles(fullPath, fileList);
    } else if (file.endsWith('.json')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

// ─── Engine Clients Setup ──────────────────────────────────────────────
function getBigQueryClient() {
  let keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyFile) {
    const credDir = path.join(process.cwd(), 'bigquery_credentials');
    if (fs.existsSync(credDir)) {
      const files = fs.readdirSync(credDir).filter(f => f.endsWith('.json'));
      if (files.length > 0) keyFile = path.join(credDir, files[0]);
    }
  }
  if (!keyFile || !fs.existsSync(keyFile)) throw new Error('BigQuery credentials not found.');
  const credentials = JSON.parse(fs.readFileSync(keyFile, 'utf-8'));
  return new BigQuery({ keyFilename: keyFile, projectId: credentials.project_id });
}

function getSnowflakeConfig() {
  const credPath = path.join(process.cwd(), 'snowflake_credential', 'config.json');
  if (!fs.existsSync(credPath)) throw new Error('Snowflake credentials not found.');
  return JSON.parse(fs.readFileSync(credPath, 'utf-8'));
}

// ─── Data Fetchers ─────────────────────────────────────────────────────
function fetchSqlite(dbName: string, tableName: string) {
  const dbPath = path.join(SQLITE_BASE, `${dbName}.sqlite`);
  if (!fs.existsSync(dbPath)) throw new Error(`SQLite DB not found: ${dbPath}`);
  
  const db = new Database(dbPath, { readonly: true });
  try {
    const colInfo = db.prepare(`PRAGMA table_info("${tableName}")`).all() as any[];
    const columns = colInfo.map(c => c.name);
    const rows = db.prepare(`SELECT * FROM "${tableName}" LIMIT 5`).all();
    
    let totalRows = 0;
    try {
      const countRow = db.prepare(`SELECT COUNT(*) as cnt FROM "${tableName}"`).get() as any;
      totalRows = countRow?.cnt ?? 0;
    } catch(e) {}
    
    return {
      columns,
      rows: rows.map((r: any) => columns.map(c => r[c] ?? null)),
      totalRows
    };
  } finally {
    db.close();
  }
}

async function fetchBigQuery(bq: BigQuery, tableFullName: string) {
  const sql = `SELECT * FROM \`${tableFullName}\` LIMIT 5`;
  const [job] = await bq.createQueryJob({ query: sql });
  const [rows] = await job.getQueryResults();

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  return {
    columns,
    rows: rows.map((r: any) => columns.map(c => {
        // Convert BQ specific types like Dates/Buffers to strings so they serialize to JSON properly
        const val = r[c];
        if (val && typeof val.value === 'string') return val.value; // Handle BQ Date objects
        if (Buffer.isBuffer(val)) return val.toString('base64');
        return val ?? null;
    })),
    totalRows: -1
  };
}

async function fetchSnowflake(conn: any, tableFullName: string) {
  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText: `SELECT * FROM ${tableFullName} LIMIT 5`,
      complete: (err: any, stmt: any, data: any[]) => {
        if (err) return reject(err);
        const columns = data.length > 0 ? Object.keys(data[0]) : [];
        const rows = data.map(r => columns.map(c => r[c] ?? null));
        resolve({ columns, rows, totalRows: -1 });
      }
    });
  });
}

// ─── Main Execution Loop ───────────────────────────────────────────────
async function run() {
  console.log('🚀 Starting Data Caching Script...');
  const cacheData: any = { sqlite: {}, bigquery: {}, snowflake: {} };
  
  const bqClient = getBigQueryClient();
  const sfConfig = getSnowflakeConfig();
  const sfConn = snowflake.createConnection(sfConfig);
  
  // Connect Snowflake once
  await new Promise<void>((resolve, reject) => {
    sfConn.connect((err: any) => err ? reject(err) : resolve());
  });

  const engines = ['sqlite', 'bigquery', 'snowflake'];

  for (const engine of engines) {
    const engineDir = path.join(DB_BASE_DIR, engine);
    if (!fs.existsSync(engineDir)) continue;

    const databases = fs.readdirSync(engineDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const dbName of databases) {
      console.log(`\n📂 Processing ${engine.toUpperCase()} database: ${dbName}`);
      cacheData[engine][dbName] = {};
      
      const dbDir = path.join(engineDir, dbName);
      const jsonFiles = findJsonFiles(dbDir);

      for (const file of jsonFiles) {
        try {
          const schema = JSON.parse(fs.readFileSync(file, 'utf-8'));
          const tableName = schema.table_name;
          const tableFullName = schema.table_fullname || tableName;
          
          if (!tableName) continue;

          console.log(`   └─ Fetching table: ${tableName}`);
          
          let data;
          if (engine === 'sqlite') {
            data = fetchSqlite(dbName, tableName);
          } else if (engine === 'bigquery') {
            data = await fetchBigQuery(bqClient, tableFullName);
          } else if (engine === 'snowflake') {
            data = await fetchSnowflake(sfConn, tableFullName);
          }

          cacheData[engine][dbName][tableName] = data;

        } catch (err: any) {
          console.error(`   ❌ Failed table in ${dbName}:`, err.message);
          // Insert a fallback error state so the UI knows it failed gracefully
          cacheData[engine][dbName][path.basename(file, '.json')] = {
              error: err.message
          };
        }
      }
    }
  }

  // Cleanup
  sfConn.destroy(() => {});

  // Write the giant JSON file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cacheData, null, 2));
  console.log(`\n✅ Done! Cache saved to ${OUTPUT_FILE}`);
}

run().catch(console.error);
