'use client';

import { useState, useEffect } from 'react';
import Login from './components/Login';
import WelcomeAnimation from './components/WelcomeAnimation';
import MainApp from './components/MainApp';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeDone, setWelcomeDone] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const logged = localStorage.getItem('slayyyql_loggedIn');
    const done = localStorage.getItem('welcomeDone');

    if (logged === 'true') {
      setIsLoggedIn(true);

      if (done !== 'true') {
        setShowWelcome(true);
      } else {
        setWelcomeDone(true);
      }
    }

    setIsCheckingAuth(false);
  }, []);

  const handleLoginSuccess = () => {
    localStorage.setItem('slayyyql_loggedIn', 'true');
    localStorage.removeItem('welcomeDone');

    setIsLoggedIn(true);
    setShowWelcome(true);
  };

  const handleWelcomeComplete = () => {
    localStorage.setItem('welcomeDone', 'true');

    setShowWelcome(false);
    setWelcomeDone(true);
  };

  if (isCheckingAuth) {
    return <div className="h-screen w-screen bg-[#060b14]" />;
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  if (showWelcome && !welcomeDone) {
    return (
      <WelcomeAnimation onComplete={handleWelcomeComplete} />
    );
  }

  return <MainApp />;
}
