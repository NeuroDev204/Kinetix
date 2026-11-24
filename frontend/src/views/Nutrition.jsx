// Kinetix nutrition: today's target against what the meal photos add up to, each meal's dishes with
// editable grams, a meal photo to add, and the week's meal plan from the Coach.
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import { mealsOn, dayTotals } from '../lib/nutrition.js'
import { addMeal, failMeal, setItemGrams, removeMeal, analyseMeal } from '../lib/meal-log.js'
import { useMediaPicker } from '../components/CustomMediaField.jsx'
import { Button } from '../components/ui.jsx'
import './Nutrition.css'

const shiftDay = (iso, n) => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const clockOf = at => new Date(at).toTimeString().slice(0, 5)
const round = v => Math.round(v)

export default function Nutrition() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const { pick, busy } = useMediaPicker()
  const [day, setDay] = useState(() => todayISO())
  const [note, setNote] = useState(null)
  const plan = S.nutritionPlan
  const totals = dayTotals(S, day)
  const meals = mealsOn(S, day)
  const today = day === todayISO()

  // A meal photo: filed as pending, sent for the estimate, and the outcome written back.
  const addPhoto = async ev => {
    const file = ev.target.files && ev.target.files[0]
    ev.target.value = ''
    if (!file) return
    const ref = await pick(file)
    if (!ref) return
    let id
    update(s => { id = addMeal(s, ref, Date.now()) })
    setDay(todayISO())
    const r = await analyseMeal(id, ref)
    if (r === 'failed') update(s => failMeal(s, id, 'failed'))
    setNote(r === 'offline' ? t('Will analyse when online') : null)
  }
  const retry = async m => {
    const r = await analyseMeal(m.id, m.m)
    if (r === 'failed') update(s => failMeal(s, m.id, 'failed'))
    setNote(r === 'offline' ? t('Will analyse when online') : null)
  }

  return <div className="narrow nutrition">
    <div className="nutr-day">
      <button className="iconbtn" onClick={() => setDay(shiftDay(day, -1))} aria-label={t('Previous day')}>‹</button>
      <div className="nutr-date">{today ? t('Today') : day}</div>
      <button className="iconbtn" disabled={today} onClick={() => setDay(shiftDay(day, 1))} aria-label={t('Next day')}>›</button>
    </div>

    <section className="nutr-totals card">
      <div className="nutr-kcal"><b>{round(totals.kcal)}</b> / {plan ? round(plan.kcal) : '–'} {t('kcal')}</div>
      {!plan && <div className="muted small">{t('No target yet. The Coach sets one when you finish the intake.')}</div>}
      {plan && ['protein', 'carbs', 'fat'].map(k => <div className="nutr-bar" key={k}>
        <span>{k === 'protein' ? t('Protein') : k === 'carbs' ? t('Carbs') : t('Fat')}</span>
        <span className="nutr-track"><span className="nutr-fill" style={{ width: `${Math.min(100, plan[k] ? (totals[k] / plan[k]) * 100 : 0)}%` }} /></span>
        <span className="small">{round(totals[k])} / {round(plan[k])} g</span>
      </div>)}
    </section>

    <section className="nutr-meals">
      {meals.length === 0 && <div className="muted small">{t('No meals logged for this day.')}</div>}
      {meals.map(m => {
        const kcal = m.items.reduce((a, it) => a + (it.kcal || 0), 0)
        return <div className="card nutr-meal" key={m.id}>
          <div className="nutr-meal-h"><b>{clockOf(m.at)}</b> <span className="small">{round(kcal)} {t('kcal')}</span>
            <button className="btn-link" onClick={() => update(s => removeMeal(s, m.id))}>{t('Remove')}</button></div>
          {m.status === 'pending' && <div className="small">{t('Will analyse when online')} <Button size="sm" onClick={() => retry(m)}>{t('Try again')}</Button></div>}
          {m.status === 'failed' && <div className="small">{t('Could not analyse this photo')} <Button size="sm" onClick={() => retry(m)}>{t('Try again')}</Button></div>}
          {m.status === 'done' && m.items.length === 0 && <div className="small">{m.note || t('No food found in this photo')}</div>}
          {m.items.map((it, i) => <div className="nutr-item" key={i}>
            <span className="nutr-name">{it.name}</span>
            <input className="input nutr-grams" type="number" inputMode="decimal" aria-label={t('Grams')} value={it.grams}
              onChange={e => { const g = Number(e.target.value); update(s => setItemGrams(s, m.id, i, g)) }} />
            <span className="small">g · {round(it.kcal)} {t('kcal')}</span>
          </div>)}
        </div>
      })}
    </section>

    <section className="nutr-add">
      <label className="btn">
        {t('Add meal photo')}
        <input type="file" accept="image/*" capture="environment" hidden disabled={busy} onChange={addPhoto} />
      </label>
      {note && <div className="ob-hint">{note}</div>}
    </section>

    {plan && Array.isArray(plan.mealPlan) && plan.mealPlan.length > 0 && <section className="nutr-week card">
      <h3>{t('This week’s meal plan')}</h3>
      {plan.mealPlan.map(d => <div key={d.day} className="nutr-plan-day"><b>{d.day}</b>: {d.meals.join(', ')}</div>)}
    </section>}
  </div>
}
