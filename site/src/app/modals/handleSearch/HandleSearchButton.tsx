export default function HandleSearchButton (props: {
  onClick?: () => void;
}) {
  const {onClick} = props;
  return (
    <button className='profile-page-es-button' onClick={onClick}>
      Search Handle
    </button>
  )
}
