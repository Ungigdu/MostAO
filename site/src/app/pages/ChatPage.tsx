import React from 'react';
import './ChatPage.css';
import AlertModal from '../modals/AlertModal';
import {
  formatTimestamp, generateAvatar, getDataFromAO, getProfile, getWalletAddress,
  messageToAO, shortAddr, shortStr, timeOfNow
} from '../util/util';
import { HANDLE_REGISTRY } from '../util/consts';
import Loading from '../elements/Loading';
import { Navigate } from 'react-router-dom';
import { publish, subscribe } from '../util/event';
import { BsArrowLeftCircleFill, BsGear } from 'react-icons/bs';
import { withRouter } from '../util/withRouter';
import { decryptAESKeyWithPlugin, encryptMessageWithAES, generateAESKey, prepareSessionKeyData } from '../util/crypto';

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
  // handles: { [key: string]: HandleProfile };
  handles: any;
  currentHandle: string;
  showHandlesDropdown: boolean;
  friendHandle: string;
  sessions: any[];
  navigate: string;
  handle: string;
  pid: string;
  currentSession: any;
  profiles: { [key: string]: any };
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
      handles: '',
      currentHandle: '',
      showHandlesDropdown: false,
      friendHandle: '',
      sessions: [],
      navigate: '',
      handle: '',
      pid: '',
      currentSession: null,
      profiles: {},
    };

    subscribe('go-chat', () => {
      this.setState({ navigate: '' });
      this.start();
    });
  }

  componentDidMount() {
    // const state = this.props.location.state || {};
    // const handles = state.handles || {};
    // let currentHandle = state.currentHandle || '';

    // console.log("handles:", handles);
    // console.log("currentHandle:", currentHandle);
    // if (!currentHandle && Object.keys(handles).length > 0) {
    //   currentHandle = Object.keys(handles)[0];
    // }

    // this.setState({ handles, currentHandle }, () => {
    //   this.start();
    // });

    // updated by Kevin
    this.start();
  }

  componentDidUpdate(prevProps: ChatPageProps, prevState: ChatPageState) {
    // if (prevState.handles !== this.state.handles) {
    //   localStorage.setItem('handles', JSON.stringify(this.state.handles));
    // }

    // if (prevState.currentHandle !== this.state.currentHandle) {
    //   localStorage.setItem('currentHandle', this.state.currentHandle);
    // }
  }

  componentWillUnmount(): void {
    clearInterval(msg_timer);
  }

  // useEffect(() => {
  //   const GetCurrentKeys = async () => {
  //     const keys = await getDataFromAO(this.)
  //   }
  //   GetCurrentKeys();
  // }, [this.state.currentSessionID]);


  async start() {
    clearInterval(msg_timer);

    const path = window.location.hash.slice(1);
    const handle = path.substring(6);
    console.log("handle:", handle);

    // const pid = await getDataFromAO(HANDLE_REGISTRY, 'QueryHandle', { handle: handle });
    // console.log("pid:", pid)

    const address = await getWalletAddress();
    console.log("address:", address)

    const handles = await getDataFromAO(HANDLE_REGISTRY, 'GetHandles', { owner: address });
    console.log("handles:", handles)

    let pid = '';
    for (let i = 0; i < handles.length; i++) {
      if (handle == handles[i].handle) {
        pid = handles[i].pid;
        break;
      }
    }
    const myProfile = await getProfile(pid);
    console.log("myProfile:", myProfile);

    if (!pid) {
      this.setState({ alert: 'Your handle is not found.' });
      return;
    }

    this.setState({ handle, pid, address, handles, profiles: { [handle]: myProfile } });

    setTimeout(() => {
      this.getChatList();
      this.setState({ loading: false });
    }, 50);

    // const currentHandle = this.state.handles[this.state.currentHandle];
    // const myProfile = await getProfile(currentHandle.pid);
    // if (myProfile) {
    //   this.setState(prevState => ({
    //     handles: {
    //       ...prevState.handles,
    //       [this.state.currentHandle]: {
    //         ...prevState.handles[this.state.currentHandle],
    //         profile: myProfile
    //       }
    //     }
    //   }));
    // }

    // this.setState({ address, friend: handle });

    // if (handle) {
    //   setTimeout(() => {
    //     this.goDM();
    //   }, 50);
    // } else {
    //   setTimeout(() => {
    //     this.getChatList();
    //     this.setState({ loading: false });
    //   }, 50);
    // }
  }

  async goDM() {
    this.getChatList();

    let friendProfile = await getProfile(this.state.friend);
    console.log("friendProfile:", friendProfile);

    // for test
    if (!friendProfile) return;

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
    // if (this.state.chatList.length > 0 || !this.state.currentHandle) return;

    const data = { address: this.state.address };
    // console.log("getChatList for process of pid:", this.state.pid);

    const sessions = await getDataFromAO(this.state.pid, 'GetChatList', data);
    console.log("getChatList:", sessions);

    const profiles = { ...this.state.profiles };
    for (const chat of sessions) {
      if (!profiles[chat.otherHandleID]) {
        const profile = await getProfile(chat.otherHandleID);
        profiles[chat.otherHandleName] = profile;
      }
    }

    if (sessions.length > 0)
      // this.goChat(chatList[0].sessionID);
      this.setState({ sessions, profiles, loading: false });
    else
      this.setState({ loading: false });
  }

  async getMessages() {
    const { currentSession } = this.state;
    if (!currentSession) return;
    console.log("DM messages -->");
    const data = { from: 0, until: timeOfNow(), limit: 100, order: 'DESC' };

    const messages = await getDataFromAO(currentSession.sessionID, 'QueryMessage', data);
    console.log("messages:", messages);
    if (!messages) return;

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
    const { sessions, currentSession } = this.state;

    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      const selected = currentSession && session.sessionID === currentSession.sessionID;

      divs.push(
        <div
          key={i}
          className={`chat-page-list ${selected ? 'selected' : ''}`}
          onClick={() => this.setState({ currentSession: session }, this.getMessages)}
        >
          <img className='chat-page-list-portrait' src={generateAvatar(session.otherHandleID)} />
          <div>
            <div className="chat-page-list-nickname">{session.otherHandleName}</div>
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
    const { currentSession, profiles, handle, pid } = this.state;
    const keys = await getDataFromAO(currentSession.sessionID, 'GetCurrentKeys', {});
    let generation = 0;
    let aesKey;

    if (!this.state.messages.length) {
      if (!keys || keys.length === 0) {
        console.log("keys not found");

        aesKey = await generateAESKey();
        console.log("generated AES key:", aesKey);
        const ownPublicKey = profiles[handle].pubkey;
        console.log("ownPublicKey:", ownPublicKey);
        console.log("currentSession.otherHandleID :", currentSession.otherHandleName);
        const otherPublicKey = profiles[currentSession.otherHandleName].pubkey;
        console.log("otherPublicKey:", otherPublicKey);

        if (!ownPublicKey || !otherPublicKey) {
          this.setState({ alert: 'Public keys not found.' });
          return;
        }
        const sessionKeyData = await prepareSessionKeyData(aesKey, ownPublicKey, otherPublicKey);
        console.log("session key data:", sessionKeyData);

        const relaySessionKey = {
          Target: currentSession.sessionID,
          Data: JSON.stringify(sessionKeyData),
          Tags: [{ name: "Action", value: "RotateSessionKey" }]
        };
        await messageToAO(pid, relaySessionKey, 'RelayMessage');
      }
    } else {
      generation = keys[0].generation;
      aesKey = await decryptAESKeyWithPlugin(keys[0].encrypted_sk_by_a);
    }

    const encryptedMessage = await encryptMessageWithAES(msg, aesKey);
    console.log("encryptedMessage:", encryptedMessage);
    const relayMessage = {
      Target: currentSession.sessionID,
      Data: JSON.stringify({ content: encryptedMessage, generation: generation }),
      Tags: [{ name: "Action", value: "SendMessage" }]
    };

    this.setState({ msg: '' });

    await messageToAO(pid, relayMessage, 'RelayMessage');

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

    // return (
    //   <div className="handle-dropdown">
    //     {Object.keys(this.state.handles).map(handleKey => (
    //       <div key={handleKey} onClick={() => this.switchHandle(handleKey)}>
    //         <img src={generateAvatar(this.state.handles[handleKey].pid)} alt={handleKey} className="avatar-small" />
    //         {handleKey}
    //       </div>
    //     ))}
    //   </div>
    // );


    const divs = [];
    const list = this.state.handles;

    for (let i = 0; i < list.length; i++) {
      const data = list[i];

      divs.push(
        <div key={i} onClick={() => this.switchHandle(data.handle)}>
          <img src={generateAvatar(data.pid)} className="avatar-small" />
          {data.handle}
        </div>
      );
    }

    return divs;
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

    // const currentHandle = this.state.handles[this.state.currentHandle];

    // if (!currentHandle) {
    //   return <Loading />;
    // }

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
                <img src={generateAvatar(this.state.pid)} alt="current handle" className="avatar-small" />
                {/* {currentHandle.profile?.name || `@${currentHandle.handle}`} */}
                {this.state.handle}
              </div>

              <div className="handle-dropdown">
                {this.renderHandleDropdown()}
              </div>

              {/* <div className="settings-icon" onClick={() => this.props.navigate(`/handle/${currentHandle.handle}`, { state: { pid: currentHandle.pid } })}> */}
              <div className="settings-icon" onClick={() => this.props.navigate(`/handle/${this.state.handle}`)}>
                <BsGear size={24} />
              </div>
            </div>
          </div>

          <div className='chat-page-chat-container'>
            {/* <div>Public Chatroom</div> */}
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