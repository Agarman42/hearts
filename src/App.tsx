import { useEffect } from 'react'
import { useHeartsGame } from './hooks/useHeartsGame'
import { Home } from './components/Home'
import { Table } from './components/Table'
import { Settings } from './components/Settings'
import './App.css'

export default function App() {
  const game = useHeartsGame()

  // Card-back theme on <html> for CSS (works for all face-down cards)
  useEffect(() => {
    document.documentElement.setAttribute('data-card-back', game.prefs.cardBack)
  }, [game.prefs.cardBack])

  if (game.screen === 'home') {
    return (
      <Home
        onPlay={game.play}
        onContinue={game.continueGame}
        hasSave={game.hasSave}
        onSettings={() => game.setScreen('settings')}
      />
    )
  }

  if (game.screen === 'settings') {
    return (
      <Settings
        state={game.state}
        prefs={game.prefs}
        onBack={() =>
          game.setScreen(game.state.phase === 'idle' ? 'home' : 'table')
        }
        onUpdateDifficulty={game.onUpdateDifficulty}
        onUpdateName={game.onUpdateName}
        onUpdateCharacter={game.onUpdateCharacter}
        onUpdateRules={game.onUpdateRules}
        onSetGameSpeed={game.setGameSpeed}
        onSetAutoFinishHand={game.setAutoFinishHand}
        onSetFeltStyle={game.setFeltStyle}
        onSetCardBack={game.setCardBack}
        onSetHapticsEnabled={game.setHapticsEnabled}
        onSetHumorMode={game.setHumorMode}
      />
    )
  }

  return (
    <Table
      state={game.state}
      legal={game.legal}
      autoFinishHand={game.prefs.autoFinishHand}
      feltStyle={game.prefs.feltStyle}
      hapticsEnabled={game.prefs.hapticsEnabled}
      humorMode={game.prefs.humorMode}
      gameSpeed={game.prefs.gameSpeed}
      onCardClick={game.onCardClick}
      onConfirmPass={game.onConfirmPass}
      onAcceptReceived={game.onAcceptReceived}
      onNextHand={game.onNextHand}
      onNewGame={game.onNewGame}
      onHome={game.quitToHome}
      onSettings={() => game.setScreen('settings')}
      onStartOver={game.startOver}
      onAbandon={game.abandonGame}
    />
  )
}
