import {generateAvatar} from "../../util/util";

export default function Avatar (props: {
  pid: string;
  handleName: string
  className?: string;
  imgUrl?: string;
  name?: string;
  onClick?: () => void;
}) {
  const {onClick, pid, imgUrl, name, handleName, className = ""} = props;
  return (
    <div
    onClick={onClick}
    className={"handle-profile " + className}>
        <img src={imgUrl || generateAvatar(pid)} alt="current handle" className="avatar-small" />
        <span>{name || ''}</span>
        <span style={{
          color: '#888',
          marginLeft: '4px',
        }}>@{handleName}</span>
      </div>
  )
}
