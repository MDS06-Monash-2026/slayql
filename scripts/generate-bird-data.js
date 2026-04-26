const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { program } = require('commander');

program
  .option('--dir <path>', 'Root directory containing BIRD database folders', './bird_databases')
  .option('--output <path>', 'Output JSON file path', './public/data/bird-exploration.json')
  .option('--sample-rows <number>', 'Number of sample rows per table', '5')
  .parse(process.argv);

const options = program.opts();
const BIRD_DIR = options.dir;
const OUTPUT_PATH = options.output;
const SAMPLE_ROWS = parseInt(options.sampleRows, 10);

if (!fs.existsSync(BIRD_DIR)) {
  console.error(`Directory not found: ${BIRD_DIR}`);
  process.exit(1);
}

// Recursively find all .db and .sqlite files
function findDbFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(findDbFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.db') || entry.name.endsWith('.sqlite'))) {
      files.push(fullPath);
    }
  }
  return files;
}

const dbFiles = findDbFiles(BIRD_DIR);
if (dbFiles.length === 0) {
  console.error('No .db or .sqlite files found in directory tree.');
  process.exit(1);
}

console.log(`Found ${dbFiles.length} database files.\n`);

const result = [];

for (const filePath of dbFiles) {
  const fileName = path.basename(filePath);
  // Get relative directory structure for display
  const relativeDir = path.relative(BIRD_DIR, path.dirname(filePath));
  const displayName = relativeDir ? `${relativeDir}/${fileName}` : fileName;
  console.log(`Processing: ${displayName}`);
  let db;
  try {
    db = new Database(filePath, { readonly: true, fileMustExist: true });
    const tables = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
    ).all().map(r => r.name);

    const tablesData = [];
    for (const tableName of tables) {
      console.log(`  -> Table: ${tableName}`);
      const colInfo = db.prepare(`PRAGMA table_info('${tableName}')`).all();
      const columns = colInfo.map(c => c.name);
      const rows = db.prepare(`SELECT * FROM "${tableName}" LIMIT ${SAMPLE_ROWS}`).all();
      const sampleRows = rows.map(row => columns.map(col => row[col]));

      tablesData.push({
        name: tableName,
        columns: columns,
        sampleRows: sampleRows,
        totalRows: db.prepare(`SELECT COUNT(*) as cnt FROM "${tableName}"`).get().cnt
      });
    }

    result.push({
      name: fileName,
      directory: relativeDir || '.',
      tables: tablesData
    });
    
  } catch (err) {
    console.error(`Error processing ${displayName}: ${err.message}`);
    result.push({
      name: fileName,
      directory: relativeDir || '.',
      error: err.message,
      tables: []
    });
  } finally {
    if (db) db.close();
  }
}

// Write output
const outputDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
console.log(`\n✅ Done. Output written to ${OUTPUT_PATH}`);
