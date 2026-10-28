import { useState } from 'react'
import { useEtatDemo } from '../../donnees/EtatDemo'
import type { CanalMessage, ModeleMessage } from '../../donnees/types'
import { clientsAPrevenir, enregistrerEnvois, genererMessage, LIBELLES_MODELE } from '../../planning/messages'
import type { ClientAPrevenir } from '../../planning/messages'
import { Bouton } from '../../ui/Bouton'
import { Tiroir } from '../../ui/Tiroir'
import { formatDate } from '../../utils/dates'
import { formatHeure } from '../../utils/format'

interface Props {
  onFermer: () => void
  onEnvoye: (texte: string) => void
}

/**
 * « Prévenir les clients » : clients touchés par une replanification (et rappels
 * de demain), aperçu du SMS et du mail, envoi simulé.
 */
export function PanneauMessages({ onFermer, onEnvoye }: Props) {
  const { donnees, modifier, dateDuJour } = useEtatDemo()
  const liste = clientsAPrevenir(donnees, dateDuJour)
  const aEnvoyer = liste.filter((x) => !x.dejaPrevenu)

  // Par défaut : tous les clients pas encore prévenus.
  const [coches, setCoches] = useState<Set<string>>(() => new Set(aEnvoyer.map((x) => x.intervention.id)))
  const [modeles, setModeles] = useState<Record<string, ModeleMessage>>({})
  const [canaux, setCanaux] = useState<Set<CanalMessage>>(new Set(['sms', 'mail']))
  const [apercu, setApercu] = useState<string | null>(liste[0]?.intervention.id ?? null)

  const modeleDe = (x: ClientAPrevenir) => modeles[x.intervention.id] ?? x.modele
  const selection = liste.find((x) => x.intervention.id === apercu)
  const message = selection
    ? genererMessage(modeleDe(selection), { client: selection.client, intervention: selection.intervention, entite: donnees.entite, dateDuJour })
    : null
  const choisis = liste.filter((x) => coches.has(x.intervention.id))

  const basculer = (id: string) =>
    setCoches((c) => {
      const n = new Set(c)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const basculerCanal = (canal: CanalMessage) =>
    setCanaux((c) => {
      const n = new Set(c)
      if (n.has(canal)) n.delete(canal)
      else n.add(canal)
      return n
    })

  const envoyer = () => {
    const envois = choisis.map((x) => ({ aPrevenir: x, modele: modeleDe(x), canaux: [...canaux] }))
    modifier((jeu) => ({ ...jeu, messagesEnvoyes: enregistrerEnvois(jeu.messagesEnvoyes, envois, dateDuJour) }))
    const detail = [canaux.has('sms') && `${choisis.length} SMS`, canaux.has('mail') && `${choisis.length} mail${choisis.length > 1 ? 's' : ''}`]
      .filter(Boolean)
      .join(' et ')
    onEnvoye(`${detail} envoyés à ${choisis.length} client${choisis.length > 1 ? 's' : ''} (simulation : aucun envoi réel).`)
  }

  const groupes: { titre: string; elements: ClientAPrevenir[] }[] = [
    { titre: 'Touchés par la météo', elements: liste.filter((x) => x.modele === 'annulation_meteo') },
    { titre: 'Passages déplacés', elements: liste.filter((x) => x.modele === 'deplacement') },
    { titre: 'Rappel des passages de demain', elements: liste.filter((x) => x.modele === 'rappel_veille') },
  ].filter((g) => g.elements.length > 0)

  return (
    <Tiroir
      titre="Prévenir les clients"
      sousTitre="Clients concernés par un changement. Vérifiez le message, puis envoyez (envoi simulé dans la maquette)."
      onFermer={onFermer}
      largeur="max-w-5xl"
      pied={
        <>
          <span className="text-[13px] text-sourdine">Envoyer par</span>
          {(['sms', 'mail'] as CanalMessage[]).map((c) => (
            <label key={c} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={canaux.has(c)} onChange={() => basculerCanal(c)} className="size-4 accent-accent" />
              {c === 'sms' ? 'SMS' : 'Mail'}
            </label>
          ))}
          <span className="flex-1" />
          <span className="text-[13px] text-sourdine tabular-nums">{choisis.length} sélectionné{choisis.length > 1 ? 's' : ''}</span>
          <Bouton variante="discret" onClick={onFermer}>Fermer</Bouton>
          <Bouton variante="principal" onClick={envoyer} disabled={choisis.length === 0 || canaux.size === 0}>Envoyer</Bouton>
        </>
      }
    >
      {liste.length === 0 ? (
        <p className="mt-10 text-center text-sm text-sourdine">Aucun client à prévenir pour le moment.</p>
      ) : (
        <div className="grid gap-6 [&>*]:min-w-0 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="space-y-5">
            {groupes.map((g) => (
              <div key={g.titre}>
                <div className="mb-2 text-[13px] text-sourdine">{g.titre}</div>
                <ul className="overflow-hidden rounded-lg border border-filet bg-surface">
                  {g.elements.map((x) => {
                    const id = x.intervention.id
                    return (
                      <li
                        key={id}
                        onClick={() => setApercu(id)}
                        className={`flex cursor-pointer gap-3 border-b border-filet px-3 py-2.5 last:border-b-0 ${apercu === id ? 'bg-accent-doux' : 'hover:bg-survol'}`}
                      >
                        <input
                          type="checkbox"
                          checked={coches.has(id)}
                          onChange={() => basculer(id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 size-4 shrink-0 accent-accent"
                          aria-label={`Prévenir ${x.client.nom}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate font-medium">{x.client.nom}</span>
                            {x.dejaPrevenu && <span className="shrink-0 text-xs font-medium text-ok">Prévenu</span>}
                          </div>
                          <div className="text-xs text-sourdine">
                            {x.intervention.statut === 'annulee_meteo'
                              ? `Était prévu le ${formatDate(x.intervention.date)}, sans nouveau créneau`
                              : `${formatDate(x.intervention.date)} à ${formatHeure(x.intervention.debutMin)}`}
                            {x.intervention.dateOrigine && x.intervention.statut !== 'annulee_meteo' && `, au lieu du ${formatDate(x.intervention.dateOrigine).slice(0, 5)}`}
                          </div>
                          {x.modelesPossibles.length > 1 && (
                            <select
                              value={modeleDe(x)}
                              onChange={(e) => setModeles((m) => ({ ...m, [id]: e.target.value as ModeleMessage }))}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1 h-7 rounded border border-filet-fort bg-surface px-1.5 text-xs"
                              aria-label="Modèle de message"
                            >
                              {x.modelesPossibles.map((m) => <option key={m} value={m}>{LIBELLES_MODELE[m]}</option>)}
                            </select>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>

          {selection && message && (
            <div className="space-y-5 md:sticky md:top-0 md:self-start">
              <div className="text-[13px] text-sourdine">
                Aperçu pour <span className="font-medium text-encre">{selection.client.contact.nom}</span>, {selection.client.nom}
              </div>

              <div className={canaux.has('sms') ? '' : 'opacity-40'}>
                <div className="mb-1.5 flex justify-between text-[13px] text-sourdine">
                  <span>SMS · {selection.client.contact.telephone}</span>
                  <span className="tabular-nums">{message.sms.length} / 160 caractères</span>
                </div>
                <div className="rounded-lg border border-filet bg-surface p-4">
                  <p className="max-w-sm rounded-xl rounded-bl-sm bg-survol px-3.5 py-2.5 text-sm leading-relaxed">{message.sms}</p>
                </div>
              </div>

              <div className={canaux.has('mail') ? '' : 'opacity-40'}>
                <div className="mb-1.5 text-[13px] text-sourdine">Mail</div>
                <div className="overflow-hidden rounded-lg border border-filet bg-surface text-sm">
                  <dl className="grid grid-cols-[3.5rem_1fr] gap-y-0.5 border-b border-filet px-4 py-2.5 text-[13px]">
                    <dt className="text-sourdine">À</dt>
                    <dd className="truncate">{selection.client.contact.email}</dd>
                    <dt className="text-sourdine">Objet</dt>
                    <dd className="font-medium">{message.mail.objet}</dd>
                  </dl>
                  <div className="px-4 py-3 leading-relaxed whitespace-pre-line">{message.mail.corps}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Tiroir>
  )
}
