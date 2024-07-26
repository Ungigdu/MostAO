import {generateAvatar, shortStr} from "../../util/util";

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
        <div className="handle-name">
          {
            name && <span>{shortStr(name, 8)}</span>
          }
          <span style={{
            color: '#888',
            marginLeft: '4px',
          }}>@{shortStr(handleName, 10)}</span>
        </div>
      </div>
  )
}
