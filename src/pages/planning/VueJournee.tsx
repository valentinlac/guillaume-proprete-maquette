import { useState } from 'react'
import { useEtatDemo } from '../../donnees/EtatDemo'
import type { DateISO } from '../../donnees/types'
import { estJourTravaille, prochainJourTravaille } from '../../planning/calendrierTravail'
import { detailJournee, tourneesDuJour } from '../../planning/vues'
import type { DetailJournee } from '../../planning/vues'
import { Bascule } from '../../ui/Onglets'
import { BadgeStatut, PastilleAgent } from '../../ui/statuts'
import { ajouterJours, formatDate, formatDateLongue } from '../../utils/dates'
import { formatDuree, formatHeure } from '../../utils/format'
import { CarteTournees } from './CarteTournees'

interface Props {
  date: DateISO
  onChangeDate: (date: DateISO) => void
  /** Bornes de navigation (mois planifiés). */
  premierJour: DateISO
  dernierJour: DateISO
  /** Ouvre « Trouver un créneau » pour déplacer un passage. */
  onDeplacer: (interventionId: string) => void
  /** Ouvre la prévenance des clients (rappel de la veille). */
  onPrevenir: () => void
}

function jourTravailleVoisin(date: DateISO, sens: 1 | -1): DateISO {
  let d = ajouterJours(date, sens)
  while (!estJourTravaille(d)) d = ajouterJours(d, sens)
  return d
}

/** Vue journée : passages de chaque agent dans l'ordre, route entre chantiers, carte. */
export function VueJournee({ date, onChangeDate, premierJour, dernierJour, onDeplacer, onPrevenir }: Props) {
  const { donnees, dateDuJour } = useEtatDemo()
  const [agentFiltre, setAgentFiltre] = useState<string>('tous')

  const tournees = tourneesDuJour(donnees, donnees.interventions.filter((i) => i.date === date))
  // Si l'agent choisi ne travaille pas ce jour-là, on montre les deux.
  const filtre = tournees.some((t) => t.agent.id === agentFiltre) ? agentFiltre : 'tous'
  const affichees = tournees
    .filter((t) => filtre === 'tous' || t.agent.id === filtre)
    .map((t) => ({ tournee: t, detail: detailJournee(t, donnees.clients) }))

  const precedent = jourTravailleVoisin(date, -1)
  const suivant = jourTravailleVoisin(date, 1)
  const estDemain = date === prochainJourTravaille(dateDuJour)
  const aDesPassagesPrevus = tournees.some((t) => t.interventions.some((i) => i.statut === 'planifiee' || i.statut === 'replanifiee'))

  return (
    <section className="rounded-lg border border-filet bg-surface">
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-filet py-2 pr-2 pl-5">
        <h2 className="text-[15px] font-semibold first-letter:uppercase">{formatDateLongue(date)}</h2>
        <div className="flex items-center gap-3">
          {estDemain && aDesPassagesPrevus && (
            <button onClick={onPrevenir} className="text-[13px] font-medium text-accent hover:underline">
              Envoyer le rappel aux clients
            </button>
          )}
          {tournees.length > 1 && (
            <Bascule
              valeur={filtre}
              onChange={setAgentFiltre}
              options={[{ valeur: 'tous', libelle: 'Les deux' }, ...tournees.map((t) => ({ valeur: t.agent.id, libelle: t.agent.nom.split(' ')[0] }))]}
            />
          )}
          <div className="flex items-center">
            <BoutonJour libelle="Jour précédent" sens="precedent" desactive={precedent < premierJour} onClick={() => onChangeDate(precedent)} />
            <BoutonJour libelle="Jour suivant" sens="suivant" desactive={suivant > dernierJour} onClick={() => onChangeDate(suivant)} />
          </div>
        </div>
      </div>

      {tournees.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-sourdine">Aucun passage prévu ce jour-là.</p>
      ) : (
        <div className="grid gap-6 p-5 [&>*]:min-w-0 lg:grid-cols-2">
          <div className="space-y-6">
            {affichees.map(({ tournee, detail }) => (
              <ListeTournee
                key={tournee.agent.id}
                nom={tournee.agent.nom}
                couleur={tournee.agent.couleur}
                detail={detail}
                totalMin={tournee.journee?.totalMin ?? 0}
                routeMin={tournee.journee?.routeTotaleMin ?? 0}
                maxHeures={tournee.agent.heuresMaxJour}
                modifiable={date > dateDuJour}
                onDeplacer={onDeplacer}
              />
            ))}
          </div>
          <div className="h-80 lg:sticky lg:top-6 lg:h-[28rem]">
            <CarteTournees depot={donnees.entite.depot} traces={affichees.map(({ tournee, detail }) => ({ agent: tournee.agent, detail }))} />
          </div>
        </div>
      )}
    </section>
  )
}

