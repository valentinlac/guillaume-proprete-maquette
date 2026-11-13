import { useEffect, useRef, useState } from 'react'
import { useEtatDemo } from '../donnees/EtatDemo'
import type { Client, Intervention } from '../donnees/types'
import { cloturerPassage, ecartDureeMin, formatEcart, lienWaze } from '../planning/pointage'
import { detailJournee, tourneesDuJour } from '../planning/vues'
import { Bascule } from '../ui/Onglets'
import { PastilleAgent } from '../ui/statuts'
import { formatDateLongue } from '../utils/dates'
import { formatDuree, formatHeure } from '../utils/format'

/** Démo : le chrono va 60 fois plus vite (1 seconde = 1 minute). */
const ACCELERATION = 60

interface EnCours {
  interventionId: string
  departMs: number
}

/** App de l'agent sur téléphone : tournée du jour, chrono, bon signé. */
export function PageAgent() {
  const { donnees, dateDuJour, modifier } = useEtatDemo()
  const [agentId, setAgentId] = useState(donnees.agents[0].id)
  const [enCours, setEnCours] = useState<EnCours | null>(null)
  const [cloture, setCloture] = useState<{ interventionId: string; minutes: number } | null>(null)

  const agent = donnees.agents.find((a) => a.id === agentId) ?? donnees.agents[0]
  const tournee = tourneesDuJour(donnees, donnees.interventions.filter((i) => i.date === dateDuJour)).find((t) => t.agent.id === agent.id)
  const lignes = tournee ? detailJournee(tournee, donnees.clients).lignes.filter((l) => l.debutMin !== null) : []
  const faits = lignes.filter((l) => l.intervention.statut === 'terminee').length

  const valider = (i: Intervention, bon: { observation: string; signataire: string; signature: string }, minutes: number) => {
    modifier((jeu) => ({
      ...jeu,
      interventions: cloturerPassage(jeu.interventions, i.id, { ...bon, debutReel: i.debutMin, finReel: i.debutMin + minutes }),
    }))
    setCloture(null)
    setEnCours(null)
  }

  const passageCloture = cloture && lignes.find((l) => l.intervention.id === cloture.interventionId)

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-papier">
      <header className="sticky top-0 z-10 border-b border-filet bg-surface px-4 pt-3 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-semibold">Ma tournée</div>
            <div className="text-xs text-sourdine first-letter:uppercase">{formatDateLongue(dateDuJour)}</div>
          </div>
          <a href="#planning" className="text-xs text-sourdine hover:text-encre">Côté bureau</a>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Bascule
            valeur={agent.id}
            onChange={(id) => { setAgentId(id); setEnCours(null); setCloture(null) }}
            options={donnees.agents.map((a) => ({ valeur: a.id, libelle: a.nom.split(' ')[0] }))}
          />
          <span className="text-[13px] text-sourdine">{faits} / {lignes.length} faits</span>
        </div>
      </header>

      <main className="flex-1 space-y-3 px-4 py-4">
        {lignes.length === 0 && <p className="py-10 text-center text-sm text-sourdine">Pas de tournée aujourd’hui.</p>}
        {passageCloture ? (
          <BonDePassage
            client={passageCloture.client}
            minutes={cloture.minutes}
            onAnnuler={() => setCloture(null)}
            onValider={(bon) => valider(passageCloture.intervention, bon, cloture.minutes)}
          />
        ) : (
          lignes.map((l) => (
            <CartePassage
              key={l.intervention.id}
              intervention={l.intervention}
              client={l.client}
              heure={l.debutMin!}
              enCours={enCours?.interventionId === l.intervention.id ? enCours : null}
              occupe={enCours !== null && enCours.interventionId !== l.intervention.id}
              onDemarrer={() => setEnCours({ interventionId: l.intervention.id, departMs: Date.now() })}
              onCloturer={(minutes) => setCloture({ interventionId: l.intervention.id, minutes })}
            />
          ))
        )}
      </main>

      <footer className="px-4 pb-6 text-center text-xs text-sourdine">
        <span className="inline-flex items-center gap-1.5"><PastilleAgent couleur={agent.couleur} />{agent.nom}</span>
        <div className="mt-1">S’installe sur l’écran d’accueil comme une application.</div>
        <div>Démo : le chrono va 60 fois plus vite (1 seconde = 1 minute).</div>
      </footer>
    </div>
  )
}

