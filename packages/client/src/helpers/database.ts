import { Database } from "@tosios/common";

export async function getDatabaseManager(): Promise<Database.OrbitDBManager> {

 const dbManager = new Database.OrbitDBManager();
 await dbManager.start();

 return dbManager;
}
