import { Component, type ErrorInfo, type ReactNode } from 'react'
import { clearGame } from '../gameSave'
import type { GameId } from '../games/registry'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Cutthroat crashed:', error, info.componentStack)
  }

  private reload = () => {
    this.setState({ error: null })
    window.location.reload()
  }

  private clearSavesAndReload = () => {
    for (const gameId of ['hearts', 'spades', 'euchre'] as GameId[]) {
      clearGame(gameId)
    }
    this.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="boot-error" role="alert">
        <h1>Cutthroat hit a snag</h1>
        <p>
          The app failed to start — often a stale cached build or a corrupted saved game in
          this browser.
        </p>
        <p className="boot-error__detail">{this.state.error.message}</p>
        <div className="boot-error__actions">
          <button type="button" className="btn btn--primary" onClick={this.reload}>
            Reload
          </button>
          <button type="button" className="btn btn--ghost" onClick={this.clearSavesAndReload}>
            Clear saves &amp; reload
          </button>
        </div>
        <p className="boot-error__hint">
          If you use a wallet browser extension, ignore its <code>contentscript.js</code> warnings
          — they are unrelated. Check the Network tab for failed <code>.js</code> files if reload
          does not help.
        </p>
      </div>
    )
  }
}