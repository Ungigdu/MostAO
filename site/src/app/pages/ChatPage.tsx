import React from 'react';
import './ChatPage.css';
import AlertModal from '../modals/AlertModal';
import {
  formatTimestamp, generateAvatar, getDataFromAO, getProfile, getWalletAddress,
  messageToAO, shortAddr, shortStr, timeOfNow
} from '../util/util';
import { AO_TWITTER } from '../util/consts';
import Loading from '../elements/Loading';
import { Navigate } from 'react-router-dom';
import { publish, subscribe } from '../util/event';
import { BsArrowLeftCircleFill, BsGear } from 'react-icons/bs';
import { withRouter } from '../util/withRouter';
import { HandleProfile } from './HomePage';

declare let window: any;
let msg_timer: any;

interface ChatPageProps {
  location: any;
  navigate: any;
  params: any;
}

interface ChatPageState {
  msg: string;
  messages: any[];
  question: string;
  alert: string;
  loading: boolean;
  address: string;
  friend: string;
  handles: { [key: string]: HandleProfile };
  currentHandle: string;
  showHandlesDropdown: boolean;
  friendHandle: string;
  chatList: any[];
  navigate: string;
}

class ChatPage extends React.Component<ChatPageProps, ChatPageState> {
  constructor(props: ChatPageProps) {
    super(props);
    this.state = {
      msg: '',
      messages: [],
      question: '',
      alert: '',
      loading: true,
      address: '',
      friend: '',
      handles: {},
      currentHandle: '',
      showHandlesDropdown: false,
      friendHandle: '',
      chatList: [],
      navigate: '',
    };

    subscribe('go-chat', () => {
      this.setState({ navigate: '' });
      this.start();
    });
  }

  componentDidMount() {
    const state = this.props.location.state || {};
    const handles = state.handles || {};
    let currentHandle = state.currentHandle || '';

    console.log("handles:", handles);
    console.log("currentHandle:", currentHandle);
    if (!currentHandle && Object.keys(handles).length > 0) {
      currentHandle = Object.keys(handles)[0];
    }

    this.setState({ handles, currentHandle }, () => {
      this.start();
    });
  }

  componentDidUpdate(prevProps: ChatPageProps, prevState: ChatPageState) {
    if (prevState.handles !== this.state.handles) {
      localStorage.setItem('handles', JSON.stringify(this.state.handles));
    }

    if (prevState.currentHandle !== this.state.currentHandle) {
      localStorage.setItem('currentHandle', this.state.currentHandle);
    }
  }

  componentWillUnmount(): void {
    clearInterval(msg_timer);
  }

  async start() {
    clearInterval(msg_timer);

    const path = window.location.hash.slice(1);
    const friend = path.substring(6);
    console.log("friend:", friend);

    const address = await getWalletAddress();
    console.log("me:", this.state.currentHandle);

    const currentHandle = this.state.handles[this.state.currentHandle];
    const myProfile = await getProfile(currentHandle.pid);
    if (myProfile) {
      this.setState(prevState => ({
        handles: {
          ...prevState.handles,
          [this.state.currentHandle]: {
            ...prevState.handles[this.state.currentHandle],
            profile: myProfile
          }
        }
      }));
    }

    this.setState({ address, friend });

    if (friend) {
      setTimeout(() => {
        this.goDM();
      }, 50);
    } else {
      setTimeout(() => {
        this.getChatList();
        this.setState({ loading: false });
      }, 50);
    }
  }

  async goDM() {
    this.getChatList();

    let friendProfile = await getProfile(this.state.friend);
    console.log("friendProfile:", friendProfile);

    if (friendProfile.length === 0) return;

    friendProfile = friendProfile[0];
    if (friendProfile)
      this.setState({
        friendHandle: this.state.friend,
      });

    setTimeout(() => {
      this.getMessages();
    }, 50);

    clearInterval(msg_timer);

    setTimeout(() => {
      msg_timer = setInterval(() => this.getMessages(), 2000);
    }, 50);

    setTimeout(() => {
      this.scrollToBottom();
    }, 1000);
  }

  async getChatList() {
    if (this.state.chatList.length > 0 || !this.state.currentHandle) return;

    const data = { address: this.state.address };
    console.log("getChatList for process of pid:", this.state.handles[this.state.currentHandle].pid);
    const chatList = await getDataFromAO(this.state.handles[this.state.currentHandle].pid, 'GetChatList', data);
    console.log("getChatList:", chatList);

    this.setState({ chatList });

    if (chatList.length > 0)
      this.goChat(chatList[0].sessionID);
    else
      this.setState({ loading: false });
  }

  async getMessages() {
    console.log("DM messages -->");
    const data = { friend: this.state.friend, address: this.state.address };
    const messages = await getDataFromAO(AO_TWITTER, 'GetMessages', data);
    console.log("messages:", messages);

    this.setState({ messages, loading: false });
    setTimeout(() => {
      this.scrollToBottom();
    }, 1000);
  }

  goChat(id: string) {
    this.setState({ navigate: '/chat/' + id, messages: [] });
    setTimeout(() => {
      publish('go-chat');
    }, 50);
  }

  renderChatList() {
    // if (this.state.loading)
    //   return (<Loading />);

    const divs = [];
    const list = this.state.chatList;

    for (let i = 0; i < list.length; i++) {
      const data = list[i];
      const selected = false;

      divs.push(
        <div
          key={i}
          className={`chat-page-list ${selected && 'selected'}`}
        // onClick={() => this.goChat(data.participant)}
        >
          <img className='chat-page-list-portrait' src={generateAvatar(data.sessionID)} />
          <div>
            <div className="chat-page-list-nickname">{data.otherHandle}</div>
            {/* <div className="chat-page-list-addr">{shortAddr(data.participant, 4)}</div> */}
          </div>
        </div>
      );
    }

    return divs;
  }

