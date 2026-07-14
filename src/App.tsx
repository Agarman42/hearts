import { useEffect } from 'react'
import { useCardTable } from './hooks/useCardTable'
import { Home } from './components/Home'
import { Stats } from './components/Stats'
import { Table } from './components/Table'
import { SpadesTable } from './components/SpadesTable'
import { EuchreTable } from './components/EuchreTable'
import { Settings } from './components/Settings'
import './App.css'

export default function App() {
  const app = useCardTable()

  useEffect(() => {
    document.documentElement.setAttribute('data-card-back', app.prefs.cardBack)
  }, [app.prefs.cardBack])

  if (app.screen === 'home') {
    return (
      <Home
        saves={app.saves}
        onPlayGame={app.playGame}
        onContinueGame={app.continueGame}
        onSettings={() => app.setScreen('settings')}
        onStats={() => app.setScreen('stats')}
      />
    )
  }

  if (app.screen === 'stats') {
    return <Stats onBack={() => app.setScreen('home')} />
  }

  if (app.screen === 'settings') {
    const idle = app.tableState.phase === 'idle'
    return (
      <Settings
        state={app.tableState}
        prefs={app.prefs}
        activeGame={app.activeGame}
        onBack={() => app.setScreen(idle ? 'home' : 'table')}
        onStats={() => app.setScreen('stats')}
        onUpdateDifficulty={app.onUpdateDifficulty}
        onUpdateName={app.onUpdateName}
        onUpdateCharacter={app.onUpdateCharacter}
        onUpdateRules={app.onUpdateRules}
        onUpdateSpadesRules={app.onUpdateSpadesRules}
        onUpdateEuchreRules={app.onUpdateEuchreRules}
        onSetGameSpeed={app.sharedPrefs.setGameSpeed}
        onSetAutoFinishHand={app.sharedPrefs.setAutoFinishHand}
        onSetFeltStyle={app.sharedPrefs.setFeltStyle}
        onSetCardBack={app.sharedPrefs.setCardBack}
        onSetHapticsEnabled={app.sharedPrefs.setHapticsEnabled}
        onSetSoundEnabled={app.sharedPrefs.setSoundEnabled}
        onSetHumorMode={app.sharedPrefs.setHumorMode}
        onSetPassAndPlay={app.sharedPrefs.setPassAndPlay}
        onSetHumanSeat={app.sharedPrefs.setHumanSeat}
      />
    )
  }

  if (app.activeGame === 'euchre') {
    return (
      <EuchreTable
        state={app.euchre.state}
        legal={app.euchre.legal}
        feltStyle={app.prefs.feltStyle}
        hapticsEnabled={app.prefs.hapticsEnabled}
        soundEnabled={app.prefs.soundEnabled}
        humorMode={app.prefs.humorMode}
        passAndPlay={app.prefs.passAndPlay}
        humanSeats={app.prefs.humanSeats}
        gameSpeed={app.prefs.gameSpeed}
        achievementToast={app.achievementToast}
        onAchievementDone={app.dismissAchievementToast}
        onCardClick={app.euchre.onCardClick}
        onPass={app.euchre.onPass}
        onOrderUp={app.euchre.onOrderUp}
        onNameTrump={app.euchre.onNameTrump}
        onGoAlone={app.euchre.onGoAlone}
        onWithPartner={app.euchre.onWithPartner}
        onNextHand={app.euchre.onNextHand}
        onShowMatchResults={app.euchre.onShowMatchResults}
        onNewGame={app.euchre.onNewGame}
        onHome={app.quitToHome}
        onSettings={() => app.setScreen('settings')}
        onStartOver={app.startOver}
        onAbandon={app.abandonGame}
      />
    )
  }

  if (app.activeGame === 'spades') {
    return (
      <SpadesTable
        state={app.spades.state}
        legal={app.spades.legal}
        feltStyle={app.prefs.feltStyle}
        hapticsEnabled={app.prefs.hapticsEnabled}
        soundEnabled={app.prefs.soundEnabled}
        humorMode={app.prefs.humorMode}
        passAndPlay={app.prefs.passAndPlay}
        humanSeats={app.prefs.humanSeats}
        gameSpeed={app.prefs.gameSpeed}
        onCardClick={app.spades.onCardClick}
        onSubmitBid={app.spades.onSubmitBid}
        onNextHand={app.spades.onNextHand}
        onShowMatchResults={app.spades.onShowMatchResults}
        onNewGame={app.spades.onNewGame}
        onHome={app.quitToHome}
        onSettings={() => app.setScreen('settings')}
        onStartOver={app.startOver}
        onAbandon={app.abandonGame}
        achievementToast={app.achievementToast}
        onAchievementDone={app.dismissAchievementToast}
      />
    )
  }

  return (
    <Table
      state={app.hearts.state}
      legal={app.hearts.legal}
      autoFinishHand={app.prefs.autoFinishHand}
      feltStyle={app.prefs.feltStyle}
      hapticsEnabled={app.prefs.hapticsEnabled}
      soundEnabled={app.prefs.soundEnabled}
      humorMode={app.prefs.humorMode}
      passAndPlay={app.prefs.passAndPlay}
      humanSeats={app.prefs.humanSeats}
      gameSpeed={app.prefs.gameSpeed}
      onCardClick={app.hearts.onCardClick}
      onConfirmPass={app.hearts.onConfirmPass}
      onAcceptReceived={app.hearts.onAcceptReceived}
      onNextHand={app.hearts.onNextHand}
      onShowMatchResults={app.hearts.onShowMatchResults}
      onNewGame={app.hearts.onNewGame}
      onHome={app.quitToHome}
      onSettings={() => app.setScreen('settings')}
      onStartOver={app.startOver}
      onAbandon={app.abandonGame}
      achievementToast={app.achievementToast}
      onAchievementDone={app.dismissAchievementToast}
    />
  )
}