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
import { decryptAESKeyWithPlugin, decryptMessageWithAES, encryptMessageWithAES, generateAESKey, prepareSessionKeyData } from '../util/crypto';
import Logo from '../elements/Logo';
import HandleSearchButton from '../modals/handleSearch/HandleSearchButton';
import HandleSearch from '../modals/handleSearch/HandleSearch';
import {DecryptedMessage, Messages, ProfileType} from '../util/types';
import Avatar from '../modals/Avatar/avatar';

declare let window: any;
let msg_timer: any;

interface ChatPageProps {
  location: any;
  navigate: any;
  params: any;
}

interface SessionKey {
  encrypted_sk_by_a: string;
  pubkey_a: string;
  encrypted_sk_by_b: string;
  pubkey_b: string;
  generation: number;
}

type Session = {
  otherHandleName: string;
  sessionID: string;
  otherHandleID: string;
  keys?: SessionKey[];
  aesKey?: Uint8Array;
  lastMessageTime?: number;
} & {
  hasNewMessage?: boolean;
}

interface ChatPageState {
  msg: string;
  messages: Messages[];
  decryptedMessages: any[];
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
  sessions: Session[];
  navigate: string;
  handle: string;
  pid: string;
  currentSession: Session;
  profiles: {[key: string]: ProfileType};
  isShowHandleSearch: boolean;
  loadingChatList: boolean;
}

let chatListPollTimer: NodeJS.Timeout | null = null;

class ChatPage extends React.Component<ChatPageProps, ChatPageState> {
  constructor(props: ChatPageProps) {
    super(props);
    this.state = {
      msg: '',
      messages: [],
      decryptedMessages: [],
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
      isShowHandleSearch: false,
      loadingChatList: true,
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
    console.log('---- componentDidUpdate ----');
    if (prevState.messages !== this.state.messages) {
      this.decryptAllMessages();
    }
    if (this.state.currentSession && prevState.currentSession !== this.state.currentSession && this.state.currentSession.hasNewMessage) {
      this.getMessages()
    }
  }

  async decryptAllMessages() {
    const { messages, currentSession: s, handle, profiles } = this.state;
    const currentSession = {
      ...s,
      hasNewMessage: false,
    };
    if (
      currentSession &&
      (!currentSession.keys || currentSession.keys.length === 0)
    ) {
      const keys = await this.getCurrentKeys(currentSession.sessionID);
      currentSession.keys = keys;
    }
    const decryptedMessages = await Promise.all(
      messages.map(async (data) => {
        console.log('data:', data);
        console.log('currentSession:', currentSession);
        const sessionKey = currentSession.keys?.find(
          (key) => key.generation === data.generation
        );
        console.log('sessionKey:', sessionKey);
        let decryptedMessage = '';

        if (sessionKey) {
          if (!currentSession.aesKey) {
            // decrypt with RSA
            if (sessionKey.pubkey_a === profiles[handle].pubkey) {
              currentSession.aesKey = await decryptAESKeyWithPlugin(
                sessionKey.encrypted_sk_by_a
              );
            } else if (sessionKey.pubkey_b === profiles[handle].pubkey) {
              currentSession.aesKey = await decryptAESKeyWithPlugin(
                sessionKey.encrypted_sk_by_b
              );
            }
          }
          try {
            decryptedMessage = await decryptMessageWithAES(
              data.content,
              currentSession.aesKey
            );
          } catch (error) {
            console.error('Failed to decrypt message:', error);
            decryptedMessage = '[Failed to decrypt message]';
          }
        } else {
          decryptedMessage = '[No key available]';
        }

        return {
          ...data,
          decryptedMessage,
        };
      })
    );

    this.setState({ decryptedMessages, currentSession });
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);
  }

  componentWillUnmount(): void {
    clearInterval(msg_timer);
    if (chatListPollTimer) {
      clearInterval(chatListPollTimer);
    }
  }

