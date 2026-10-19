/**
 * Point the database module at a throwaway database for each test file.
 *
 * This runs before the test file's imports are evaluated, so lib/database.ts
 * never resolves the real ~/.claude-reviewer/data.db.
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const testDbDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-reviewer-test-"));
process.env.DATABASE_DIR = testDbDir;
process.env.DATABASE_PATH = path.join(testDbDir, "test.db");
