import { useState } from 'react'
import { buildShareText, shareOrCopy } from '../shareScore'
import './HandRecap.css'

interface Props {
  game: string
  title: string
  lines: string[]
  goalTick?: string | null
}

export function HandRecap({ game, title, lines, goalTick }: Props) {
  const [shareState, setShareState] = useState<'idle' | 'shared' | 'copied' | 'failed'>(
    'idle',
  )
  const four = lines.slice(0, 4)
  return (
    <div className="hand-recap">
      <ol className="hand-recap__lines">
        {four.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
      {goalTick && <p className="hand-recap__goal">{goalTick}</p>}
      <button
        type="button"
        className="btn btn--ghost hand-recap__share"
        onClick={() => {
          void shareOrCopy(buildShareText({ game, title, lines: four })).then(setShareState)
        }}
      >
        {shareState === 'copied'
          ? 'Copied'
          : shareState === 'shared'
            ? 'Shared'
            : shareState === 'failed'
              ? 'Couldn’t share'
              : 'Share'}
      </button>
    </div>
  )
}
