import path from 'node:path'
import {randomUUID} from 'node:crypto'
// Each independently executing test file owns a database. Concurrent-write behavior
// is exercised through API/version tests, never accidental shared unit fixtures.
process.env.RCRE_TEST_DB=path.resolve(process.cwd(),'../../runtime/data/test-'+randomUUID()+'.sqlite')
