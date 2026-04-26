const fs = require('fs');
const path = require('path');
const { program } = require('commander');

program
  .option('--dir <path>', 'Root directory with engine subfolders', './data/databases')
  .option('--output-index <path>', 'Index file path', './public/data/spider2-lite-index.json')
  .option('--output-samples <path>', 'Samples root folder', './public/data/samples')
  .option('--sample-rows <number>', 'Max sample rows per table', '5')
  .parse(process.argv);

const options = program.opts();
const ROOT_DIR = options.dir;
const INDEX_PATH = options.outputIndex;
const SAMPLES_DIR = options.outputSamples;
const SAMPLE_LIMIT = parseInt(options.sampleRows, 10);

if (!fs.existsSync(ROOT_DIR)) {
  console.error(`Root directory not found: ${ROOT_DIR}`);
  process.exit(1);
}

// Get engine folders
const engines = fs.readdirSync(ROOT_DIR, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

console.log(`Found engines: ${engines.join(', ')}\n`);

// Recursively find all .json files
function findJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(findJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Clean samples directory
if (fs.existsSync(SAMPLES_DIR)) {
  fs.rmSync(SAMPLES_DIR, { recursive: true });
}

const index = [];
let totalTables = 0;
let totalSamplesMB = 0;

for (const engine of engines) {
  const engineDir = path.join(ROOT_DIR, engine);
  const jsonFiles = findJsonFiles(engineDir);
  if (jsonFiles.length === 0) continue;

  // Group by database folder
  const dbMap = {};
  for (const filePath of jsonFiles) {
    const relative = path.relative(engineDir, filePath);
    const parts = relative.split(path.sep);
    const dbName = parts[0];
    if (!dbMap[dbName]) dbMap[dbName] = [];
    dbMap[dbName].push(filePath);
  }

  console.log(`Engine: ${engine} – ${Object.keys(dbMap).length} databases`);

  for (const [dbName, files] of Object.entries(dbMap)) {
    const tables = [];
    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);
        if (!json.table_name) {
          console.warn(`  [${engine}/${dbName}] Skipping ${path.basename(filePath)} – no table_name`);
          continue;
        }

        const tableName = json.table_name;
        const columns = json.column_names || [];
        const totalRows = json.total_rows ?? json.totalRows ?? -1;
        const rawSampleRows = Array.isArray(json.sample_rows) ? json.sample_rows : [];
        const sampleRows = rawSampleRows.slice(0, SAMPLE_LIMIT).map(rowObj =>
          columns.map(col => {
            const val = rowObj[col];
            return val !== null && typeof val === 'object' ? JSON.stringify(val) : val;
          })
        );

        // Determine sample file path (relative to public root)
        const sampleFileName = `${tableName}.json`;
        const sampleRelativePath = `samples/${engine}/${dbName}/${sampleFileName}`;
        const sampleFullDir = path.join(SAMPLES_DIR, engine, dbName);
        const sampleFullPath = path.join(sampleFullDir, sampleFileName);

        // Write sample file
        fs.mkdirSync(sampleFullDir, { recursive: true });
        fs.writeFileSync(sampleFullPath, JSON.stringify(sampleRows));
        const sampleSizeKB = (Buffer.byteLength(JSON.stringify(sampleRows)) / 1024).toFixed(1);
        totalSamplesMB += parseFloat(sampleSizeKB) / 1024;

        tables.push({
          name: tableName,
          columns,
          totalRows,
          samplePath: sampleRelativePath
        });
        totalTables++;
        console.log(`  [${engine}/${dbName}] Table: ${tableName} (sample: ${sampleSizeKB} KB)`);
      } catch (err) {
        console.error(`  [${engine}/${dbName}] Error: ${err.message}`);
      }
    }

    if (tables.length > 0) {
      index.push({
        engine,
        name: dbName,
        tables
      });
    }
  }
}

// Write index file
fs.mkdirSync(path.dirname(INDEX_PATH), { recursive: true });
fs.writeFileSync(INDEX_PATH, JSON.stringify(index));
const indexSizeMB = (Buffer.byteLength(JSON.stringify(index)) / 1024 / 1024).toFixed(2);

console.log(`\n✅ Done.`);
console.log(`   Index file: ${INDEX_PATH} (${indexSizeMB} MB)`);
console.log(`   Total tables: ${totalTables}`);
console.log(`   Samples total size: ~${totalSamplesMB.toFixed(2)} MB`);
console.log(`   Sample files in: ${SAMPLES_DIR}`);
