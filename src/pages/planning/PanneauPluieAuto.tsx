import { useState } from 'react'
import type { ReactNode } from 'react'
import { useEtatDemo } from '../../donnees/EtatDemo'
import type { DateISO, Intervention } from '../../donnees/types'
import { clientsAPrevenir, genererMessage } from '../../planning/messages'
import { changementsParAgent, preparerJourneePluie, validerJourneePluie } from '../../planning/meteo'
import { Bouton } from '../../ui/Bouton'
import { PastilleAgent } from '../../ui/statuts'
import { Tiroir } from '../../ui/Tiroir'
import { formatDateLongue } from '../../utils/dates'
import { ListeReplacements } from './ListeReplacements'

interface Props {
  date: DateISO
  onFermer: () => void
  /** Après validation, avec le résumé de ce qui a été fait. */
  onValide: (texte: string) => void
}

/**
 * Pluie : tout préparer en un clic. L'outil annule la journée, replace les
 * passages, rédige les messages aux clients et prépare l'envoi aux agents.
 * L'utilisateur vérifie, ajuste si besoin, et valide une seule fois.
 */
export function PanneauPluieAuto({ date, onFermer, onValide }: Props) {
  const { donnees, modifier, dateDuJour } = useEtatDemo()
  const [preparation] = useState(() => preparerJourneePluie(donnees, date, dateDuJour))
  const [brouillon, setBrouillon] = useState<Intervention[]>(preparation.interventions)

  const messages = clientsAPrevenir({ ...donnees, interventions: brouillon }, dateDuJour).filter(
    (x) => x.modele === 'annulation_meteo' && !x.dejaPrevenu,
  )
  const exemple = messages[0]
  const sms = exemple ? genererMessage(exemple.modele, { client: exemple.client, intervention: exemple.intervention, entite: donnees.entite, dateDuJour }).sms : ''
  const changements = changementsParAgent(donnees.interventionsEnvoyees, brouillon, donnees.agents, dateDuJour)
  const ids = new Set(preparation.annules.map((i) => i.id))
  const replaces = brouillon.filter((i) => ids.has(i.id) && i.statut !== 'annulee_meteo').length

  const valider = () => {
    modifier((jeu) => validerJourneePluie(jeu, brouillon, dateDuJour))
    onValide(
      `Pluie du ${formatDateLongue(date).split(' ')[1]} gérée : ${replaces} passage${replaces > 1 ? 's' : ''} replacé${replaces > 1 ? 's' : ''}, ${messages.length} client${messages.length > 1 ? 's' : ''} prévenu${messages.length > 1 ? 's' : ''} par SMS et mail, planning envoyé aux agents (simulation).`,
    )
  }

  return (
    <Tiroir
      titre={<span className="first-letter:uppercase">Pluie {formatDateLongue(date)} : tout est prêt</span>}
      sousTitre="L’outil a tout préparé. Vérifiez, changez un créneau si besoin, puis validez une seule fois. Rien n’est envoyé avant."
      onFermer={onFermer}
      pied={
        <>
          <span className="flex-1" />
          <Bouton variante="discret" onClick={onFermer}>Annuler</Bouton>
          <Bouton variante="principal" onClick={valider}>Tout valider et envoyer</Bouton>
        </>
      }
    >
      <div className="space-y-8">
        <Etape numero={1} titre={`${replaces} passage${replaces > 1 ? 's' : ''} replacé${replaces > 1 ? 's' : ''}`} detail="Dans le mois ou le suivant, au plus près des tournées existantes.">
          <ListeReplacements date={date} annules={preparation.annules} brouillon={brouillon} setBrouillon={setBrouillon} />
        </Etape>

        <Etape numero={2} titre={`${messages.length} client${messages.length > 1 ? 's' : ''} à prévenir`} detail="Un SMS et un mail à chacun, avec son nouveau créneau.">
          {exemple && (
            <div className="rounded-lg border border-filet bg-surface p-4">
              <div className="mb-2 text-[13px] text-sourdine">Exemple : SMS à {exemple.client.nom}</div>
              <p className="max-w-lg rounded-xl rounded-bl-sm bg-survol px-3.5 py-2.5 text-sm leading-relaxed">{sms}</p>
              <div className="mt-3 text-[13px] text-sourdine">
                Destinataires : {messages.map((m) => m.client.nom).join(', ')}
              </div>
            </div>
          )}
        </Etape>

        <Etape numero={3} titre="Planning à envoyer aux agents" detail="Chaque agent recevrait ses changements dans son outil de pointage (simulé : rien n’est réellement envoyé).">
          <ul className="overflow-hidden rounded-lg border border-filet bg-surface text-sm">
            {donnees.agents.map((a) => {
              const liste = changements.get(a.id) ?? []
              const ajoutes = liste.filter((c) => c.type === 'ajout').length
              const retires = liste.filter((c) => c.type === 'retrait').length
              const horaires = liste.filter((c) => c.type === 'horaire').length
              return (
                <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 border-b border-filet px-4 py-2.5 last:border-b-0">
                  <span className="flex items-center gap-2 font-medium">
                    <PastilleAgent couleur={a.couleur} />
                    {a.nom}
                  </span>
                  <span className="text-encre-2">
                    {liste.length === 0
                      ? 'aucun changement'
                      : [ajoutes && `${ajoutes} passage${ajoutes > 1 ? 's' : ''} ajouté${ajoutes > 1 ? 's' : ''}`, retires && `${retires} retiré${retires > 1 ? 's' : ''}`, horaires && `${horaires} horaire${horaires > 1 ? 's' : ''} décalé${horaires > 1 ? 's' : ''}`]
                          .filter(Boolean)
                          .join(', ')}
                  </span>
                </li>
              )
            })}
          </ul>
        </Etape>
      </div>
    </Tiroir>
  )
}

function Etape({ numero, titre, detail, children }: { numero: number; titre: string; detail: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-encre text-xs font-semibold text-white">{numero}</span>
        <div>
          <h3 className="font-semibold">{titre}</h3>
          <p className="text-[13px] text-sourdine">{detail}</p>
        </div>
      </div>
      {children}
    </section>
  )
}
