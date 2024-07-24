import React from 'react';
import { NavLink, Navigate } from 'react-router-dom';
import './HomePage.css';
import { publish, subscribe } from '../util/event';
import { connectWallet, getWalletAddress, isLoggedIn, uuid, generateAvatar, getDataFromAO, messageToAO, getWalletPublicKey } from '../util/util';
import { Server } from '../../server/server';
import { BsFillPersonPlusFill } from 'react-icons/bs';
import Loading from '../elements/Loading';
import { HANDLE_REGISTRY } from '../util/consts';
import AlertModal from '../modals/AlertModal';
import Logo from '../elements/Logo';

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
      this.setState({ handles, loading: false });
    } catch (error) {
      console.error("Error fetching handles:", error);
      this.setState({ handles: {}, loading: false }); // Set to empty array in case of error
    }
  }
  async connectWallet() {
    const connected = await connectWallet();
    if (connected) {
      const address = await getWalletAddress();
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
    const pubkey = await getWalletPublicKey();
    console.log("register -> pubkey:", pubkey);
    const response = await messageToAO(HANDLE_REGISTRY, { "handle": handleName, "pubkey": pubkey }, 'Register');
    console.log("register -> response:", response)

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

      divs.push(
        // <NavLink key={handleName} className='home-page-did' to={`/chat`} state={{ handles: this.state.handles, currentHandle: handleName }}>
        <NavLink key={handleName} className='home-page-did' to={`/chat/${handleName}`}>
          <img
            className='home-page-portrait'
            src={generateAvatar(handle.pid)}
          />

          <div className="home-page-nickname">
            @{handleName}
          </div>
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
          <button className="home-connect-button" onClick={() => this.connectWallet()}>
            Connect ArConnect
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