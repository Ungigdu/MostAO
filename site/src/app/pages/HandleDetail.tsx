import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { generateAvatar, getDataFromAO, getProfile, messageToAO, shortAddr } from '../util/util';
import EditProfileModal from '../modals/EditProfileModal';
import { BsArrowLeftCircleFill, BsChat } from 'react-icons/bs';
import { HANDLE_REGISTRY } from '../util/consts';
import './HandleDetail.css';
import Loading from '../elements/Loading';
import { subscribe } from '../util/event';
import Logo from '../elements/Logo';

const HandleDetail: React.FC = () => {
  // const { handleName } = useParams<{ handleName: string }>();
  // const location = useLocation();
  // const pid = (location.state as any).pid;

  const [profile, setProfileData] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [otherHandleName, setOtherHandleName] = useState('');
  const [pid, setPID] = useState('');
  const navigate = useNavigate();

  // Added by Kevin

  const path = window.location.hash.slice(1);
  const handle = path.substring(8);
  // console.log("handle:", handle)

  let filterSelected = 0;
  const [profileUpdated, setProfileUpdated] = useState(false);

  useEffect(() => {
    const fetchProfileAndHistory = async () => {
      try {
        let res = await getDataFromAO(HANDLE_REGISTRY, 'QueryHandle', { handle: handle });
        const pid = res.pid;
        setPID(pid);

        const response = await getProfile(pid);
        const profileData = response || [];
        setProfileData(profileData);

        if (profileData) {
          // TODO: implement getChatHistory
          const history = await getDataFromAO(pid, "GetChatList", {});
          console.log('history => ', history);
          setChatHistory(history);
        }
      } catch (error) {
        console.error("Error fetching profile or chat history:", error);
      } finally {
        setLoading(false);
        setProfileUpdated(false);
      }
    };

    fetchProfileAndHistory();
  }, [handle, profileUpdated]);

  subscribe('profile-updated', () => {
    setProfileUpdated(true);
  });

  const handleEditProfile = () => {
    setEditProfileModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditProfileModalOpen(false);
  };

  const handleBack = () => {
    // navigate('/');
    window.history.back();
  };

  const handleEstablishSession = async () => {
    try {
      const response = await messageToAO(
        HANDLE_REGISTRY,
        { handleA: handle, handleB: otherHandleName },
        "EstablishSession"
      );
      console.log(response);
      if (response) {
        console.log("Session established successfully");
        // Optionally update chat history or provide feedback to the user
      } else {
        console.error("Failed to establish session:", response);
      }
    } catch (error) {
      console.error("Error establishing session:", error);
    }
  };

  // Added by Kevin

  if (loading) {
    return (
      <div className='home-page-welcome'>
        <Logo />
        <Loading marginTop='50px' />
      </div>
    )
  }

  function openChat() {
  }

  function renderChatHistory() {
    if (!chatHistory) return;

    const divs = [];
    for (let i = 0; i < chatHistory.length; i++) {
      const chat = chatHistory[i];
      divs.push(
        <div key={i} className='home-page-session' onClick={() => openChat()}>
          <BsChat size={30} />
          <div>
            <div className='home-page-d'>{chat.otherHandle}</div>
            <div className='home-page-session-id'>{chat.sessionID}</div>
          </div>
        </div>
      )
    }

    return divs;
  }

  function renderActionButtons() {
    // if (this.state.loading)
    //   return (<div className="profile-page-button-container" style={{ height: '42px' }}></div>);

    return (
      <div className="profile-page-button-container">
        <div onClick={handleEditProfile} className="profile-page-follow-button following">
          Edit Profile
        </div>
      </div>
    )
  }

  function onFilter(index: number) {
    if (filterSelected === index) return;

    filterSelected = index;
    renderFilters();

    if (index === 0) { // Activity
      // this.setState({ posts: [] });
      // setTimeout(() => {
      //   this.getPosts(this.author);
      // }, 10);
    }
  }

  function renderFilters() {
    let filters = ['Chat History'];

    let divs = [];
    for (let i = 0; i < filters.length; i++) {
      divs.push(
        <div
          className={`profile-page-filter ${filterSelected == i ? 'selected' : ''}`}
          onClick={() => onFilter(i)} key={i}
        >
          {filters[i]}
        </div>
      );
    }

    return divs;
  }

  const renderProfile = () => {
    // console.error("profile => ", profile);
    return (
      <div className='profile-page'>
        <BsArrowLeftCircleFill className="profile-page-back" size={30} onClick={handleBack} />

        <div className='profile-page-header'>
          <img className="profile-page-banner" src='./banner-default.png' />
          <img className="profile-page-portrait" src={profile.img ? profile.img : generateAvatar(pid)} />
        </div>

        {renderActionButtons()}

        <div className="profile-page-name">{profile.name ? profile.name : 'Nickname'}</div>
        <div className="profile-page-id">@{handle}</div>
        <div className="profile-page-desc">{profile.bio ? profile.bio : 'This is a bio.'}</div>
        <div className="profile-page-pid">PID: {pid}</div>

        {/* <div className="profile-page-pid">PubKey: {profile.pubkey}</div> */}
        {/* <div className='profile-page-joined-container'>
          <BsCalendarWeek />
          <div className='profile-page-joined'>Joined&nbsp;&nbsp;&nbsp;{joined}</div>
        </div> */}

        <div className='profile-page-filter-container'>
          {renderFilters()}
        </div>

        {/* <div>
          <div className='profile-page-es-title'>Establish Session</div>
          <input
            type="text"
            className='profile-page-es-input'
            placeholder="Enter other handle name"
            value={otherHandleName}
            onChange={(e) => setOtherHandleName(e.target.value)}
          />
          <button className='profile-page-es-button' onClick={handleEstablishSession}>
            Establish Session
          </button>
        </div> */}

        {renderChatHistory()}

        {/* {this.state.loadNextPage && <Loading />} */}

        {/* <MessageModal message={this.state.message} /> */}
        {/* <AlertModal message={this.state.alert} button="OK" onClose={() => this.setState({ alert: '' })} /> */}
        {/* <QuestionModal message={this.state.question} onYes={this.onQuestionYes} onNo={this.onQuestionNo} /> */}

        <EditProfileModal
          open={isEditProfileModalOpen}
          onClose={handleCloseModal}
          data={profile}
          pid={pid}
        />
      </div>
    );
  }

  // Added by Kevin
  return (
    <div>
      {renderProfile()}
    </div>
  )

};

export default HandleDetail;
