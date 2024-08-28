import { useState } from "react";
import { getDataFromAO } from "../../util/util";
import { HANDLE_REGISTRY } from "../../util/consts";
import { HandleProfileType, HandleType, MostAoActions, ProfileType } from "../../util/types";

export function HandleSearchInput(props: {
  onSearch?: (profile: HandleProfileType) => void;
}) {
  const { onSearch } = props;
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  async function searchHandle() {
    let handle = await searchHandleApi(text);
    if (!handle) {
      alert('Handle not found!');
      return
    }

    let profile = await searchProfile(handle.pid);
    let data: HandleProfileType = {
      ...handle,
      ...profile
    }
    onSearch && onSearch(data);
  }

  async function search() {
    if (!text) {
      return
    }
    setLoading(true);
    await searchHandle().catch(e => {
      console.error(e);
    })
    setLoading(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setText(e.target.value);
  }

  return (
    <div className='handle-search-box'>
      <input
        type="text"
        className='handle-search-input'
        placeholder="Enter handle name"
        value={text}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            search();
          }
        }}
      />
      <button
        disabled={loading}
        className='handle-search-button'
        onClick={search}
      >
        {
          loading ? 'Searching...' : 'Search'
        }
      </button>
    </div>
  )
}

async function searchHandleApi(name: string): Promise<HandleType | null> {
  const response: HandleType = await getDataFromAO(
    HANDLE_REGISTRY,
    MostAoActions.QueryHandle,
    { handle: name },
  );
  console.log('Search handle:', response);

  if (!response) return null;
  if (!response.registered) return null;

  return response;
}

async function searchProfile(process: string): Promise<ProfileType> {
  const response: ProfileType = await getDataFromAO(
    process,
    MostAoActions.GetProfile
  );
  console.log(response);
  return response
}
