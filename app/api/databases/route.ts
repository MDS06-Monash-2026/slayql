// app/api/databases/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getDatabasesForEngine, 
  getTablesForDatabase, 
  getTableSampleData,
  Engine 
} from '@/lib/databaseMapper';

export async function GET(req: NextRequest) {
  const engine = req.nextUrl.searchParams.get('engine') as Engine;
  const dbName = req.nextUrl.searchParams.get('db');
  const tableName = req.nextUrl.searchParams.get('table');

  if (!engine || !['sqlite', 'bigquery', 'snowflake'].includes(engine)) {
    return NextResponse.json({ error: 'Valid engine required' }, { status: 400 });
  }

  try {
    // 1. Return all databases for an engine
    if (!dbName) {
      const databases = getDatabasesForEngine(engine);
      return NextResponse.json({ databases });
    }

    // 2. Return all tables for a specific database
    if (!tableName) {
      const tables = getTablesForDatabase(engine, dbName);
      if (tables.length === 0) {
        return NextResponse.json({ error: `Database ${dbName} not found or has no tables` }, { status: 404 });
      }
      return NextResponse.json({ tables });
    }

    // 3. Return Sample Data directly from the JSON file
    const sampleData = getTableSampleData(engine, dbName, tableName);
    
    if (!sampleData) {
      return NextResponse.json({ error: `Table ${tableName} not found in local schema files` }, { status: 404 });
    }
    
    return NextResponse.json(sampleData);

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
