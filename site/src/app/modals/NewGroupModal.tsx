import {useCallback, useState} from 'react';
import './NewGroupModal.css';
import { HandleProfileType } from '../util/types';
import HandleProfile from './handleSearch/HandleProfile';
import { HandleSearchInput } from './handleSearch/HandleSearchInput';
import Modal from './Modal';

export default function NewGroupModal (props: {
  isOpen: boolean,
  onClose: () => void,
  myHandleName: string,
}) {
  const {isOpen, onClose, myHandleName} = props;

  const [list, setList] = useState<HandleProfileType[]>([]);

  const setUniqueList = useCallback((profile: HandleProfileType) => {
    setList((v) => {
      const newList = v.filter((p) => p.handle !== profile.handle);
      newList.unshift(profile);
      return newList;
    });
  }, [setList]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      header="New Group"
      showBtnOk={false}
      children={
        <div>
          <HandleSearchInput
            onSearch={(profile) => {
              setUniqueList(profile);
            }}
          />
          {list.map((el) => (
            <HandleProfile
              key={el.handle}
              data={el}
              myHandleName={myHandleName}
            />
          ))}
        </div>
      }
    />
  )
}