function ListeTournee({ nom, couleur, detail, totalMin, routeMin, maxHeures, modifiable, onDeplacer }: {
  nom: string
  couleur: string
  detail: DetailJournee
  totalMin: number
  routeMin: number
  maxHeures: number
  modifiable: boolean
  onDeplacer: (interventionId: string) => void
}) {
  const actifs = detail.lignes.filter((l) => l.debutMin !== null)
  const annules = detail.lignes.filter((l) => l.debutMin === null)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
        <span className="flex items-center gap-2 font-semibold">
          <PastilleAgent couleur={couleur} />
          {nom}
        </span>
        {actifs.length > 0 && (
          <span className="text-[13px] text-sourdine">
            {actifs.length} passage{actifs.length > 1 ? 's' : ''} · journée de {formatDuree(totalMin)} (dont {formatDuree(routeMin)} de route), {maxHeures} h maximum
          </span>
        )}
      </div>

      {/* Colonnes fixes : heure | client | statut. Le temps de route est dans la ligne de détail. */}
      <ol className="overflow-hidden rounded-lg border border-filet">
        {actifs.map((l, k) => (
          <li
            key={l.intervention.id}
            className="group grid grid-cols-[3rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-filet px-3 py-2.5 last:border-b-0 hover:bg-survol"
          >
            <span className="text-[13px] font-semibold tabular-nums">{formatHeure(l.debutMin!)}</span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{l.client.nom}</span>
              <span className="block truncate text-xs text-sourdine">
                {l.client.ville} · {formatDuree(l.client.dureeMin)}
                {l.finMin! - l.debutMin! > l.client.dureeMin && `, coupé par la pause de midi, fin à ${formatHeure(l.finMin!)}`}
                {` · ${l.routeAvantMin} min de route${k === 0 ? ' depuis le dépôt' : ''}`}
                {l.intervention.dateOrigine && ` · prévu le ${formatDate(l.intervention.dateOrigine).slice(0, 5)}`}
              </span>
            </span>
            <span className="flex items-baseline gap-3 justify-self-end">
              {l.intervention.statut !== 'planifiee' && <BadgeStatut statut={l.intervention.statut} />}
              {modifiable && l.intervention.statut !== 'terminee' && (
                <button onClick={() => onDeplacer(l.intervention.id)} className="text-xs font-medium text-accent hover:underline">
                  Déplacer
                </button>
              )}
            </span>
          </li>
        ))}
        {detail.retourDepotA !== null && (
          <li className="grid grid-cols-[3rem_minmax(0,1fr)] items-baseline gap-x-3 bg-papier px-3 py-2 text-xs text-sourdine">
            <span className="tabular-nums">{formatHeure(detail.retourDepotA)}</span>
            <span>Retour au dépôt · {detail.retourDepotMin} min de route</span>
          </li>
        )}
        {annules.map((l) => (
          <li key={l.intervention.id} className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-t border-filet px-3 py-2.5">
            <span aria-hidden />
            <span className="truncate text-sourdine line-through">{l.client.nom}</span>
            <BadgeStatut statut={l.intervention.statut} />
          </li>
        ))}
      </ol>
    </div>
  )
}

function BoutonJour({ libelle, sens, desactive, onClick }: { libelle: string; sens: 'precedent' | 'suivant'; desactive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={desactive}
      aria-label={libelle}
      className="rounded-md p-1.5 text-encre-2 hover:bg-survol disabled:cursor-not-allowed disabled:opacity-30"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
        <path d={sens === 'precedent' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
      </svg>
    </button>
  )
}
