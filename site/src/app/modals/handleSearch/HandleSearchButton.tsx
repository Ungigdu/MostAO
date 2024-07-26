export default function HandleSearchButton(props: { onClick?: () => void }) {
  const { onClick } = props;
  return (
    <button
      className="profile-page-es-button"
      style={{ marginBottom: '20px' }}
      onClick={onClick}
    >
      Search Handle
    </button>
  );
}
