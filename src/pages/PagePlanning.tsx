import { useEffect, useRef, useState } from 'react'
import { useEtatDemo } from '../donnees/EtatDemo'
import type { DateISO } from '../donnees/types'
import { joursTravaillesDuMois, prochainJourTravaille } from '../planning/calendrierTravail'
import { statsDuMois } from '../planning/vues'
import { Bouton } from '../ui/Bouton'
import { Indicateur } from '../ui/Carte'
import { PastilleAgent } from '../ui/statuts'
import { Onglets } from '../ui/Onglets'
import { annee as anneeDe, dernierDuMois, formatDate, formatDateLongue, mois as moisDe, nomMois, premierDuMois } from '../utils/dates'
import { formatDuree } from '../utils/format'
import { Calendrier } from './planning/Calendrier'
import { CompteurHeures } from './planning/CompteurHeures'
import { ListeClients } from './planning/ListeClients'
import { VueJournee } from './planning/VueJournee'
import { VueTournees } from './planning/VueTournees'
import { PanneauCreneau } from './planning/PanneauCreneau'
import { PanneauMeteo } from './planning/PanneauMeteo'
import { ModaleEnvoiAgents } from './planning/ModaleEnvoiAgents'
import { PanneauMessages } from './planning/PanneauMessages'
import { PanneauPluieAuto } from './planning/PanneauPluieAuto'
import { PanneauMoisSuivant } from './planning/PanneauMoisSuivant'
import { moisAPreparer } from '../planning/moisSuivant'
import { METEO_DEMO } from '../donnees/donnees-fictives'
import { clientsAPrevenir } from '../planning/messages'
import { annulerJournee, changementsParAgent, nombreDeChangements, passagesAReplacer } from '../planning/meteo'
import type { OuvertureCreneau } from './planning/PanneauCreneau'

type Vue = 'calendrier' | 'tournees' | 'clients'

