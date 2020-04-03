import { Router } from '@reach/router';
import React, { Component } from 'react';
import WalletConnect from "@walletconnect/browser";

import { getAccounts, initWallet, updateWallet } from "./helpers/wallet";
import { DEFAULT_CHAIN_ID, DEFAULT_ACTIVE_INDEX } from "./helpers/constants";
import { getCachedSession } from "./helpers/utilities";
import appConfig from "./config";

import Header from "./components/Header";

import Game from './scenes/Game';
import Home from './scenes/Home';

export interface IAppState {
  loading: boolean;
  scanner: boolean;
  connector: WalletConnect | null;
  uri: string;
  peerMeta: {
    description: string;
    url: string;
    icons: string[];
    name: string;
    ssl: boolean;
  };
  connected: boolean;
  chainId: number;
  accounts: string[];
  activeIndex: number;
  address: string;
  requests: any[];
  results: any[];
  payload: any;
}

const DEFAULT_ACCOUNTS = getAccounts();
const DEFAULT_ADDRESS = DEFAULT_ACCOUNTS[DEFAULT_ACTIVE_INDEX];

const INITIAL_STATE: IAppState = {
  loading: false,
  scanner: false,
  connector: null,
  uri: "",
  peerMeta: {
    description: "",
    url: "",
    icons: [],
    name: "",
    ssl: false,
  },
  connected: false,
  chainId: appConfig.chainId || DEFAULT_CHAIN_ID,
  accounts: DEFAULT_ACCOUNTS,
  address: DEFAULT_ADDRESS,
  activeIndex: DEFAULT_ACTIVE_INDEX,
  requests: [],
  results: [],
  payload: null,
};

class App extends React.Component<{}> {
  public state: IAppState;

  constructor(props: any) {
    super(props);
    this.state = {
      ...INITIAL_STATE,
    };
  }

  public componentDidMount() {
    this.initWallet();
  }

  public resetApp = async () => {
    await this.setState({ ...INITIAL_STATE });
    this.initWallet();
  };

  public killSession = () => {
    console.log("[killSession]");
    const { connector } = this.state;
    if (connector) {
      connector.killSession();
    }
    this.resetApp();
  };

  public initWallet = async () => {
    let { activeIndex, chainId } = this.state;

    const session = getCachedSession();

    if (!session) {
      await initWallet(activeIndex, chainId);
    } else {
      const connector = new WalletConnect({ session });

      const { connected, accounts, peerMeta } = connector;

      const address = accounts[0];

      activeIndex = accounts.indexOf(address);
      chainId = connector.chainId;

      await initWallet(activeIndex, chainId);

      await this.setState({
        connected,
        connector,
        address,
        activeIndex,
        accounts,
        chainId,
        peerMeta,
      });

      this.subscribeToEvents();
    }
    await appConfig.events.init(this.state, this.bindedSetState);
  };

  public bindedSetState = (newState: Partial<IAppState>) => this.setState(newState);

  public subscribeToEvents = () => {
    console.log("[subscribeToEvents]");
    const { connector } = this.state;

    if (connector) {
      connector.on("session_request", (error, payload) => {
        console.log(`connector.on("session_request")`);

        if (error) {
          throw error;
        }

        const { peerMeta } = payload.params[0];
        this.setState({ peerMeta });
      });

      connector.on("session_update", error => {
        console.log(`connector.on("session_update")`);

        if (error) {
          throw error;
        }
      });

      connector.on("call_request", async (error, payload) => {
        // tslint:disable-next-line
        console.log(`connector.on("call_request")`, "payload.method", payload.method);

        if (error) {
          throw error;
        }

        await appConfig.rpcEngine.router(payload, this.state, this.bindedSetState);
      });

      connector.on("connect", (error, payload) => {
        console.log(`connector.on("connect")`);

        if (error) {
          throw error;
        }

        this.setState({ connected: true });
      });

      connector.on("disconnect", (error, payload) => {
        console.log(`connector.on("disconnect")`);

        if (error) {
          throw error;
        }

        this.resetApp();
      });

      if (connector.connected) {
        const { chainId, accounts } = connector;
        const index = 0;
        const address = accounts[index];
        updateWallet(index, chainId);
        this.setState({
          connected: true,
          address,
          chainId,
        });
      }

      this.setState({ connector });
    }
  };

  render() {
    const {
      peerMeta,
      scanner,
      connected,
      activeIndex,
      accounts,
      address,
      chainId,
      requests,
      payload,
    } = this.state;

    return (
      <>
        <Header
          connected={connected}
          address={address}
          chainId={chainId}
          killSession={this.killSession}
        />
        <Router>
          <Home
            default={true}
            path="/"
          />
          <Game
            path="/:roomId"
          />
        </Router>
      </>
    );
  }
}

export default App;
