import db from "@/db";

export class StoresService {
  async getAllStores() {
    return db.query.stores.findMany();
  }
}
