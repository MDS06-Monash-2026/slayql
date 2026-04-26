// lib/databaseMapper.ts
import fs from 'fs';
import path from 'path';

export type Engine = 'sqlite' | 'bigquery' | 'snowflake';

export interface TableMeta {
  tableName: string;
  tableFullName: string;
}

const DB_BASE_DIR = path.join(process.cwd(), 'data', 'databases');

// ─── Recursive File Scanner ──────────────────────────────────────────
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

// ─── Get all databases for a specific engine ─────────────────────────
export function getDatabasesForEngine(engine: Engine): string[] {
  const engineDir = path.join(DB_BASE_DIR, engine);
  if (!fs.existsSync(engineDir)) return [];
  
  return fs.readdirSync(engineDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
}

// ─── Get all table names for a specific database ─────────────────────
export function getTablesForDatabase(engine: Engine, dbName: string): string[] {
  const dbDir = path.join(DB_BASE_DIR, engine, dbName);
  if (!fs.existsSync(dbDir)) return [];

  const tables: string[] = [];
  const jsonFiles = findJsonFiles(dbDir); 
  
  for (const filePath of jsonFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(content);
      if (json.table_name) {
        tables.push(json.table_name);
      }
    } catch (err) {
      console.warn(`Failed to parse schema file: ${filePath}`);
    }
  }
  return tables;
}

// ─── Extract Sample Data from JSON ───────────────────────────────────
export function getTableSampleData(engine: Engine, dbName: string, tableName: string) {
  const dbDir = path.join(DB_BASE_DIR, engine, dbName);
  if (!fs.existsSync(dbDir)) return null;

  const jsonFiles = findJsonFiles(dbDir);
  for (const filePath of jsonFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(content);
      
      if (json.table_name === tableName) {
        const columns = json.column_names || [];
        const rawSampleRows = json.sample_rows || [];

        // Convert the array of objects into an array of arrays for the UI
        const rows = rawSampleRows.map((rowObj: any) => {
          return columns.map((col: string) => {
            const val = rowObj[col];
            // Format nested objects/arrays so they render cleanly in the UI
            if (val !== null && typeof val === 'object') {
              return JSON.stringify(val); 
            }
            return val ?? null;
          });
        });

        return {
          columns,
          rows,
          totalRows: -1 // Set to -1 since we only have a sample, not the true count
        };
      }
    } catch (err) {
      continue; // Skip malformed files
    }
  }
  return null;
}
