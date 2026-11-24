// @vitest-environment happy-dom
// The Talk button: its label follows the trainer's state, a tap starts a turn, and a spent quota is
// said once in words and aloud.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TalkButton, { QUOTA_LINE } from './TalkButton.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let host, root
beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host) })
afterEach(() => { act(() => root.unmount()); host.remove() })
const render = el => act(() => root.render(el))

describe('TalkButton', () => {
  it('shows the state the trainer is in', () => {
    render(<TalkButton state="listening" />)
    expect(host.querySelector('button').textContent).toBe('Listening')
    render(<TalkButton state="idle" />)
    expect(host.querySelector('button').textContent).toBe('Talk to your trainer')
  })

  it('a tap starts a turn, unless the trainer is busy', () => {
    const onTalk = vi.fn()
    render(<TalkButton state="idle" onTalk={onTalk} />)
    act(() => host.querySelector('button').click())
    expect(onTalk).toHaveBeenCalledTimes(1)
    render(<TalkButton state="speaking" onTalk={onTalk} />)
    expect(host.querySelector('button').disabled).toBe(true)
  })

  it('a spent quota is said in words and aloud, once, and the button stays usable', () => {
    const speak = vi.fn()
    render(<TalkButton state="error" why="quota" speak={speak} />)
    expect(host.querySelector('.talk-quota').textContent).toBe(QUOTA_LINE())
    expect(speak).toHaveBeenCalledWith(QUOTA_LINE())
    render(<TalkButton state="error" why="quota" speak={speak} />)
    expect(speak).toHaveBeenCalledTimes(1)
  })

  it('an error that is not the quota shows no quota line', () => {
    const speak = vi.fn()
    render(<TalkButton state="error" why="network" speak={speak} />)
    expect(host.querySelector('.talk-quota')).toBe(null)
    expect(speak).not.toHaveBeenCalled()
  })
})
