import * as IPFS from 'ipfs'
import * as OrbitDB from 'orbit-db'

export class OrbitDBManager {

  const REPO = './ipfs'

  node:any = null

  async start() {

    if (!this.node) {
      this.node = await IPFS.create({
        relay: { enabled: true, hop: { enabled: true, active: true } },
        EXPERIMENTAL: { pubsub: true },
        repo: this.REPO,
      })
    }
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
