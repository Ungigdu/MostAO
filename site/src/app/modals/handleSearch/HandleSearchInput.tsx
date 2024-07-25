import {useState} from "react";
import {getDataFromAO, messageToAO} from "../../util/util";
import {HANDLE_REGISTRY} from "../../util/consts";
import {HandleProfileType, HandleType, MostAoActions, ProfileType} from "../../util/types";

export function HandleSearchInput (props: {
  onSearch?: (profile: HandleProfileType) => void;
}) {
  const {onSearch} = props;
  const [text, setText] = useState('');

  async function searchHandle () {
    let handle = await searchHandleApi(text);
    if (!handle) {
      console.log('Handle not found');
      return
    }
    let profile = await searchProfile(handle.pid);
    let data: HandleProfileType = {
      ...handle,
      ...profile
    }
    onSearch && onSearch(data);
  }

  function handleChange (e: React.ChangeEvent<HTMLInputElement>) {
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
            searchHandle();
          }
        }}
      />
      <button
        className='handle-search-button'
        onClick={searchHandle}
      >
        Search
      </button>
    </div>
  )
}

async function searchHandleApi (name: string): Promise<HandleType | null> {
  const response: HandleType[] = await getDataFromAO(
    HANDLE_REGISTRY,
    MostAoActions.QueryHandle,
    {handle: name},
  );
  console.log(response);
  if (!response || response.length === 0) {
    return null
  }

  let item = response[0];
  item.handleName = name;
  return item
}

async function searchProfile (process: string): Promise<ProfileType> {
  const response: ProfileType = await getDataFromAO(
    process,
    MostAoActions.GetProfile
  );
  console.log(response);
  return response
}
