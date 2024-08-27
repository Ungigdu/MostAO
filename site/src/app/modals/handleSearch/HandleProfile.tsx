import {useState} from "react";
import {HANDLE_REGISTRY} from "../../util/consts";
import {HandleProfileType, MostAoActions} from "../../util/types";
import { messageToAO} from "../../util/util";
import Loading from "../../elements/Loading";
import Avatar from "../Avatar/avatar";

export default function HandleProfile (props: {
  data: HandleProfileType;
  myHandleName: string;
}) {
  const {data, myHandleName} = props;
  const {name, handle: handleName, pid} = data;

  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEstablishSession = async () => {
    setLoading(true);
    try {
      const response = await messageToAO(
        HANDLE_REGISTRY,
        {handleA: myHandleName, handleB: handleName},
        MostAoActions.EstablishSession,
        true
      );
      console.log(response);
      if (response) {
        setIsConnected(true);
        console.log("Session established successfully");
        // Optionally update chat history or provide feedback to the user
      } else {
        console.error("Failed to establish session:", response);
      }
    } catch (error) {
      console.error("Error establishing session:", error);
    }
    setLoading(false);
  };

  function renderBtn () {
    if (isConnected) {
      return <span>Connected</span>
    }
    if (loading) {
      return <Loading marginTop='0' />
    }
    return (
      <button
      className='handle-profile-btn'
      onClick={handleEstablishSession}>
        Establish Session
      </button>
    )
  }

  return (
    <div className="handle-profile-list">
      <Avatar
      name={name}
      pid={pid}
      handleName={handleName}
      imgUrl={data.img}
      />
      {renderBtn()}
    </div>
  )
}

