import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProfile } from '../util/util';
import EditProfileModal from '../modals/EditProfileModal';
import { BsArrowLeftCircleFill } from 'react-icons/bs';

const HandleDetail: React.FC = () => {
  const { handleName } = useParams<{ handleName: string }>();
  const [profile, setProfileData] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfileAndHistory = async () => {
      try {
        const profileData = await getProfile(handleName);
        setProfileData(profileData);

        if (profileData) {
          // TODO: implement getChatHistory
          // const history = await getChatHistory(handleName);
          // setChatHistory(history);
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
        <h3>Chat History</h3>
        <ul>
          {chatHistory.map((chat, index) => (
            <li key={index}>{chat.message}</li>
          ))}
        </ul>
      </div>
      <EditProfileModal
        open={isEditProfileModalOpen}
        onClose={handleCloseModal}
        data={profile}
      />
    </div>
  );
};

export default HandleDetail;
