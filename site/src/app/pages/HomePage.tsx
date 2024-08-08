import React from 'react';
import { NavLink, Navigate } from 'react-router-dom';
import './HomePage.css';
import { publish, subscribe } from '../util/event';
import { getWalletAddress, isLoggedIn, uuid, getDataFromAO, messageToAO, getWalletPublicKey, getProfile, browserDetect } from '../util/util';
import { Server } from '../../server/server';
import { BsFillPersonPlusFill } from 'react-icons/bs';
import Loading from '../elements/Loading';
import { HANDLE_REGISTRY } from '../util/consts';
import AlertModal from '../modals/AlertModal';
import Logo from '../elements/Logo';
import { ProfileType } from '../util/types';
import Avatar from '../modals/Avatar/avatar';
import { Web3Provider } from 'arseeding-arbundles/node_modules/@ethersproject/providers'

declare let window: any;

export interface HandleProfile {
  handle: string;
  pid: string;
  profile?: {
    name: string;
    avatar: string;
    nickname: string;
    [key: string]: any;
  };
}

interface HomePageState {
  avatar: string;
  nickname: string;
  question: string;
  alert: string;
  message: string;
  loading: boolean;
  isLoggedIn: string;
  address: string;
  process: string;
  handles: { [handleName: string]: HandleProfile };
  handleName: any;
  bSignup: boolean;
  navigate: string;
  profiles: Map<string, ProfileType>;
}

class HomePage extends React.Component<{}, HomePageState> {

  quillRef: any;
  wordCount = 0;
  refresh: any;

  constructor(props: {}) {
    super(props);
    this.state = {
      avatar: '',
      nickname: '',
      question: '',
      alert: '',
      message: '',
      loading: true,
      isLoggedIn: '',
      address: '',
      process: '',
      handles: {},
      handleName: '',
      bSignup: false,
      navigate: '',
      profiles: new Map(),
    };

    this.onQuestionYes = this.onQuestionYes.bind(this);
    this.onQuestionNo = this.onQuestionNo.bind(this);

    subscribe('wallet-events', () => {
      // this.forceUpdate();
      this.start();
    });
  }

  componentDidMount() {
    this.start();
  }

  componentWillUnmount(): void {
  }

  async start() {
    const address = await isLoggedIn();
    this.setState({ loading: false, isLoggedIn: address, address });

    if (address) this.getUserHandles(address);
  }

  async getUserHandles(address: string) {
    this.setState({ loading: true });

    try {
      const response: Array<{ handle: string; pid: string }> = await getDataFromAO(HANDLE_REGISTRY, 'GetHandles', { owner: address });
      // console.log("response:", JSON.stringify(response));

      const handles: { [handleName: string]: HandleProfile } = {};
      response.forEach((item) => {
        handles[item.handle] = { handle: item.handle, pid: item.pid };
      });

      const profiles: Map<string, ProfileType> = new Map();

      const profilesPromise = response.map(async (item) => {
        await getProfile(item.pid).then(res => {
          profiles.set(item.handle, res);
        }).catch(err => {
          console.error("Failed to get profile:", err);
        })
      })
      await Promise.allSettled(profilesPromise);

      this.setState({ handles, profiles, loading: false });
    } catch (error) {
      console.error("Error fetching handles:", error);
      this.setState({ handles: {}, loading: false }); // Set to empty array in case of error
    }
  }
  async connectArConnect() {
    try {
      await window.arweaveWallet.connect(['ACCESS_ADDRESS', 'ACCESS_PUBLIC_KEY']);
      return true;
    } catch (error) {
      console.error('Failed to connect to ArConnect:', error);
      return false;
    }
  }

