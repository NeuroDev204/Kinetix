// The round Talk button on the workout screen. It shows what the trainer is doing; a tap starts a
// turn. When the free tier's live quota is spent, it says so once, in words and aloud, and the
// workout keeps working without it.
import { useEffect } from 'react'
import { t } from '../lib/i18n.js'

const LABEL = {
  idle: () => t('Talk to your trainer'),
  connecting: () => t('Connecting…'),
  listening: () => t('Listening'),
  speaking: () => t('Your trainer is talking'),
  error: () => t('Trainer unavailable'),
}

export const QUOTA_LINE = () => t('Live trainer limit reached, try later')

export default function TalkButton({ state = 'idle', why = null, onTalk, speak }) {
  const quota = state === 'error' && why === 'quota'
  useEffect(() => {
    if (quota && speak) speak(QUOTA_LINE())
  }, [quota, speak])
  return <div className={'talk-btn talk-' + state}>
    <button className="talk-round" onClick={() => onTalk && onTalk()} disabled={state === 'connecting' || state === 'speaking'} aria-label={LABEL[state]?.() || LABEL.idle()}>
      {LABEL[state]?.() || LABEL.idle()}
    </button>
    {quota && <div className="talk-quota" role="status">{QUOTA_LINE()}</div>}
  </div>
}
