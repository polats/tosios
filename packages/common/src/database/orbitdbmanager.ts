import * as IPFS from 'ipfs'
import * as OrbitDB from 'orbit-db'

export class OrbitDBManager {

  node = {}

   constructor () {

    this.node = IPFS.create({
      relay: { enabled: true, hop: { enabled: true, active: true } },
      EXPERIMENTAL: { pubsub: true },
      repo: './ipfs',
      })
  }

}