  async getCurrentKeys(sessionID: string): Promise<SessionKey[]> {
    const { handle, profiles } = this.state;
    const keys = await getDataFromAO(sessionID, 'GetCurrentKeys', {});
    // if (keys && keys.length > 0) {
    //   for (const key of keys) {
    //     if (keys.pubkey_a === profiles[handle].pubkey) {
    //       key.aesKey = await decryptAESKeyWithPlugin(key.encrypted_sk_by_a);
    //     } else if (keys.pubkey_b === profiles[handle].pubkey) {
    //       key.aesKey = await decryptAESKeyWithPlugin(key.encrypted_sk_by_b);
    //     }
    //   }
    // }
    return keys;
  }

  async start() {
    clearInterval(msg_timer);

    const path = window.location.hash.slice(1);
    const handle = path.substring(6);
    console.log("handle:", handle);

    setTimeout(() => {
      this.getInfo(handle);
    }, 1000);
  }

  async getInfo(handle: string) {
    const address = await getWalletAddress();
    // console.log("address:", address)

    const handles = await getDataFromAO(HANDLE_REGISTRY, 'GetHandles', { owner: address });
    console.log("handles:", handles)

    let pid = '';
    for (let i = 0; i < handles.length; i++) {
      if (handle == handles[i].handle) {
        pid = handles[i].pid;
        break;
      }
    }
    console.log("pid:", pid)

    if (!pid) {
      this.setState({ alert: 'Your handle is not found. Please refresh this page.', loading: false });
      return;
    }

    const myProfile = await getProfile(pid);
    console.log("myProfile:", myProfile);

    this.setState({ handle, pid, address, handles, profiles: { [handle]: myProfile } });

    setTimeout(async () => {
      this.setState({loading: false});
      await this.getChatList();
      this.pollingChatList();
    }, 50);
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

  async getChatList () {
    // if (this.state.chatList.length > 0 || !this.state.currentHandle) return;

    const data = {address: this.state.address};
    // console.log("getChatList for process of pid:", this.state.pid);

    const sessions: Session[] = await getDataFromAO(this.state.pid, 'GetChatList', data);

    if (!sessions) return;
    if (sessions.length === 0) return;
    const oldSessions = this.state.sessions;
    const newSessions = sessions.filter(
      (session) => !oldSessions.find((s) => s.sessionID === session.sessionID)
    );

    console.log("getChatList:", sessions);

    let shouldUpdate = false;

    const profiles = {...this.state.profiles};
    if (newSessions.length > 0) {
      console.log("newSessions:", newSessions);
      shouldUpdate = true

      const profilesPromises = newSessions.map(async (chat) => {
        if (!profiles[chat.otherHandleName]) {
          await getProfile(chat.otherHandleID).then(res => {
            profiles[chat.otherHandleName] = res;
          }).catch(err => {
            console.error("Failed to get profile:", err);
          })
        }
      });
      await Promise.allSettled(profilesPromises);
    }

    sessions.forEach((el) => {
      let oldItem = oldSessions.find((s) => s.sessionID === el.sessionID);
      console.log(
        'sessions forEach:',
        el.otherHandleName,
        'old: ',
        oldItem?.lastMessageTime,
        'new: ',
        el?.lastMessageTime
      );
      if (oldItem && (oldItem.lastMessageTime || 0) < el.lastMessageTime) {
        el.hasNewMessage = true;
        shouldUpdate = true;
      } else if (oldItem && oldItem.hasNewMessage) {
        el.hasNewMessage = true;
      }
    });
    if (shouldUpdate) {
      if (this.state.currentSession) {
        const sameSession = sessions.find(session => session.sessionID === this.state.currentSession.sessionID);
        const updatedSession = {
          ...this.state.currentSession,
          ...sameSession,
        }
        this.setState({sessions, profiles, currentSession: updatedSession, loadingChatList: false});
      } else {
        this.setState({sessions, profiles, loadingChatList: false});
      }
    }
  }

  pollingChatList() {
    const timer = setTimeout(async () => {
      await this.getChatList();
      this.pollingChatList();
    }, 2000);
    chatListPollTimer = timer;
  }

  async selectSession (session: Session) {
    try {
      const keys = await getDataFromAO(session.sessionID, 'GetCurrentKeys', {});

      const updatedSession = {
        ...session,
        keys: keys || []
      };

      this.setState({ currentSession: updatedSession, messages: [], decryptedMessages: [] }, () => {
        this.getMessages();
      });
    } catch (error) {
      console.error("Failed to get current keys:", error);
    }
  }


  async getKeysForSession(sessionID: string) {
    const keys = await getDataFromAO(sessionID, 'GetCurrentKeys', {});
    const updatedSessions = this.state.sessions.map(session =>
      session.sessionID === sessionID ? { ...session, keys } : session
    );
    this.setState({ sessions: updatedSessions });
  }

  async getMessages() {
    const { currentSession } = this.state;
    if (!currentSession) return;
    console.log("DM messages -->");
    const data = { from: 0, until: timeOfNow(), limit: 100, order: 'DESC' };

    let messages: any[] = await getDataFromAO(currentSession.sessionID, 'QueryMessage', data);
    console.log("messages:", messages);
    if (!messages) return;

    messages = messages.reverse();

    let updatedSession = {
      ...currentSession,
      hasNewMessage: false
    }
    const updatedSessions = this.state.sessions.map(el => {
      if (el.sessionID === currentSession.sessionID) {
        return updatedSession;
      }
      return el;
    })

    this.setState({messages, loading: false, sessions: updatedSessions, currentSession: updatedSession});
  }

  goChat(id: string) {
    this.setState({ navigate: '/chat/' + id, messages: [] });
    setTimeout(() => {
      publish('go-chat');
    }, 50);
  }

  renderChatList() {
    if (this.state.loadingChatList)
      return (<Loading />);
    const divs = [];
    const { sessions, currentSession } = this.state;

    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      const selected = currentSession && session.sessionID === currentSession.sessionID;
      const p = this.state.profiles[session.otherHandleName];

      divs.push(
        <div
          key={i}
          className={`chat-page-list ${selected ? 'selected' : ''}`}
          onClick={() => this.selectSession(session)}>
            <Avatar
            name={p?.name}
            imgUrl={p?.img}
            handleName={session.otherHandleName}
            pid={session.otherHandleID}
            />
          {
            session.hasNewMessage &&
            <i className='unread-pointer'></i>
          }
        </div>
      );
    }

    return divs;
  }