export function PagePlanning() {
  const { donnees, dateDuJour, modifier } = useEtatDemo()
  const [vue, setVue] = useState<Vue>('calendrier')
  // Mois planifiés : du mois en cours au dernier mois qui a des passages.
  const dernierPassage = donnees.interventions.reduce((max, i) => (i.date > max ? i.date : max), dateDuJour)
  const moisPossibles: { annee: number; mois: number }[] = []
  for (let d = premierDuMois(anneeDe(dateDuJour), moisDe(dateDuJour)); d <= dernierPassage; d = premierDuMois(anneeDe(d), moisDe(d) + 1)) {
    moisPossibles.push({ annee: anneeDe(d), mois: moisDe(d) })
  }
  const aPreparer = moisAPreparer(donnees, dateDuJour)
  const [preparerOuvert, setPreparerOuvert] = useState(false)
  const [moisAffiche, setMoisAffiche] = useState(moisPossibles[0])
  const [jour, setJour] = useState<DateISO>(prochainJourTravaille(dateDuJour))
  const vueJournee = useRef<HTMLDivElement>(null)
  const [defilerVersJour, setDefilerVersJour] = useState(false)
  const [creneau, setCreneau] = useState<OuvertureCreneau | null>(null)
  const [message, setMessage] = useState<{ texte: string; date?: DateISO; envoyer?: boolean; prevenir?: boolean } | null>(null)
  const [messagesOuvert, setMessagesOuvert] = useState(false)
  // Clients à prévenir suite à un changement (les simples rappels de demain ne comptent pas dans le badge).
  const aPrevenir = clientsAPrevenir(donnees, dateDuJour).filter((x) => !x.dejaPrevenu && x.modele !== 'rappel_veille').length
  const [meteo, setMeteo] = useState<DateISO | null>(null)
  const [pluieAuto, setPluieAuto] = useState(false)
  const [alerteMasquee, setAlerteMasquee] = useState(false)
  const [envoiOuvert, setEnvoiOuvert] = useState(false)

  // Annulation météo de demain
  const demain = prochainJourTravaille(dateDuJour)
  const demainAnnulable = donnees.interventions.some((i) => i.date === demain && (i.statut === 'planifiee' || i.statut === 'replanifiee'))
  const aReplacer = passagesAReplacer(donnees.interventions)
  const annulerDemain = () => {
    modifier((jeu) => ({ ...jeu, interventions: annulerJournee(jeu.interventions, demain) }))
    setMessage(null)
    setMeteo(demain)
  }
  // Alerte météo (simulée) : proposée seulement s'il y a des passages demain.
  const passagesDemain = donnees.interventions.filter((i) => i.date === demain && (i.statut === 'planifiee' || i.statut === 'replanifiee')).length
  const alertePluie = !alerteMasquee && passagesDemain > 0 && METEO_DEMO.probabilitePluieDemain >= METEO_DEMO.seuilAlerte
  const aEnvoyer = nombreDeChangements(changementsParAgent(donnees.interventionsEnvoyees, donnees.interventions, donnees.agents, dateDuJour))
  const voirJour = (date: DateISO) => {
    setVue('calendrier')
    setMoisAffiche({ annee: anneeDe(date), mois: moisDe(date) })
    setJour(date)
    setDefilerVersJour(true)
  }
  const ouvrirJour = (date: DateISO) => {
    setJour(date)
    setDefilerVersJour(true)
  }
  // Défilement une fois la vue journée affichée (elle peut venir d'un autre onglet).
  useEffect(() => {
    if (!defilerVersJour) return
    vueJournee.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setDefilerVersJour(false)
  }, [defilerVersJour])

  const prefixe = premierDuMois(moisAffiche.annee, moisAffiche.mois).slice(0, 7)
  const stats = statsDuMois(donnees, prefixe)

  const nomDuMois = nomMois(moisAffiche.annee, moisAffiche.mois).split(' ')[0]
  const aFaire = (aReplacer.length > 0 && !meteo) || aPrevenir > 0 || aEnvoyer > 0

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Planning</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-sourdine">
            <span>{donnees.clients.length} clients vitrerie</span>
            {donnees.agents.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-1.5">
                <PastilleAgent couleur={a.couleur} />
                {a.nom}
              </span>
            ))}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Bouton onClick={annulerDemain} disabled={!demainAnnulable}>
            Annuler la journée de demain (pluie)
          </Bouton>
          <Bouton variante="principal" onClick={() => setCreneau({})}>
            Trouver un créneau
          </Bouton>
        </div>
      </header>

      {alertePluie && (
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-accent/40 bg-accent-doux px-4 py-3">
          {/* Largeur minimale : sur mobile, les boutons passent sous le texte au lieu de l'écraser. */}
          <div className="min-w-[16rem] flex-1">
            <div className="font-medium text-encre">
              Pluie annoncée demain, <span className="first-letter:lowercase">{formatDateLongue(demain)}</span> : {METEO_DEMO.probabilitePluieDemain} % de risque à {donnees.entite.ville}
            </div>
            <div className="text-[13px] text-encre-2">
              {passagesDemain} passage{passagesDemain > 1 ? 's' : ''} concerné{passagesDemain > 1 ? 's' : ''}. L’outil peut tout préparer : nouveaux créneaux, messages aux clients, planning des agents.
            </div>
          </div>
          <Bouton variante="discret" petit onClick={() => setAlerteMasquee(true)}>Ignorer</Bouton>
          <Bouton variante="principal" petit onClick={() => setPluieAuto(true)}>Tout préparer</Bouton>
        </div>
      )}

      {/* Ce qui reste à faire après un changement : n'apparaît que si nécessaire. */}
      {(aFaire || message) && (
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-filet bg-surface px-4 py-2.5 text-sm">
          {message && (
            <span className="min-w-[16rem] flex-1 text-encre-2">
              {message.texte}
              {message.date && (
                <button onClick={() => voirJour(message.date!)} className="ml-2 font-medium text-accent hover:underline">
                  Voir la journée
                </button>
              )}
            </span>
          )}
          {!message && <span className="flex-1 font-medium">À faire</span>}
          {aReplacer.length > 0 && !meteo && (
            <Bouton petit onClick={() => setMeteo(aReplacer[0].date)} compteur={aReplacer.length}>
              Replacer les passages annulés
            </Bouton>
          )}
          {aPrevenir > 0 && (
            <Bouton petit onClick={() => setMessagesOuvert(true)} compteur={aPrevenir}>
              Prévenir les clients
            </Bouton>
          )}
          {aEnvoyer > 0 && (
            <Bouton petit onClick={() => setEnvoiOuvert(true)} compteur={aEnvoyer}>
              Envoyer aux agents
            </Bouton>
          )}
          {message && (
            <button onClick={() => setMessage(null)} className="text-sourdine hover:text-encre" aria-label="Masquer le message">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          )}
        </div>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:gap-0 sm:divide-x sm:divide-filet [&>*]:sm:px-6 [&>*:first-child]:sm:pl-0">
        <Indicateur
          libelle={`Passages en ${nomDuMois}`}
          valeur={stats.passages}
          detail={[
            stats.terminees && `${stats.terminees} fait${stats.terminees > 1 ? 's' : ''}`,
            stats.annulees && `${stats.annulees} annulé${stats.annulees > 1 ? 's' : ''}`,
            stats.replanifiees && `${stats.replanifiees} replacé${stats.replanifiees > 1 ? 's' : ''}`,
          ].filter(Boolean).join(' · ') || 'à réaliser'}
        />
        <Indicateur libelle="Vitrerie" valeur={formatDuree(stats.travailMin)} detail="chez les clients" />
        <Indicateur libelle="Route" valeur={formatDuree(stats.routeMin)} detail="tournées par secteur" />
        <CompteurHeures />
      </dl>

      <div className="mt-8">
        <Onglets<Vue>
          valeur={vue}
          onChange={(v) => {
            // Fin de mois : l'onglet Tournées montre directement le mois suivant.
            const restants = joursTravaillesDuMois(moisPossibles[0].annee, moisPossibles[0].mois).filter((d) => d > dateDuJour)
            if (v === 'tournees' && moisAffiche.mois === moisPossibles[0].mois && restants.length < 5) setMoisAffiche(moisPossibles[1])
            setVue(v)
          }}
          options={[
            { valeur: 'calendrier', libelle: 'Calendrier' },
            { valeur: 'tournees', libelle: 'Tournées' },
            { valeur: 'clients', libelle: 'Clients' },
          ]}
        />
      </div>

      <div className="mt-6 space-y-6">
      {vue === 'calendrier' ? (
        <>
          <Calendrier
            annee={moisAffiche.annee}
            mois={moisAffiche.mois}
            moisPossibles={moisPossibles}
            onChangeMois={(annee, mois) => setMoisAffiche({ annee, mois })}
            jourSelectionne={jour}
            onSelectionJour={ouvrirJour}
            preparerMois={{ libelle: `Préparer ${nomMois(aPreparer.annee, aPreparer.mois).split(' ')[0]}`, onClick: () => setPreparerOuvert(true) }}
          />
          <div ref={vueJournee} className="scroll-mt-6">
            <VueJournee
              date={jour}
              onChangeDate={(d) => {
                setJour(d)
                setMoisAffiche({ annee: anneeDe(d), mois: moisDe(d) })
              }}
              premierJour={premierDuMois(moisPossibles[0].annee, moisPossibles[0].mois)}
              dernierJour={dernierDuMois(moisPossibles.at(-1)!.annee, moisPossibles.at(-1)!.mois)}
              onDeplacer={(interventionId) => setCreneau({ interventionId })}
              onPrevenir={() => setMessagesOuvert(true)}
            />
          </div>
        </>
      ) : vue === 'tournees' ? (
        <VueTournees
          annee={moisAffiche.annee}
          mois={moisAffiche.mois}
          moisPossibles={moisPossibles}
          onChangeMois={(annee, mois) => setMoisAffiche({ annee, mois })}
          onOuvrirJour={voirJour}
        />
      ) : (
        <ListeClients onPlanifier={(clientId) => setCreneau({ clientId })} />
      )}
      </div>

      {creneau && (
        <PanneauCreneau
          ouverture={creneau}
          onFermer={() => setCreneau(null)}
          onPlace={(resume) => {
            setCreneau(null)
            setMessage({ ...resume, envoyer: true, prevenir: true })
          }}
        />
      )}
      {meteo && (
        <PanneauMeteo
          date={meteo}
          onFermer={() => setMeteo(null)}
          onConfirme={(replaces) => {
            setMessage({
              texte: `${replaces} passage${replaces > 1 ? 's' : ''} replacé${replaces > 1 ? 's' : ''} après la pluie du ${formatDate(meteo)}.`,
              envoyer: true,
              prevenir: true,
            })
            setMeteo(null)
          }}
        />
      )}
      {preparerOuvert && (
        <PanneauMoisSuivant
          onFermer={() => setPreparerOuvert(false)}
          onValide={(texte, annee, mois) => {
            setPreparerOuvert(false)
            setVue('calendrier')
            setMoisAffiche({ annee, mois })
            setMessage({ texte })
          }}
        />
      )}
      {pluieAuto && (
        <PanneauPluieAuto
          date={demain}
          onFermer={() => setPluieAuto(false)}
          onValide={(texte) => {
            setPluieAuto(false)
            setMessage({ texte })
          }}
        />
      )}
      {messagesOuvert && (
        <PanneauMessages
          onFermer={() => setMessagesOuvert(false)}
          onEnvoye={(texte) => {
            setMessagesOuvert(false)
            setMessage({ texte, envoyer: true })
          }}
        />
      )}
      {envoiOuvert && (
        <ModaleEnvoiAgents
          onFermer={() => setEnvoiOuvert(false)}
          onEnvoye={(texte) => {
            setEnvoiOuvert(false)
            setMessage({ texte })
          }}
        />
      )}
    </div>
  )
}
