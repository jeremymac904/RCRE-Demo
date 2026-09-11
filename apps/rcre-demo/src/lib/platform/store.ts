import 'server-only'
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, realpathSync } from 'node:fs'
import path from 'node:path'

const root = realpathSync(path.resolve(process.cwd(), '../..'))
if (path.basename(root) !== 'RCRE') throw new Error('RCRE workspace boundary required')
export const storageRoot = path.join(root, 'runtime')
mkdirSync(path.join(storageRoot, 'data'), { recursive: true, mode: 0o700 })
const filename = process.env.RCRE_TEST_DB ?? path.join(storageRoot, 'data', 'platform.sqlite')
if (!path.resolve(filename).startsWith(root + path.sep)) throw new Error('Database must stay inside RCRE')
const db = new DatabaseSync(filename)
db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS records(kind TEXT NOT NULL,id TEXT NOT NULL,body TEXT NOT NULL, PRIMARY KEY(kind,id));')
export function readRecords<T>(kind: string): T[] { return db.prepare('SELECT body FROM records WHERE kind=? ORDER BY rowid').all(kind).map(r => JSON.parse(String(r.body)) as T) }
export function getRecord<T>(kind: string,id: string): T|null { const r=db.prepare('SELECT body FROM records WHERE kind=? AND id=?').get(kind,id); return r ? JSON.parse(String(r.body)) as T : null }
export function putRecord<T extends {id:string}>(kind:string,value:T):T { db.prepare('INSERT INTO records(kind,id,body) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET body=excluded.body').run(kind,value.id,JSON.stringify(value));return value }
export function deleteRecord(kind:string,id:string):void { db.prepare('DELETE FROM records WHERE kind=? AND id=?').run(kind,id) }
let nested=0
export function transaction<T>(fn:()=>T):T { if(nested)return fn();db.exec('BEGIN IMMEDIATE');nested++;try{const result=fn();db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}finally{nested--} }
