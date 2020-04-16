import * as IPFS from 'ipfs'
const OrbitDB = require('orbit-db')

export class OrbitDBManager {

  REPO = './ipfs'

  node:any = null
  orbitdb:any = null
  defaultOptions:any = null;

  user:any = null

  async start() {

    if (!this.node) {
      this.node = await IPFS.create({
        relay: { enabled: true, hop: { enabled: true, active: true } },
        EXPERIMENTAL: { pubsub: true },
        repo: this.REPO,
      })

      this.orbitdb = await OrbitDB.createInstance(this.node)
      this.defaultOptions = { accessController: { write: [this.orbitdb.identity.id] }}
    }

  }

  async loadFixtureData (fixtureData: any) {
    const fixtureKeys = Object.keys(fixtureData)
    for (let i in fixtureKeys) {
      let key = fixtureKeys[i]
      if(!this.user.get(key))
        await this.user.set(key, fixtureData[key]);
    }
  }

  async initializeServerData() {
    this.user = await this.orbitdb.kvstore('user', this.defaultOptions)
    await this.user.load()
    await this.loadFixtureData(
      {
        'username': 'Test',
        'dbid': '112345'
      }
    )
    console.log(this.user.all)
  }

  async getId() {
    try {
      const id = (await this.node.id()).id
      return id
    }

    catch (e) {
      return null
    }
  }


}