  async connectMetaMask() {
    const name = browserDetect();
    if (name === 'safari' || name === 'ie' || name === 'yandex' || name === 'others') {
      this.setState({ alert: 'MetaMask is not supported for this browser! Please use the Wallet Connect.' });
      return false;
    }

    if (typeof window.ethereum === 'undefined') {
      this.setState({ alert: 'MetaMask is not installed!' });
      return false;
    }

    try {
      const provider = new Web3Provider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];
      console.log("[ address ]", address);
      return true;
    } catch (error: any) {
      this.setState({ alert: error.message });
      return false;
    }
  }

  async connectWallet(walletType: string) {
    let connected = false;

    if (walletType === 'arconnect') {
      connected = await this.connectArConnect();
    } else if (walletType === 'metamask') {
      connected = await this.connectMetaMask();
    }

    if (connected) {
      const address = await getWalletAddress(walletType);
      this.setState({ isLoggedIn: 'true', address });
      this.getUserHandles(address);

      // TODO: should check to if is exist of profile
      // if (await this.getProfile() == false)
      //   this.register(address);

      Server.service.setIsLoggedIn(address);
      Server.service.setActiveAddress(address);
      publish('wallet-events');

      // your own process
      // let process = await getDefaultProcess(address);
      // console.log("Your process:", process)

      // Spawn a new process
      // if (!process) {
      //   process = await spawnProcess();
      //   console.log("Spawn --> processId:", process)
      // }

      // setTimeout(async () => {
      //   // load lua code into the process
      //   let messageId = await evaluate(process, LUA);
      //   console.log("evaluate -->", messageId)
      // }, 10000);
    }
  }

  // Register one user
  // This is a temp way, need to search varibale Members
  // to keep one, on browser side or AOS side (in lua code)
  async register(handleName: string) {
    if (!handleName.trim()) {
      this.setState({ alert: 'Please input a valid handle.' });
      return;
    }

    this.setState({ loading: true });

    // Check if handle is already registered
    const handleResponse = await getDataFromAO(HANDLE_REGISTRY, 'QueryHandle', { handle: handleName });
    if (handleResponse && handleResponse.registered) {
      this.setState({ alert: 'This handle is already registered.', loading: false });
      return;
    }
    let pubkey;
    let walletType = 'arconnect';
    if (window.ethereum && window.ethereum.selectedAddress) {
      walletType = 'metamask';
    }

    if (walletType === 'arconnect') {
      pubkey = await getWalletPublicKey('arconnect');
    } else if (walletType === 'metamask') {
      pubkey = await getWalletPublicKey('metamask');
    }

    console.log("register -> pubkey:", pubkey);
    const response = await messageToAO(HANDLE_REGISTRY, { "handle": handleName, "pubkey": pubkey }, 'Register', walletType);
    console.log("register -> response:", response);

    if (response) {
      // this.getUserHandles(address);
      this.setState({ navigate: '/chat/' + handleName, loading: false });
    } else {
      this.setState({ alert: 'Failed to register a handle.', loading: false });
    }
  }

  async disconnectWallet() {
    await window.arweaveWallet.disconnect();
    this.setState({ isLoggedIn: '', address: '', question: '' });

    // for testing
    Server.service.setIsLoggedIn('');
    Server.service.setActiveAddress('');
    publish('wallet-events');
  }

  onQuestionYes() {
    this.disconnectWallet();
  }

  onQuestionNo() {
    this.setState({ question: '' });
  }

  pickHandle(handle: string) {
    // this.setState({ bounty: qty });
  }

  signUp() {
    this.setState({ bSignup: true });
  }

  renderDID() {
    console.log("handles:", this.state.handles);
    const divs = [];
    for (const handleName in this.state.handles) {
      const handle = this.state.handles[handleName];
      if (!handle.handle) continue; // handle is empty string, will be removed.
      const p = this.state.profiles.get(handleName);

      divs.push(
        // <NavLink key={handleName} className='home-page-did' to={`/chat`} state={{ handles: this.state.handles, currentHandle: handleName }}>
        <NavLink key={handleName} className='home-page-did' to={`/chat/${handleName}`}>
          <Avatar
            name={p?.name}
            pid={handle.pid}
            handleName={handleName}
            imgUrl={p?.img}
          />
        </NavLink>
      )
    }

    divs.push(
      <div key={uuid()} className='home-page-did' onClick={() => this.signUp()}>
        <BsFillPersonPlusFill size={30} />
      </div>
    )

    return divs;
  }

  renderSignUp() {
    return (
      <div>
        <div className='home-page-title'>Sign up a new handle</div>
        <div className='home-page-signup-row'>
          <input
            className="home-page-input"
            placeholder="Handle name"
            value={this.state.handleName}
            onChange={(e) => this.setState({ handleName: e.target.value })}
          // onKeyDown={this.handleKeyDown}
          />

          <button className="home-signup-button" onClick={() => this.register(this.state.handleName)}>
            Sign Up
          </button>
        </div>

        <AlertModal message={this.state.alert} button="OK" onClose={() => this.setState({ alert: '' })} />
      </div>
    )
  }

  render() {
    if (this.state.navigate)
      return <Navigate to={this.state.navigate} />;

    if (this.state.loading) {
      return (
        <div className='home-page-welcome'>
          <Logo />
          <Loading marginTop='50px' />
        </div>
      )
    }
    else if (!this.state.isLoggedIn) {
      // Connect to a wallet
      return (
        <div className='home-page-welcome'>
          <Logo />
          <div className="home-page-slug">Messages and other stuff transmitted by AO</div>
          <button className="home-connect-button" onClick={() => this.connectWallet('arconnect')}>
            Connect ArConnect
          </button>
          <button className="home-connect-button" onClick={() => this.connectWallet('metamask')}>
            Connect MetaMask
          </button>
        </div>
      )
    }
    // Sign up
    else if (Object.keys(this.state.handles).length === 0) {
      return (
        <div className='home-page-welcome'>
          <Logo />
          {this.renderSignUp()}
        </div>
      )
    }
    // Pick a handle
    else if (Object.keys(this.state.handles).length > 0) {
      return (
        <div className='home-page-welcome'>
          <Logo />
          {this.state.bSignup && this.renderSignUp()}

          <div className='home-page-did-title'>You already have these handles.
            <br /> Pick one to enter or create a new one.
          </div>

          <div className='home-page-did-container'>
            {this.renderDID()}
          </div>
        </div>
      )
    }
  }
}

export default HomePage;
