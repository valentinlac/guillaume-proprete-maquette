import { useEffect, useMemo, useState } from 'react'
import { useEtatDemo } from '../../donnees/EtatDemo'
import type { DateISO } from '../../donnees/types'
import { appliquerCreneau, periodesDeRecherche, trouverCreneaux } from '../../planning/creneaux'
import type { DemandeCreneau, PeriodeRecherche, Proposition } from '../../planning/creneaux'
import { detailJournee, tourneesDuJour } from '../../planning/vues'
import { Bouton } from '../../ui/Bouton'
import { PastilleAgent } from '../../ui/statuts'
import { Tiroir } from '../../ui/Tiroir'
import { formatDate, formatDateLongue } from '../../utils/dates'
import { formatDuree, formatHeure } from '../../utils/format'
import { CarteTournees } from './CarteTournees'

export interface OuvertureCreneau {
  clientId?: string
  /** Passage existant à déplacer. */
  interventionId?: string
}

interface Props {
  ouverture: OuvertureCreneau
  onFermer: () => void
  /** Appelé après confirmation, avec le jour du passage placé. */
  onPlace: (resume: { date: DateISO; texte: string }) => void
}

/**
 * Panneau « Trouver un créneau » : l'outil propose, l'utilisateur choisit.
 * Rien n'est modifié avant le clic sur « Choisir ce créneau ».
 */
