// lib/loadQuestions.ts
import fs from 'fs';
import path from 'path';

export interface Question {
  instance_id: string;
  db: string;
  question: string;
  external_knowledge: string | null;
}

const filePath = path.join(process.cwd(), 'data', 'spider2-lite.jsonl');

export function loadQuestions(): Question[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() !== '');
  return lines.map(line => JSON.parse(line));
}

export function getUniqueDBs(): string[] {
  const questions = loadQuestions();
  const dbSet = new Set<string>();
  questions.forEach(q => dbSet.add(q.db));
  return Array.from(dbSet);
}
