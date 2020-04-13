import { Database } from "@tosios/common";

 export function getDatabaseManager(): Database.OrbitDBManager {

  return new Database.OrbitDBManager();
}
