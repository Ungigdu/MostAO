import React from 'react';
import './ConnectWallet.css';
import { shortAddr } from '../util/util';
import { Tooltip } from 'react-tooltip';
import QuestionModal from '../modals/QuestionModal';
import { Server } from '../../server/server';
import { publish } from '../util/event';
import { Navigate } from 'react-router-dom';
import { removeKeys } from '../util/IndexedDB';

declare let window: any;

interface ConnectWalletProps {
  address: string;
}

interface ConnectWalletState {
  question: string;
  navigate: string;
}

class ConnectWallet extends React.Component<ConnectWalletProps, ConnectWalletState> {

  constructor(props: ConnectWalletProps) {
    super(props);
    this.state = {
      question: '',
      navigate: '',
    };

    this.onQuestionYes = this.onQuestionYes.bind(this);
    this.onQuestionNo = this.onQuestionNo.bind(this);
  }

  onQuestionYes() {
    this.disconnectWallet();
  }

  onQuestionNo() {
    this.setState({ question: '' });
  }

  async disconnectWallet() {
    localStorage.removeItem('owner');

    await window.arweaveWallet.disconnect();
    Server.service.setIsLoggedIn('');
    Server.service.setActiveAddress('');
    this.setState({ question: '', navigate: '/' });
    publish('wallet-events');
  }

  render() {
    if (this.state.navigate && !Server.service.getActiveAddress())
      return <Navigate to={this.state.navigate} />;

    if (this.props.address)
      return (
        <div className="connect-wallet">
          <div
            className="connect-wallet-address"
            data-tooltip-id="my-tooltip"
            data-tooltip-content="Disconnect from wallet"
            onClick={() => this.setState({ question: 'Disconnect?' })}
          >
            {shortAddr(this.props.address, 6)}
          </div>

          <Tooltip id="my-tooltip" />
          <QuestionModal message={this.state.question} onYes={this.onQuestionYes} onNo={this.onQuestionNo} />
        </div>
      );
  }
}

export default ConnectWallet;