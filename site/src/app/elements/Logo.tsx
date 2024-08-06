import React from 'react';

class Logo extends React.Component {
  render() {
    return (
      <div className='home-page-welcome-logo-row'>
        <img className='home-page-welcome-logo' src='./MostAO.png' />
        <div className='app-logo-text'>MostAO</div>
      </div>
    );
  }
}

export default Logo;