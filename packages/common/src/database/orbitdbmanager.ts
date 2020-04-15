import * as IPFS from 'ipfs'
import * as OrbitDB from 'orbit-db'

export class OrbitDBManager {

  node:any = {}

  async start() {
    this.node = await IPFS.create({
      relay: { enabled: true, hop: { enabled: true, active: true } },
      EXPERIMENTAL: { pubsub: true },
      repo: './ipfs',
    })
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
