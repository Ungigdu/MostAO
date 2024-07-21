import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  BsAward, BsBookmark, BsChatText, BsController, 
  BsPerson
} from 'react-icons/bs';
import {
  
  isLoggedIn} from '../util/util';
import { Server } from '../../server/server';
import { publish, subscribe } from '../util/event';
import './SitePage.css';
import ConnectWallet from '../elements/ConnectWallet';

interface SitePageState {
  users: number;
  posts: number;
  replies: number;
  open: boolean;
  address: string;
  openMenu: boolean;
}

class SitePage extends React.Component<{}, SitePageState> {

  constructor(props: {}) {
    super(props);
    this.state = {
      users: 0,
      posts: 0,
      replies: 0,
      open: false,
      address: '',
      openMenu: false,
    };

    this.onOpen = this.onOpen.bind(this);
    this.onClose = this.onClose.bind(this);

    subscribe('wallet-events', () => {
      // const address = Server.service.isLoggedIn();
      // this.setState({ address })
      this.start();
    });
  }

  componentDidMount() {
    this.start();
  }

  async start() {
    const address = await isLoggedIn();
    console.log("site page -> address:", address)

    Server.service.setIsLoggedIn(address);
    Server.service.setActiveAddress(address);
    this.setState({ address })

    // const process = await getDefaultProcess(address);
    // Server.service.setDefaultProcess(process);
  }

  onOpen() {
    this.setState({ open: true });
  }

  onClose() {
    this.setState({ open: false });
    publish('new-post');
  }

  render() {
    return (
      <div className="app-container">
        {/* <div className='site-page-header-pc'>
          <NavLink className='app-logo-line' to='/'>
            <img className='app-logo' src='./logo.png' />
          </NavLink>

          <div className='app-status-row'>
            <div className='app-status-data'><BsPeopleFill />{this.state.users}</div>
            <div className='app-status-data'><BsSendFill />{this.state.posts}</div>
            <div className='app-status-data'><BsReplyFill />{this.state.replies}</div>
          </div>
        </div> */}

        {/* FOR MOBILE */}
        <div className='site-page-header-mobile'>
          <NavLink to='/'>
            <img className='app-logo' src='./logo.png' />
          </NavLink>
        </div>

        <div className="app-content">
          {/* <div className="app-navbar">
            <NavBar />

            {this.state.address &&
              <div className="app-post-button" onClick={this.onOpen}>
                <BsSend size={22} />Post
              </div>
            }

            <Portrait />
          </div> */}

          <div className="app-page">
            <ConnectWallet address={this.state.address} />
            <Outlet />
          </div>
        </div>
      </div>
    );
  }
}

export default SitePage;