  renderChatName() {
    const { currentSession, profiles } = this.state;

    if (!currentSession) {
      return (
        <div style={{ height: '40px', display: 'flex', alignItems: 'center' }}>
          No chat selected
        </div>
      );
    }
    const p = profiles[currentSession.otherHandleName];
    return (
      <Avatar
      name={p?.name}
      pid={currentSession.otherHandleID}
      handleName={currentSession.otherHandleName}
      imgUrl={p?.img}
      />
    )
  }

  renderMessages() {
    if (this.state.loading)
      return (<Loading />);

    const { currentSession, handle, pid, decryptedMessages, profiles } = this.state;
    const divs = [];

    for (let i = 0; i < decryptedMessages.length; i++) {
      const data: DecryptedMessage = decryptedMessages[i];
      const owner = (data.sender === pid);
      const msgProfile = profiles[owner ? handle : currentSession.otherHandleName];
      const msgHandleName = owner ? handle : currentSession.otherHandleName;

      divs.push(
        <div key={i} className={`chat-msg-line ${owner ? 'my-line' : 'other-line'}`}>
          {!owner && <img className='chat-msg-portrait' src={msgProfile.img || generateAvatar(currentSession.otherHandleID)} />}

          <div>
            <div className={`chat-msg-header ${owner ? 'my-line' : 'other-line'}`}>
              <div className="chat-msg-nickname">{
                msgProfile?.name ? shortStr(msgProfile?.name, 15) : `@${msgHandleName}`
              }</div>

              {/* <div className="chat-msg-address">{shortAddr(data.address, 3)}</div> */}
            </div>

            <div className={`chat-message ${owner ? 'my-message' : 'other-message'}`}>
              {data.decryptedMessage}
            </div>

            <div className={`chat-msg-time ${owner ? 'my-line' : 'other-line'}`}>
              {formatTimestamp(data.timestamp, true)}
            </div>
          </div>

          {owner && <img className='chat-msg-portrait' src={msgProfile.img || generateAvatar(pid)} />}
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
    const { sessions, currentSession, profiles, handle, pid, messages } = this.state;
    const keys = await getDataFromAO(currentSession.sessionID, 'GetCurrentKeys', {});
    let generation = 1;
    let aesKey: Uint8Array;

    if (!messages.length) {
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

        const updatedSession: Session = {
          ...currentSession,
          keys: [{ ...sessionKeyData, generation }],
          aesKey,
        };
        const updatedSessions = sessions.map(session =>
          session.sessionID === currentSession.sessionID ? updatedSession : session
        );
        this.setState({ sessions: updatedSessions, currentSession: updatedSession });

        const relaySessionKey = {
          Target: currentSession.sessionID,
          Data: JSON.stringify(sessionKeyData),
          Tags: [{ name: "Action", value: "RotateSessionKey" }]
        };
        await messageToAO(pid, relaySessionKey, 'RelayMessage');
      }
    } else {
      generation = keys[0].generation;
      if (keys[0].generation === currentSession.keys[0].generation) {
        if (!currentSession.aesKey) {
          currentSession.aesKey = keys[0].pubkey_a === profiles[handle].pubkey ? await decryptAESKeyWithPlugin(keys[0].encrypted_sk_by_a) : await decryptAESKeyWithPlugin(keys[0].encrypted_sk_by_b);
        }
        aesKey = currentSession.aesKey;
      }
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

  openHandleSearch = () => {
    this.setState({isShowHandleSearch: true});
  }
  closeHandleSearch = () => {
    this.setState({isShowHandleSearch: false});
  }

  renderHandleDropdown () {
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
    const { currentSession } = this.state;

    return (
      <div className='chat-page-send-container'>
        <input
          id='input_msg'
          className="chat-input-message"
          placeholder="message"
          value={this.state.msg}
          onChange={(e) => this.setState({ msg: e.target.value })}
          onKeyDown={this.handleKeyDown}
          autoComplete="off"
        />
        <button disabled={!currentSession} className="chat-send-button" onClick={() => this.sendMessage()}>Send</button>
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

    const currentProfile: ProfileType = this.state.profiles[this.state.handle];

    return (
      <div className="chat-page">
        <BsArrowLeftCircleFill className="profile-page-back" size={30} onClick={() => this.onBack()} />

        <div className='chat-page-container'>
          <div className='chat-page-sidebar'>
            {/* search button */}
            <HandleSearchButton onClick={() => this.openHandleSearch()} />
            <div className='chat-page-chat-list'>
              {this.renderChatList()}
            </div>
            <div className='profile-section'>
              <Avatar
              className="chat-page-my-profile"
              pid={this.state.pid}
              name={currentProfile.name}
              imgUrl={currentProfile.img}
              handleName={this.state.handle}
              // onClick={() => this.setState({ showHandlesDropdown: !this.state.showHandlesDropdown })}
              />

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
            {this.renderChatName()}
            <div id="scrollableDiv" className="chat-page-messages-container">
              {this.renderMessages()}
            </div>

            {this.renderSend()}
          </div>
        </div>

        {/* <MessageModal message={this.state.message} /> */}
        <AlertModal message={this.state.alert} button="OK" onClose={() => this.setState({alert: ''})} />
        <HandleSearch
          isOpen={this.state.isShowHandleSearch}
          onClose={this.closeHandleSearch}
          myHandleName={this.state.handle}
        />
      </div>
    );
  }
}

export default withRouter(ChatPage);
