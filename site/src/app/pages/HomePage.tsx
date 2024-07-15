import React from 'react';
import './HomePage.css';
import { publish, subscribe } from '../util/event';
import { checkContent, connectWallet, getWalletAddress, isLoggedIn, timeOfNow, uuid, randomAvatar, getProfile } from '../util/util';
import { Server } from '../../server/server';
import { BsFillPersonPlusFill } from 'react-icons/bs';
import Loading from '../elements/Loading';

declare var window: any;

interface HomePageState {
  posts: any;
  avatar: string;
  nickname: string;
  question: string;
  alert: string;
  message: string;
  loading: boolean;
  loadNextPage: boolean;
  // loadAvatar: boolean;
  range: string;
  isLoggedIn: string;
  address: string;
  process: string;
  newPosts: number;
  openEditProfile: boolean;
  profile: any;
  handles: any;
  bSignup: boolean;
}

class HomePage extends React.Component<{}, HomePageState> {

  quillRef: any;
  wordCount = 0;
  refresh: any;

  constructor(props: {}) {
    super(props);
    this.state = {
      posts: [],
      avatar: '',
      nickname: '',
      question: '',
      alert: '',
      message: '',
      loading: true,
      loadNextPage: false,
      range: 'everyone',
      isLoggedIn: '',
      address: '',
      process: '',
      newPosts: 0,
      openEditProfile: false,
      profile: '',
      handles: [],
      bSignup: false,
    };

    this.onQuestionYes = this.onQuestionYes.bind(this);
    this.onQuestionNo = this.onQuestionNo.bind(this);

    subscribe('wallet-events', () => {
      this.forceUpdate();
    });
  }

  componentDidMount() {
    this.start();
  }

  componentWillUnmount(): void {
  }

  async start() {
    let address = await isLoggedIn();
    this.setState({ isLoggedIn: address, address });

    // FOR TEST
    if (address) this.getUserHandles();
  }

  async getUserHandles() {
    // get the user's handles
    // let handles = await Service.getUserHandles(address);

    // FOR TEST
    // let handles = [] as any;
    let handles = ['handle-1', 'handle-2'];

    this.setState({ handles });
  }

  async connectWallet() {
    let connected = await connectWallet();
    if (connected) {
      let address = await getWalletAddress();
      console.log("address:", address)

      this.setState({ isLoggedIn: 'true', address });

      // FOR TEST
      this.getUserHandles();

      // TODO: should check to if is exist of profile
      // if (await this.getProfile() == false)
      //   this.register(address);

      // Server.service.setIsLoggedIn(address);
      // Server.service.setActiveAddress(address);
      // publish('wallet-events');

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
  async register(address: string) {
    let nickname = address.substring(0, 4) + '...' + address.substring(address.length - 4);
    let data = { address, avatar: randomAvatar(), banner: '', nickname, bio: '', time: timeOfNow() };
    // messageToAO(MINI_SOCIAL, data, 'Register');
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
    let divs = [];

    for (let i = 0; i < this.state.handles.length; i++) {
      let handle = this.state.handles[i];
      divs.push(
        <div key={i} className='home-page-did' onClick={() => this.pickHandle(handle)}>
          <img
            className='home-page-portrait'
            src={randomAvatar()}
          />

          <div key={uuid()} className="home-page-nickname">
            {handle}
          </div>
        </div>
      )
    }

    divs.push(
      <div className='home-page-did' onClick={() => this.signUp()}>
        <BsFillPersonPlusFill size={30} />
      </div>
    )

    return divs;
  }

  renderHeader() {
    return (
      <div className='home-page-welcome-logo-row'>
        <img className='home-page-welcome-logo' src='/logo-ao.png' />
        <div className='app-logo-text'>MostAO</div>
      </div>
    )
  }

  renderSignUp() {
    return (
      <div>
        <div className='home-page-title'>Sign up a new handle</div>
        <div>
          <input
            className="home-page-input"
            placeholder="Handle name"
          // value={this.state.msg}
          // onChange={(e) => this.setState({ msg: e.target.value })}
          // onKeyDown={this.handleKeyDown}
          />

          <button className="home-signup-button" onClick={() => this.connectWallet()}>
            Sign Up
          </button>
        </div>
      </div>
    )
  }

  render() {
    if (!this.state.isLoggedIn) {
      // Connect to a wallet
      return (
        <div className='home-page-welcome'>
          {this.renderHeader()}
          <h1>Messages and other stuff transmitted by AO</h1>
          <button className="home-connect-button" onClick={() => this.connectWallet()}>
            Connect ArConnect
          </button>
        </div>
      )
    }
    // Sign up
    else if (this.state.handles.length == 0) {
      return (
        <div className='home-page-welcome'>
          {this.renderHeader()}
          {this.renderSignUp()}
        </div>
      )
    }
    // Pick a handle
    else if (this.state.handles.length > 0) {
      return (
        <div className='home-page-welcome'>
          {this.renderHeader()}
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