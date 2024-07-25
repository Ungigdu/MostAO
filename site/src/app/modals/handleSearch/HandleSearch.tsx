import {useCallback, useState} from 'react';
import './HandleSearch.css';
import Modal from '../Modal';
import {HandleSearchInput} from './HandleSearchInput';
import {HandleProfileType} from '../../util/types';
import HandleProfile from './HandleProfile';

export default function HandleSearch (props: {
  isOpen: boolean,
  onClose: () => void,
  myHandleName: string,
}) {
  const {isOpen, onClose, myHandleName} = props;

  const [list, setList] = useState<HandleProfileType[]>([]);

  const setUniqueList = useCallback((profile: HandleProfileType) => {
    setList((v) => {
      const newList = v.filter((p) => p.handleName !== profile.handleName);
      newList.unshift(profile);
      return newList;
    });
  }, [setList]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      header="Search Handle"
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
              key={el.handleName}
              data={el}
              myHandleName={myHandleName}
            />
          ))}
        </div>
      }
    />
  )
}
