import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import SitePage from './pages/SitePage';
import NotFoundPage from './pages/NotFoundPage';
import './App.css';
import HomePage from './pages/HomePage';
import HandleDetail from './pages/HandleDetail';
import ChatPage from './pages/ChatPage';

class App extends React.Component<{}, {}> {
  constructor(props = {}) {
    super(props);
  }

  componentDidMount() {
  }

  render() {
    return (
      <HashRouter>
        <Routes>
          <Route path='/' element={<SitePage />}>
            <Route index element={<HomePage />} />
            <Route path="*" element={<NotFoundPage />} />
            <Route path="/handle/:handleName" element={<HandleDetail />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:id" element={<ChatPage />} />
          </Route>
        </Routes>
      </HashRouter>
    );
  }
}

export default App;
