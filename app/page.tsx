'use client';

import { useState, useEffect } from 'react';
import WelcomeAnimation from './components/WelcomeAnimation';
import MainApp from './components/MainApp';

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeDone, setWelcomeDone] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const done = localStorage.getItem('welcomeDone');

    if (done !== 'true') {
      setShowWelcome(true);
    } else {
      setWelcomeDone(true);
    }

    setIsChecking(false);
  }, []);

  const handleWelcomeComplete = () => {
    localStorage.setItem('welcomeDone', 'true');
    setShowWelcome(false);
    setWelcomeDone(true);
  };

  if (isChecking) {
    return <div className="h-screen w-screen bg-[#060b14]" />;
  }

  if (showWelcome && !welcomeDone) {
    return <WelcomeAnimation onComplete={handleWelcomeComplete} />;
  }

  // 正常进入主应用
  return <MainApp />;
}
