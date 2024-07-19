import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getDataFromAO, getProfile, messageToAO } from '../util/util';
import EditProfileModal from '../modals/EditProfileModal';
import { BsArrowLeftCircleFill } from 'react-icons/bs';
import { HANDLE_REGISTRY } from '../util/consts';

const HandleDetail: React.FC = () => {
  const { handleName } = useParams<{ handleName: string }>();
  const location = useLocation();
  const pid = (location.state as any).pid;
  const [profile, setProfileData] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [otherHandleName, setOtherHandleName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfileAndHistory = async () => {
      try {
        const response = await getProfile(pid);
        const profileData = response || [];
        setProfileData(profileData);

        if (profileData) {
          // TODO: implement getChatHistory
          const history = await getDataFromAO(pid, "GetChatList", {});
          console.log(history);
          setChatHistory(history);
        }
      } catch (error) {
        console.error("Error fetching profile or chat history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndHistory();
  }, [handleName]);

  const handleEditProfile = () => {
    setEditProfileModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditProfileModalOpen(false);
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleEstablishSession = async () => {
    try {
      const response = await messageToAO(
        HANDLE_REGISTRY,
        { handleA: handleName, handleB: otherHandleName },
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
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <button onClick={handleBack}>
        <BsArrowLeftCircleFill size={30} />
      </button>
      <h2>Handle: @{handleName}</h2>
      <div>
        <h3>Profile</h3>
        {profile ? (
          <div>
            <p>Name: {profile.name}</p>
            <p>Avatar: {profile.img}</p>
            <p>Banner: {profile.banner}</p>
            <p>Bio: {profile.bio}</p>
            <p>PublicKey: {profile.pubkey}</p>
            <p>ProcessId: {pid}</p>

            <button onClick={handleEditProfile}>Edit Profile</button>
          </div>
        ) : (
          <div>
            <h2>Set up your profile</h2>
            <button onClick={handleEditProfile}>Set up Profile</button>
          </div>
        )}
      </div>
      <div>
        <h3>Establish Session</h3>
        <input
          type="text"
          placeholder="Enter other handle name"
          value={otherHandleName}
          onChange={(e) => setOtherHandleName(e.target.value)}
        />
        <button onClick={handleEstablishSession}>Establish Session</button>
      </div>
      <div>
        <h3>Chat History</h3>
        <ul>
          {chatHistory.map((chat, index) => (
            <li key={index}>
              <p>Session ID: {chat.sessionID}</p>
              <p>Other Handle: {chat.otherHandle}</p>
            </li>
          ))}
        </ul>
      </div>
      <EditProfileModal
        open={isEditProfileModalOpen}
        onClose={handleCloseModal}
        data={profile}
        pid={pid}
      />
    </div>
  );
};

export default HandleDetail;