function CartePassage({ intervention, client, heure, enCours, occupe, onDemarrer, onCloturer }: {
  intervention: Intervention
  client: Client
  heure: number
  enCours: EnCours | null
  occupe: boolean
  onDemarrer: () => void
  onCloturer: (minutes: number) => void
}) {
  const minutes = useChrono(enCours?.departMs ?? null)
  const fait = intervention.statut === 'terminee'
  const ecart = ecartDureeMin(intervention, client)

  return (
    <article className={`rounded-lg border bg-surface p-4 ${enCours ? 'border-accent' : 'border-filet'}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold tabular-nums">{formatHeure(heure)}</span>
        <span className="text-xs text-sourdine">Prévu : {formatDuree(client.dureeMin)}</span>
      </div>
      <div className="mt-1 text-[15px] font-semibold">{client.nom}</div>
      <div className="text-[13px] text-encre-2">{client.adresse}, {client.ville}</div>
      {client.materiel && client.materiel.length > 0 && (
        <div className="mt-1 text-[13px] text-attention">Matériel : {client.materiel.join(', ')}</div>
      )}

      {fait ? (
        <div className="mt-3 text-sm font-medium text-ok">
          OK, bon signé{ecart !== null && ` · ${formatEcart(ecart)}`}
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <a
            href={lienWaze(client)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-filet-fort text-sm font-medium hover:bg-survol"
          >
            Ouvrir dans Waze
          </a>
          {enCours ? (
            <button onClick={() => onCloturer(Math.max(1, minutes))} className="h-11 flex-1 rounded-md bg-accent text-sm font-medium text-white">
              Clôturer · {formatHeure(minutes)}
            </button>
          ) : (
            <button
              onClick={onDemarrer}
              disabled={occupe}
              className="h-11 flex-1 rounded-md bg-accent text-sm font-medium text-white disabled:opacity-40"
            >
              Démarrer
            </button>
          )}
        </div>
      )}
    </article>
  )
}

/** Minutes écoulées (accélérées) depuis le départ. */
function useChrono(departMs: number | null): number {
  const [maintenant, setMaintenant] = useState(() => Date.now())
  useEffect(() => {
    if (departMs === null) return
    const t = setInterval(() => setMaintenant(Date.now()), 250)
    return () => clearInterval(t)
  }, [departMs])
  return departMs === null ? 0 : Math.floor(((maintenant - departMs) / 1000) * ACCELERATION / 60)
}

function BonDePassage({ client, minutes, onAnnuler, onValider }: {
  client: Client
  minutes: number
  onAnnuler: () => void
  onValider: (bon: { observation: string; signataire: string; signature: string }) => void
}) {
  const [observation, setObservation] = useState('')
  const [signataire, setSignataire] = useState(client.contact.nom)
  const [signature, setSignature] = useState<string | null>(null)
  const ecart = minutes - client.dureeMin

  return (
    <section className="rounded-lg border border-filet bg-surface p-4">
      <h2 className="text-[15px] font-semibold">Bon de passage</h2>
      <p className="text-[13px] text-sourdine">{client.nom}</p>
      <p className="mt-2 text-sm">
        Durée réelle {formatDuree(minutes)} pour {formatDuree(client.dureeMin)} prévues
        <span className={ecart > 0 ? 'text-attention' : 'text-ok'}> ({formatEcart(ecart)})</span>
      </p>

      <label className="mt-4 block text-[13px] font-medium">
        Observation
        <textarea
          value={observation}
          onChange={(e) => setObservation(e.target.value)}
          rows={3}
          placeholder="Ex. vitrine arrière très sale, prévoir un passage de plus"
          className="mt-1 block w-full rounded-md border border-filet-fort bg-surface px-3 py-2 text-sm font-normal"
        />
      </label>
      <label className="mt-3 block text-[13px] font-medium">
        Nom du signataire
        <input
          value={signataire}
          onChange={(e) => setSignataire(e.target.value)}
          className="mt-1 block h-11 w-full rounded-md border border-filet-fort bg-surface px-3 text-sm font-normal"
        />
      </label>
      <div className="mt-3 text-[13px] font-medium">Signature du client</div>
      <ZoneSignature onChange={setSignature} />

      <div className="mt-4 flex gap-2">
        <button onClick={onAnnuler} className="h-11 flex-1 rounded-md border border-filet-fort text-sm font-medium">Retour</button>
        <button
          onClick={() => signature && onValider({ observation, signataire, signature })}
          disabled={!signature || !signataire.trim()}
          className="h-11 flex-1 rounded-md bg-accent text-sm font-medium text-white disabled:opacity-40"
        >
          Valider le bon
        </button>
      </div>
    </section>
  )
}

/** Zone de signature au doigt (canvas). */
function ZoneSignature({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const dessin = useRef(false)

  useEffect(() => {
    const c = canvas.current!
    const ratio = window.devicePixelRatio || 1
    c.width = c.offsetWidth * ratio
    c.height = c.offsetHeight * ratio
    const ctx = c.getContext('2d')!
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1c1b18'
  }, [])

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top] as const
  }

  const effacer = () => {
    const c = canvas.current!
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    onChange(null)
  }

  return (
    <div className="mt-1">
      <canvas
        ref={canvas}
        className="block h-36 w-full touch-none rounded-md border border-dashed border-filet-fort bg-papier"
        onPointerDown={(e) => {
          dessin.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          const ctx = e.currentTarget.getContext('2d')!
          ctx.beginPath()
          ctx.moveTo(...point(e))
        }}
        onPointerMove={(e) => {
          if (!dessin.current) return
          const ctx = e.currentTarget.getContext('2d')!
          ctx.lineTo(...point(e))
          ctx.stroke()
        }}
        onPointerUp={(e) => {
          dessin.current = false
          onChange(e.currentTarget.toDataURL('image/png'))
        }}
      />
      <button onClick={effacer} className="mt-1 text-xs text-sourdine hover:text-encre">Effacer la signature</button>
    </div>
  )
}
