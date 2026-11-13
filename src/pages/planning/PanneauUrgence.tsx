import { useState } from 'react'
import { useEtatDemo } from '../../donnees/EtatDemo'
import type { DateISO } from '../../donnees/types'
import { joursTravaillesEntre } from '../../planning/calendrierTravail'
import { bornesPlage, preparerUrgence } from '../../planning/urgence'
import type { JourneePluiePreparee } from '../../planning/meteo'
import type { Plage } from '../../planning/urgence'
import { Bouton } from '../../ui/Bouton'
import { Tiroir } from '../../ui/Tiroir'
import { ajouterJours, formatDate, formatDateLongue } from '../../utils/dates'
import { formatHeure } from '../../utils/format'
import { PanneauPluieAuto } from './PanneauPluieAuto'

/**
 * Intervention urgente : choix du client, du jour et du créneau, puis le même
 * panneau que pour la pluie (passages décalés replacés, clients prévenus).
 */
export function PanneauUrgence({ onFermer, onValide }: { onFermer: () => void; onValide: (texte: string, date: DateISO) => void }) {
  const { donnees, dateDuJour } = useEtatDemo()
  const jours = joursTravaillesEntre(dateDuJour, ajouterJours(dateDuJour, 14))
  const clients = [...donnees.clients].sort((a, b) => a.nom.localeCompare(b.nom))
  const [clientId, setClientId] = useState(clients[0].id)
  const [date, setDate] = useState<DateISO>(jours.find((d) => d > dateDuJour) ?? jours[0])
  const [creneau, setCreneau] = useState(`${donnees.agents[0].id}|matin`)
  const [preparation, setPreparation] = useState<JourneePluiePreparee | null>(null)

  const [agentId, plage] = creneau.split('|') as [string, Plage]
  const client = donnees.clients.find((c) => c.id === clientId)!
  const prevus = donnees.interventions.filter((i) => {
    const { debut, fin } = bornesPlage(plage)
    return i.date === date && i.agentId === agentId && i.statut !== 'terminee' && i.statut !== 'annulee_meteo' && i.debutMin >= debut && i.debutMin < fin
  })

  if (preparation) {
    return (
      <PanneauPluieAuto
        date={date}
        preparation={preparation}
        modele="deplacement"
        titre={<>Urgence {client.nom} : tout est prêt</>}
        resume={(replaces, prevenus) =>
          `Urgence ajoutée : ${client.nom}, ${formatDateLongue(date)}. ${replaces} passage${replaces > 1 ? 's' : ''} replacé${replaces > 1 ? 's' : ''}, ${prevenus} client${prevenus > 1 ? 's' : ''} prévenu${prevenus > 1 ? 's' : ''} (simulation).`
        }
        onFermer={onFermer}
        onValide={(texte) => onValide(texte, date)}
      />
    )
  }

  return (
    <Tiroir
      titre="Ajouter une intervention urgente"
      sousTitre="Les passages déjà prévus sur ce créneau sont replacés automatiquement, et les clients prévenus."
      onFermer={onFermer}
      largeur="max-w-xl"
      pied={
        <>
          <span className="flex-1" />
          <Bouton variante="discret" onClick={onFermer}>Annuler</Bouton>
          <Bouton variante="principal" onClick={() => setPreparation(preparerUrgence(donnees, { clientId, date, agentId, plage }, dateDuJour))}>
            Préparer
          </Bouton>
        </>
      }
    >
      <div className="space-y-5">
        <Champ libelle="Client">
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="h-9 w-full rounded-md border border-filet-fort bg-surface px-2.5 text-sm">
            {clients.map((c) => <option key={c.id} value={c.id}>{c.nom} · {c.ville}</option>)}
          </select>
          {(client.horaires || client.materiel) && (
            <p className="mt-1 text-[13px] text-attention">
              {client.horaires && `Horaires : ${formatHeure(client.horaires.ouvertureMin)} à ${formatHeure(client.horaires.fermetureMin)}. `}
              {client.materiel && `Matériel : ${client.materiel.join(', ')}.`}
            </p>
          )}
        </Champ>
        <Champ libelle="Jour">
          <select value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-full rounded-md border border-filet-fort bg-surface px-2.5 text-sm">
            {jours.map((d) => <option key={d} value={d}>{formatDateLongue(d)}{d === dateDuJour ? ' (aujourd’hui)' : ''}</option>)}
          </select>
        </Champ>
        <Champ libelle="Créneau">
          <div className="grid grid-cols-2 gap-2">
            {donnees.agents.flatMap((a) =>
              (['matin', 'apres-midi'] as Plage[]).map((p) => {
                const valeur = `${a.id}|${p}`
                return (
                  <button
                    key={valeur}
                    onClick={() => setCreneau(valeur)}
                    className={`rounded-md border px-3 py-2 text-left text-sm ${creneau === valeur ? 'border-accent bg-accent-doux' : 'border-filet-fort bg-surface hover:bg-survol'}`}
                  >
                    <div className="font-medium">{p === 'matin' ? 'Matin' : 'Après-midi'}</div>
                    <div className="text-xs text-sourdine">{a.nom}</div>
                  </button>
                )
              }),
            )}
          </div>
        </Champ>
        <p className="text-[13px] text-encre-2">
          {prevus.length === 0
            ? `Créneau libre le ${formatDate(date)} : rien à décaler.`
            : `${prevus.length} passage${prevus.length > 1 ? 's' : ''} à décaler : ${prevus.map((i) => donnees.clients.find((c) => c.id === i.clientId)!.nom).join(', ')}.`}
        </p>
      </div>
    </Tiroir>
  )
}

function Champ({ libelle, children }: { libelle: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium">{libelle}</span>
      {children}
    </label>
  )
}
