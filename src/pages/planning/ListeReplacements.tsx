import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useEtatDemo } from '../../donnees/EtatDemo'
import type { DateISO, Intervention } from '../../donnees/types'
import { appliquerCreneau, decrirePlacement, trouverCreneaux } from '../../planning/creneaux'
import type { DemandeCreneau, Proposition } from '../../planning/creneaux'
import { demandesDeReplacement, laisserAnnule } from '../../planning/meteo'
import { PastilleAgent } from '../../ui/statuts'
import { formatDateLongue } from '../../utils/dates'
import { formatDuree, formatHeure } from '../../utils/format'
import { LigneProposition } from './PanneauCreneau'

/**
 * Liste des passages annulés pour la pluie et de leur nouveau créneau proposé,
 * modifiable (« Changer », « Ne pas replacer »). Travaille sur un brouillon :
 * rien n'est enregistré ici.
 */
export function ListeReplacements({ date, annules, brouillon, setBrouillon }: {
  date: DateISO
  annules: Intervention[]
  brouillon: Intervention[]
  setBrouillon: Dispatch<SetStateAction<Intervention[]>>
}) {
  const { donnees, dateDuJour } = useEtatDemo()
  const ctxDe = (interventions: Intervention[]) => ({
    depot: donnees.entite.depot,
    clients: donnees.clients,
    agents: donnees.agents,
    interventions,
    dateDuJour,
  })
  const demandes = new Map<string, DemandeCreneau>(demandesDeReplacement(annules, dateDuJour).map((d) => [d.interventionId!, d]))
  const [enChangement, setEnChangement] = useState<string | null>(null)
  const clients = new Map(donnees.clients.map((c) => [c.id, c]))
  const agents = new Map(donnees.agents.map((a) => [a.id, a]))

  const choisir = (id: string, p: Proposition) => {
    setBrouillon((b) => appliquerCreneau(ctxDe(b), demandes.get(id)!, p))
    setEnChangement(null)
  }
  const retirer = (original: Intervention) => {
    setBrouillon((b) => laisserAnnule(ctxDe(b), b, original))
    setEnChangement(null)
  }
  const replacer = (id: string) => {
    const meilleure = trouverCreneaux(ctxDe(brouillon), demandes.get(id)!)[0]
    if (meilleure) choisir(id, meilleure)
  }

  return (
      <ol className="overflow-hidden rounded-lg border border-filet bg-surface">
        {annules.map((original) => {
          const client = clients.get(original.clientId)!
          const actuel = brouillon.find((i) => i.id === original.id)!
          const place = actuel.statut !== 'annulee_meteo'
          const demande = demandes.get(original.id)!
          const description = place ? decrirePlacement(ctxDe(brouillon), original.id, demande.fenetre.debut) : null
          const agent = agents.get(actuel.agentId)!
          const ouvert = enChangement === original.id
          const options = ouvert
            ? trouverCreneaux(ctxDe(brouillon), { ...demande, joursExclus: [date, ...(place ? [actuel.date] : [])] })
            : []
          const alerte = description?.details.find((d) => d.startsWith('Attention'))
          // Agent différent de celui prévu ce jour-là : on dit qui remplace qui, et pourquoi.
          const changementAgent =
            place && actuel.agentId !== original.agentId
              ? (trouverCreneaux(ctxDe(brouillon), { ...demande, joursExclus: [date] }, { nombre: 50 }).find(
                  (p) => p.agentId === actuel.agentId && p.date === actuel.date,
                )?.changementAgent ?? `${agent.nom.split(' ')[0]} remplace ${agents.get(original.agentId)!.nom.split(' ')[0]}, l’agent habituel de ce client`)
              : null

          return (
            <li key={original.id} className="border-b border-filet last:border-b-0">
              <div className="grid gap-x-6 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <div className="truncate font-medium">{client.nom}</div>
                  <div className="truncate text-xs text-sourdine">
                    {client.ville} · {formatDuree(client.dureeMin)} · était à {formatHeure(original.debutMin)}
                  </div>
                </div>
                <div className="min-w-0">
                  {place && description ? (
                    <>
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium first-letter:uppercase">{formatDateLongue(actuel.date)} · {formatHeure(actuel.debutMin)}</span>
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-encre-2">
                          <PastilleAgent couleur={agent.couleur} />
                          {agent.nom}
                        </span>
                      </div>
                      <div className="text-xs text-sourdine">{description.raison}</div>
                      {changementAgent && <div className="text-xs text-attention">{changementAgent}</div>}
                      {alerte && <div className="text-xs text-attention">{alerte.replace('Attention : ', '')}</div>}
                    </>
                  ) : (
                    <div className="text-[13px] text-alerte">Reste annulé, à replacer plus tard</div>
                  )}
                </div>
                <div className="flex items-start gap-3 text-[13px]">
                  {place ? (
                    <>
                      <button onClick={() => setEnChangement(ouvert ? null : original.id)} className="font-medium text-accent hover:underline">
                        {ouvert ? 'Fermer' : 'Changer'}
                      </button>
                      <button onClick={() => retirer(original)} className="text-sourdine hover:text-encre hover:underline">
                        Ne pas replacer
                      </button>
                    </>
                  ) : (
                    <button onClick={() => replacer(original.id)} className="font-medium text-accent hover:underline">
                      Replacer
                    </button>
                  )}
                </div>
              </div>

              {ouvert && (
                <div className="border-t border-filet bg-papier px-4 py-3">
                  <div className="mb-2 text-[13px] text-sourdine">Autres créneaux possibles</div>
                  {options.length === 0 ? (
                    <p className="text-sm text-encre-2">Aucun autre créneau disponible sur la période.</p>
                  ) : (
                    <ul className="overflow-hidden rounded-lg border border-filet bg-surface">
                      {options.map((p) => (
                        // Le créneau recommandé est celui déjà retenu au-dessus : pas de mention ici.
                        <LigneProposition key={`${p.date}|${p.agentId}`} proposition={p} recommandee={false} onClick={() => choisir(original.id, p)} />
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ol>
  )
}