export function PanneauCreneau({ ouverture, onFermer, onPlace }: Props) {
  const { donnees, modifier, dateDuJour } = useEtatDemo()
  const periodes = useMemo(() => periodesDeRecherche(dateDuJour), [dateDuJour])
  const aDeplacer = ouverture.interventionId ? donnees.interventions.find((i) => i.id === ouverture.interventionId) : undefined
  const [clientId, setClientId] = useState(ouverture.clientId ?? aDeplacer?.clientId ?? '')
  const [periodeId, setPeriodeId] = useState<PeriodeRecherche['id']>('tout')
  const [choix, setChoix] = useState(0)

  const clientsTries = useMemo(() => [...donnees.clients].sort((a, b) => a.nom.localeCompare(b.nom)), [donnees.clients])
  const client = donnees.clients.find((c) => c.id === clientId)
  const periode = periodes.find((p) => p.id === periodeId)!

  const demande: DemandeCreneau | null = client
    ? {
        clientId: client.id,
        fenetre: periode.fenetre,
        interventionId: aDeplacer?.id,
        joursExclus: aDeplacer ? [aDeplacer.date] : undefined,
      }
    : null
  const ctx = { depot: donnees.entite.depot, clients: donnees.clients, agents: donnees.agents, interventions: donnees.interventions, dateDuJour }
  // Calcul rapide (quelques millisecondes) : refait à chaque affichage.
  const propositions = demande ? trouverCreneaux(ctx, demande) : []
  const selection: Proposition | undefined = propositions[Math.min(choix, propositions.length - 1)]

  useEffect(() => setChoix(0), [clientId, periodeId])

  // Aperçu : la journée de l'agent telle qu'elle serait avec ce créneau.
  const apercu = (() => {
    if (!demande || !selection) return null
    const apres = appliquerCreneau(ctx, demande, selection)
    // Passage déplacé : même identifiant. Nouveau passage : ajouté en fin de liste.
    const idPlace = demande.interventionId ?? apres[apres.length - 1].id
    const tournee = tourneesDuJour(donnees, apres.filter((i) => i.date === selection.date)).find((t) => t.agent.id === selection.agentId)
    return tournee ? { interventions: apres, tournee, detail: detailJournee(tournee, donnees.clients), idPlace } : null
  })()

  const confirmer = () => {
    if (!apercu || !selection || !client) return
    modifier((jeu) => ({ ...jeu, interventions: apercu.interventions }))
    const agent = donnees.agents.find((a) => a.id === selection.agentId)!
    const debut = apercu.detail.lignes.find((l) => l.intervention.id === apercu.idPlace)?.debutMin ?? selection.debutMin
    onPlace({
      date: selection.date,
      texte: `${client.nom} : passage ${aDeplacer ? 'déplacé au' : 'placé le'} ${formatDateLongue(selection.date)} à ${formatHeure(debut)} avec ${agent.nom}`.replace(/\.?$/, '.'),
    })
  }

  const champ = 'h-9 w-full rounded-md border border-filet-fort bg-surface px-2.5 text-sm text-encre'

  return (
    <Tiroir
      titre="Trouver un créneau"
      sousTitre={`Les agendas des ${donnees.agents.length} agents sont comparés ; vous choisissez.`}
      onFermer={onFermer}
      largeur="max-w-5xl"
      pied={
        <>
          <span className="flex-1" />
          <Bouton variante="discret" onClick={onFermer}>Annuler</Bouton>
          <Bouton variante="principal" onClick={confirmer} disabled={!selection}>Choisir ce créneau</Bouton>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_16rem]">
        <label className="block min-w-0 text-[13px] text-sourdine">
          {aDeplacer ? 'Passage à déplacer' : 'Client'}
          {aDeplacer ? (
            <div className="mt-1 flex h-9 items-center rounded-md border border-filet bg-surface px-2.5 text-sm text-encre">
              <span className="truncate">{client?.nom}, prévu le {formatDate(aDeplacer.date)} à {formatHeure(aDeplacer.debutMin)}</span>
            </div>
          ) : (
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={`mt-1 ${champ}`}>
              <option value="">Choisir un client…</option>
              {clientsTries.map((c) => (
                <option key={c.id} value={c.id}>{c.nom} ({c.ville})</option>
              ))}
            </select>
          )}
        </label>
        <label className="block text-[13px] text-sourdine">
          Période
          <select value={periodeId} onChange={(e) => setPeriodeId(e.target.value as PeriodeRecherche['id'])} className={`mt-1 ${champ}`}>
            {periodes.map((p) => <option key={p.id} value={p.id}>{p.libelle}</option>)}
          </select>
        </label>
      </div>

      {!client && <p className="mt-10 text-center text-sm text-sourdine">Choisissez un client pour voir les créneaux proposés.</p>}

      {client && propositions.length === 0 && (
        <p className="mt-6 text-sm text-encre-2">
          Aucun créneau sur cette période : les journées sont pleines, ou trop proches d’un autre passage de ce client.
          {periodeId !== 'tout' && (
            <button onClick={() => setPeriodeId('tout')} className="ml-1 font-medium text-accent hover:underline">Élargir la période</button>
          )}
        </p>
      )}

      {client && propositions.length > 0 && (
        <div className="mt-6 grid gap-6 [&>*]:min-w-0 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-[13px] text-sourdine">
              {client.nom} · {formatDuree(client.dureeMin)} · {client.ville}
            </div>
            <ul className="overflow-hidden rounded-lg border border-filet bg-surface">
              {propositions.map((p, k) => (
                <LigneProposition key={`${p.date}|${p.agentId}`} proposition={p} recommandee={k === 0} active={selection === p} onClick={() => setChoix(k)} />
              ))}
            </ul>
          </div>

          {apercu && selection && (
            <div>
              <div className="mb-2 text-[13px] text-sourdine">
                Aperçu : journée de {donnees.agents.find((a) => a.id === selection.agentId)?.nom}, <span className="first-letter:lowercase">{formatDateLongue(selection.date)}</span>
              </div>
              <div className="h-56">
                <CarteTournees depot={donnees.entite.depot} traces={[{ agent: apercu.tournee.agent, detail: apercu.detail }]} miseEnAvant={apercu.idPlace} />
              </div>
              <ol className="mt-3 rounded-lg border border-filet bg-surface text-sm">
                {apercu.detail.lignes.filter((l) => l.debutMin !== null).map((l) => {
                  const nouveau = l.intervention.id === apercu.idPlace
                  return (
                    <li key={l.intervention.id} className={`grid grid-cols-[3rem_minmax(0,1fr)_auto] items-baseline gap-3 border-b border-filet px-3 py-2 last:border-b-0 ${nouveau ? 'bg-accent-doux' : ''}`}>
                      <span className="font-medium tabular-nums">{formatHeure(l.debutMin!)}</span>
                      <span className={`truncate ${nouveau ? 'font-semibold' : ''}`}>{l.client.nom}</span>
                      <span className={`text-xs ${nouveau ? 'font-medium text-accent' : 'text-sourdine'}`}>{nouveau ? 'nouveau' : l.client.ville}</span>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
        </div>
      )}
    </Tiroir>
  )
}

/** Une proposition : date et heure, agent, raison en une phrase. */
export function LigneProposition({ proposition: p, recommandee, active, onClick }: { proposition: Proposition; recommandee: boolean; active?: boolean; onClick: () => void }) {
  const { donnees } = useEtatDemo()
  const agent = donnees.agents.find((a) => a.id === p.agentId)!
  const alerte = p.details.find((d) => d.startsWith('Attention'))
  const finDeJournee = p.details[0]?.replace(/^Fin de journée vers /, 'fin vers ')
  return (
    <li className="border-b border-filet last:border-b-0">
      <button
        onClick={onClick}
        aria-pressed={active}
        className={`flex w-full gap-3 px-4 py-3 text-left ${active ? 'bg-accent-doux' : 'hover:bg-survol'}`}
      >
        {active !== undefined && (
          <span className={`mt-1 grid size-4 shrink-0 place-items-center rounded-full border ${active ? 'border-accent' : 'border-filet-fort'}`}>
            {active && <span className="size-2 rounded-full bg-accent" />}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="font-semibold first-letter:uppercase">
              {formatDateLongue(p.date)} · {formatHeure(p.debutMin)}
            </span>
            <span className="flex items-center gap-1.5 text-[13px] text-encre-2">
              <PastilleAgent couleur={agent.couleur} />
              {agent.nom}
            </span>
          </span>
          <span className="mt-0.5 block text-[13px] text-encre-2">{p.raison}</span>
          <span className="mt-0.5 block text-xs text-sourdine">
            {recommandee && <span className="font-medium text-accent">Recommandé · </span>}
            {finDeJournee}
          </span>
          {p.changementAgent && <span className="mt-0.5 block text-xs text-attention">{p.changementAgent}</span>}
          {alerte && <span className="mt-0.5 block text-xs text-attention">{alerte.replace('Attention : ', '')}</span>}
        </span>
      </button>
    </li>
  )
}
