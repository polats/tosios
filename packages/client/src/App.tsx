import { Router } from '@reach/router';
import React, { Component } from 'react';
import styled from "styled-components";
import { fonts } from "./styles";
import { View } from './components';
import WalletConnect from "@walletconnect/browser";
import WalletConnectQRCodeModal from "@walletconnect/qrcode-modal";
import { IInternalEvent } from "@walletconnect/types";

import { getAccounts, initWallet, updateWallet } from "./helpers/wallet";
import { apiGetAccountAssets, apiGetGasPrices, apiGetAccountNonce } from "./helpers/api";

import { DEFAULT_CHAIN_ID, DEFAULT_ACTIVE_INDEX } from "./helpers/constants";
import { getCachedSession } from "./helpers/utilities";
import appConfig from "./config";

import { IAssetData } from "./helpers/types";

import Header from "./components/Header";
import Column from "./components/Column";
import WCButton from "./components/WCButton";

import Game from './scenes/Game';
import Home from './scenes/Home';

// app settings
const CREATE_WALLET_ON_GUEST_ACCOUNT = false;

const SButtonContainer = styled(Column)`
  width: 250px;
  margin: 50px 0;
`;

const SConnectButton = styled(WCButton)`
  border-radius: 8px;
  font-size: ${fonts.size.medium};
  height: 44px;
  width: 100%;
  margin: 12px 0;
`;

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

  fetching: boolean;
  showModal: boolean;
  pendingRequest: boolean;
  result: any | null;
  assets: IAssetData[];
}

const DEFAULT_ACCOUNTS = CREATE_WALLET_ON_GUEST_ACCOUNT
  ? getAccounts() : [];
const DEFAULT_ADDRESS = CREATE_WALLET_ON_GUEST_ACCOUNT
  ? DEFAULT_ACCOUNTS[DEFAULT_ACTIVE_INDEX] : "";

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

  fetching: false,
  showModal: false,
  pendingRequest: false,
  result: null,
  assets: [],
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
    if (CREATE_WALLET_ON_GUEST_ACCOUNT)
      this.initWallet();
  }

  public resetApp = async () => {
    await this.setState({ ...INITIAL_STATE });
    if (CREATE_WALLET_ON_GUEST_ACCOUNT)
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


  public walletConnectInit = async () => {
    // bridge url
    const bridge = "https://bridge.walletconnect.org";

    // create new connector
    const connector = new WalletConnect({ bridge });

    await this.setState({ connector });

    // check if already connected
    if (!connector.connected) {
      // create new session
      await connector.createSession();

      // get uri for QR Code modal
      const uri = connector.uri;

      // console log the uri for development
      console.log(uri);

      // display QR Code modal
      WalletConnectQRCodeModal.open(uri, () => {
        console.log("QR Code Modal closed");
      });
    }
    // subscribe to events
    await this.subscribeToEvents();
  };

  public subscribeToEvents = () => {
    const { connector } = this.state;

    if (!connector) {
      return;
    }

    connector.on("session_update", async (error, payload) => {
      console.log(`connector.on("session_update")`);

      if (error) {
        throw error;
      }

      const { chainId, accounts } = payload.params[0];
      this.onSessionUpdate(accounts, chainId);
    });

    connector.on("connect", (error, payload) => {
      console.log(`connector.on("connect")`);

      if (error) {
        throw error;
      }

      this.onConnect(payload);
    });

    connector.on("disconnect", (error, payload) => {
      console.log(`connector.on("disconnect")`);

      if (error) {
        throw error;
      }

      this.onDisconnect();
    });

    if (connector.connected) {
      const { chainId, accounts } = connector;
      const address = accounts[0];
      this.setState({
        connected: true,
        chainId,
        accounts,
        address,
      });
    }

    this.setState({ connector });
  };

  public onConnect = async (payload: IInternalEvent) => {
    const { chainId, accounts } = payload.params[0];
    const address = accounts[0];
    await this.setState({
      connected: true,
      chainId,
      accounts,
      address,
    });
    WalletConnectQRCodeModal.close();
    this.getAccountAssets();
  };

  public onDisconnect = async () => {
    WalletConnectQRCodeModal.close();
    this.resetApp();
  };

  public onSessionUpdate = async (accounts: string[], chainId: number) => {
    const address = accounts[0];
    await this.setState({ chainId, accounts, address });
    await this.getAccountAssets();
  };

  public getAccountAssets = async () => {
    const { address, chainId } = this.state;
    this.setState({ fetching: true });
    try {
      // get account balances
      const assets = await apiGetAccountAssets(address, chainId);

      await this.setState({ fetching: false, address, assets });
    } catch (error) {
      console.error(error);
      await this.setState({ fetching: false });
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
      assets,
      fetching,
      showModal,
      pendingRequest,
      result,
    } = this.state;

    return (
      <>
        <View flex={true} center={true} column={true}>
          {!address && !assets.length ?
            <SConnectButton left onClick={this.walletConnectInit} fetching={fetching}>
              {"Connect to WalletConnect"}
            </SConnectButton>
            :
            <Header
              connected={connected}
              address={address}
              chainId={chainId}
              killSession={this.killSession}/>
          }
        </View>
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