  renderMessages() {
    if (this.state.loading)
      return (<Loading />);

    const divs = [];

    for (let i = 0; i < this.state.messages.length; i++) {
      const data = this.state.messages[i];
      const owner = (data.address === this.state.address);

      divs.push(
        <div key={i} className={`chat-msg-line ${owner ? 'my-line' : 'other-line'}`}>
          {!owner && <img className='chat-msg-portrait' src={generateAvatar(this.state.handles[this.state.friendHandle]?.pid)} />}

          <div>
            <div className={`chat-msg-header ${owner ? 'my-line' : 'other-line'}`}>
              <div className="chat-msg-nickname">{
                owner
                  ? shortStr(this.state.handles[this.state.currentHandle].profile?.name, 15)
                  : this.state.handles[this.state.friendHandle]?.profile?.name
                    ? shortStr(this.state.handles[this.state.friendHandle].profile.name, 15)
                    : `@${shortStr(this.state.friendHandle, 15)}`
              }</div>

              <div className="chat-msg-address">{shortAddr(data.address, 3)}</div>
            </div>

            <div className={`chat-message ${owner ? 'my-message' : 'other-message'}`}>
              {data.message}
            </div>

            <div className={`chat-msg-time ${owner ? 'my-line' : 'other-line'}`}>
              {formatTimestamp(data.time, true)}
            </div>
          </div>

          {owner && <img className='chat-msg-portrait' src={generateAvatar(this.state.handles[this.state.currentHandle].pid)} />}
        </div>
      );
    }

    return divs.length > 0 ? divs : <div>No messages yet.</div>;
  }

  async sendMessage() {
    const msg = this.state.msg.trim();
    if (!msg) {
      this.setState({ alert: 'Please input a message.' });
      return;
    } else if (msg.length > 500) {
      this.setState({ alert: 'Message can be up to 500 characters long.' });
      return;
    }

    this.setState({ msg: '' });

    const data = { address: this.state.address, friend: this.state.friend, message: msg, time: timeOfNow() };
    await messageToAO(AO_TWITTER, data, 'SendMessage');

    setTimeout(() => {
      this.scrollToBottom();
    }, 1000);
  }

  handleKeyDown = (event: any) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // prevent the form submit action
      this.sendMessage();
    }
  }

  scrollToBottom() {
    const scrollableDiv = document.getElementById("scrollableDiv");
    if (scrollableDiv) {
      scrollableDiv.scrollTop = scrollableDiv.scrollHeight;
    } else {
      console.error("Element with id 'scrollableDiv' not found.");
    }
  }

  onBack() {
    window.history.back();
  }

  switchHandle = (handleKey: string) => {
    this.setState({ currentHandle: handleKey, showHandlesDropdown: false });
    this.start();
  }

  renderHandleDropdown() {
    if (!this.state.showHandlesDropdown) return null;

    return (
      <div className="handle-dropdown">
        {Object.keys(this.state.handles).map(handleKey => (
          <div key={handleKey} onClick={() => this.switchHandle(handleKey)}>
            <img src={generateAvatar(this.state.handles[handleKey].pid)} alt={handleKey} className="avatar-small" />
            {handleKey}
          </div>
        ))}
      </div>
    );
  }

  renderSend() {
    return (
      <div className='chat-page-send-container'>
        <input
          id='input_msg'
          className="chat-input-message"
          placeholder="message"
          value={this.state.msg}
          onChange={(e) => this.setState({ msg: e.target.value })}
          onKeyDown={this.handleKeyDown}
        />
        <button className="chat-send-button" onClick={() => this.sendMessage()}>Send</button>
      </div>
    )
  }

  render() {
    if (this.state.navigate)
      return <Navigate to={this.state.navigate} />;

    const currentHandle = this.state.handles[this.state.currentHandle];

    if (!currentHandle) {
      return <Loading />;
    }

    return (
      <div className="chat-page">
        <BsArrowLeftCircleFill className="profile-page-back" size={30} onClick={() => this.onBack()} />

        <div className='chat-page-container'>
          <div className='chat-page-sidebar'>
            <div className='chat-page-chat-list'>
              {this.renderChatList()}
            </div>
            <div className='profile-section'>
              <div className="current-handle" onClick={() => this.setState({ showHandlesDropdown: !this.state.showHandlesDropdown })}>
                <img src={generateAvatar(currentHandle.pid)} alt="current handle" className="avatar-small" />
                {currentHandle.profile?.name || `@${currentHandle.handle}`}
              </div>
              {this.renderHandleDropdown()}
              <div className="settings-icon" onClick={() => this.props.navigate(`/handle/${currentHandle.handle}`, { state: { pid: currentHandle.pid } })}>
                <BsGear size={24} />
              </div>
            </div>
          </div>

          <div className='chat-page-chat-container'>
            <div>Public Chatroom</div>
            <div id='scrollableDiv' className="chat-page-messages-container">
              {this.renderMessages()}
            </div>

            {this.renderSend()}
          </div>
        </div>

        {/* <MessageModal message={this.state.message} /> */}
        <AlertModal message={this.state.alert} button="OK" onClose={() => this.setState({ alert: '' })} />
      </div>
    );
  }
}

export default withRouter(ChatPage);