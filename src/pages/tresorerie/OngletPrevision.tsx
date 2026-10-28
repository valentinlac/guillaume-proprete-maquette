import { useState } from 'react'
import type { ReactNode } from 'react'
import { useEtatDemo } from '../../donnees/EtatDemo'
import { detailArrondi, detailCalcul, prevoir, resumePrevision } from '../../tresorerie/prevision'
import type { Scenario } from '../../tresorerie/prevision'
import type { Recurrent } from '../../tresorerie/recurrents'
import { Bascule } from '../../ui/Onglets'
import { ajouterJours, formatDate, lireDate, nomJour } from '../../utils/dates'
import { formatEurosArrondis, lireMontant } from '../../utils/format'
import { COULEUR_BASE, COULEUR_SCENARIO, COULEUR_SEUIL, CourbeTresorerie } from './CourbeTresorerie'

const champ = 'h-8 rounded-md border border-filet-fort bg-surface px-2.5 text-sm'

/** Onglet « Prévision » : la réponse en une phrase, la courbe, et les questions « Et si… ? ». */
export function OngletPrevision({ recurrents, onVoirFixes }: { recurrents: Recurrent[]; onVoirFixes: () => void }) {
  const { donnees, dateDuJour } = useEtatDemo()
  const [horizon, setHorizon] = useState<'3' | '6'>('6')
  const clients = [...new Map(donnees.factures.map((f) => [f.client, f.montant])).entries()].sort((a, b) => b[1] - a[1])
  const [retard, setRetard] = useState({ actif: false, client: clients[0]?.[0] ?? '', jours: 30 })
  const [depense, setDepense] = useState({ actif: false, libelle: 'Remplacement d’un utilitaire', montant: '8 000', date: formatDate(ajouterJours(dateDuJour, 45)) })

  const scenario: Scenario = {}
  if (retard.actif) scenario.retard = { client: retard.client, jours: retard.jours }
  const dateDepense = lireDate(depense.date)
  const montantDepense = lireMontant(depense.montant)
  if (depense.actif && dateDepense && montantDepense) scenario.depense = { date: dateDepense, montant: montantDepense, libelle: depense.libelle || 'Dépense exceptionnelle' }
  const simulation = scenario.retard || scenario.depense ? scenario : null

  const base = prevoir(donnees, recurrents, dateDuJour, Number(horizon))
  const avec = simulation ? prevoir(donnees, recurrents, dateDuJour, Number(horizon), simulation) : null
  const affichee = avec ?? base
  const fin = affichee.points.at(-1)!
  const bas = affichee.pointBas
  const resume = resumePrevision(donnees.mouvements, recurrents, donnees.factures, dateDuJour)
  const aVerifier = recurrents.filter((r) => r.statut === 'propose').length
  // Arrondi à l'euro de façon que l'addition affichée tombe juste.
  const detail = detailArrondi(detailCalcul(affichee, dateDuJour))
  const seuil = donnees.seuilSecurite
  const sousLeSeuil = affichee.points.find((p) => p.solde < seuil)
  const leJour = (d: string) => `${nomJour(d)} ${formatDate(d).slice(0, 5)}`

  return (
    <div className="space-y-6">
      {/* La réponse, en une phrase */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-1.5">
          <p className="text-[19px] leading-snug">
            Dans {horizon} mois, le compte serait à <strong className="font-semibold tabular-nums">{formatEurosArrondis(fin.solde)}</strong>
            {avec && <span className="text-encre-2"> avec cette situation</span>}.
          </p>
          <p className="text-encre-2">
            Aujourd’hui : {formatEurosArrondis(base.soldeActuel)}. Moment le plus bas :{' '}
            <strong className={`font-semibold tabular-nums ${bas.solde < 0 ? 'text-alerte' : 'text-encre'}`}>{formatEurosArrondis(bas.solde)}</strong>, le {leJour(bas.date)}
            {avec && <span className="text-sourdine"> (au lieu de {formatEurosArrondis(base.pointBas.solde)} le {formatDate(base.pointBas.date).slice(0, 5)})</span>}.
          </p>
          {bas.solde < 0 ? (
            <p className="font-medium text-alerte">Le compte passerait à découvert.</p>
          ) : (
            sousLeSeuil && (
              <p className="font-medium text-attention">
                Attention : le compte passerait sous votre seuil de sécurité ({formatEurosArrondis(seuil)}) le {leJour(sousLeSeuil.date)}.
              </p>
            )
          )}
        </div>
        <Bascule valeur={horizon} onChange={setHorizon} options={[{ valeur: '3', libelle: '3 mois' }, { valeur: '6', libelle: '6 mois' }]} />
      </div>

      {/* Les questions « Et si… ? » */}
      <div className="grid items-start gap-3 md:grid-cols-2">
        <Question actif={retard.actif} onBasculer={() => setRetard({ ...retard, actif: !retard.actif })} libelle="Et si un gros client payait avec du retard ?">
          <select value={retard.client} onChange={(e) => setRetard({ ...retard, client: e.target.value })} className={`${champ} min-w-0 flex-1`} aria-label="Client">
            {clients.map(([c]) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={retard.jours} onChange={(e) => setRetard({ ...retard, jours: Number(e.target.value) })} className={`${champ} w-28 shrink-0`} aria-label="Retard">
            {[15, 30, 45, 60].map((j) => <option key={j} value={j}>{j} jours</option>)}
          </select>
        </Question>
        <Question actif={depense.actif} onBasculer={() => setDepense({ ...depense, actif: !depense.actif })} libelle="Et si une grosse dépense tombait ?">
          <input value={depense.libelle} onChange={(e) => setDepense({ ...depense, libelle: e.target.value })} className={`${champ} min-w-0 flex-1`} aria-label="Libellé" />
          <input value={depense.montant} onChange={(e) => setDepense({ ...depense, montant: e.target.value })} className={`${champ} w-24 text-right ${montantDepense ? '' : 'border-alerte'}`} aria-label="Montant en euros" />
          <input value={depense.date} onChange={(e) => setDepense({ ...depense, date: e.target.value })} className={`${champ} w-28 ${dateDepense ? '' : 'border-alerte'}`} aria-label="Date" />
        </Question>
      </div>

      {/* La courbe */}
      <section className="rounded-lg border border-filet bg-surface">
        <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-filet px-5 py-2">
          <h2 className="text-[15px] font-semibold">
            Évolution prévue du compte <span className="font-normal text-sourdine">· solde le plus bas de chaque semaine</span>
          </h2>
          {/* Légende hors de la courbe : rien ne peut chevaucher l'étiquette du point le plus bas. */}
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-encre-2">
            {avec && (
              <>
                <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4" style={{ backgroundColor: COULEUR_BASE }} />Prévision</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: COULEUR_SCENARIO }} />Avec cette situation</span>
              </>
            )}
            <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: COULEUR_SEUIL }} />Seuil de sécurité {formatEurosArrondis(seuil)}</span>
          </span>
        </div>
        <div className="px-5 pt-4 pb-3">
          <CourbeTresorerie base={base} scenario={avec} seuil={seuil} />
        </div>
      </section>

      {/* Le calcul, ligne par ligne */}
      <section className="rounded-lg border border-filet bg-surface px-5 py-4">
        <h2 className="text-[15px] font-semibold">
          Comment on arrive à {formatEurosArrondis(detail.soldeFinal)}
        </h2>
        <dl className="mt-2 max-w-2xl text-sm">
          <Ligne libelle="Sur le compte aujourd’hui" valeur={formatEurosArrondis(detail.soldeActuel)} fort />
          {Math.abs(detail.aujourdhui) >= 1 && (
            <Ligne libelle="Attendu aujourd’hui, pas encore passé (salaires du jour…)" valeur={signe(detail.aujourdhui)} />
          )}
          <Ligne
            libelle="Paiements des clients"
            detail={`contrats mensuels (${formatEurosArrondis(resume.rentreesFixes)} / mois) et ${resume.facturesNombre} facture${resume.facturesNombre > 1 ? 's' : ''} en attente (${formatEurosArrondis(resume.facturesTotal)}) ; une facture remplace le paiement habituel du mois, rien n’est compté deux fois`}
            valeur={signe(detail.paiementsClients)}
          />
          <Ligne libelle="Dépenses fixes" detail={`salaires, charges, abonnements : ${formatEurosArrondis(-resume.depensesFixes)} / mois`} valeur={signe(detail.depensesFixes)} />
          <Ligne libelle="Autres rentrées" detail={`moyenne des derniers mois : ${formatEurosArrondis(resume.encaissementsCourants)} / mois`} valeur={signe(detail.autresRentrees)} />
          <Ligne libelle="Dépenses courantes" detail={`carburant, fournitures… moyenne : ${formatEurosArrondis(-resume.depensesCourantes)} / mois`} valeur={signe(detail.depensesCourantes)} />
          {Math.abs(detail.exceptionnel) >= 1 && <Ligne libelle="Grosse dépense simulée" valeur={signe(detail.exceptionnel)} />}
          <Ligne libelle={`Dans ${horizon} mois`} valeur={formatEurosArrondis(detail.soldeFinal)} fort />
        </dl>
        {aVerifier > 0 && (
          <p className="mt-4 border-t border-filet pt-3 text-sm text-encre-2">
            {aVerifier} dépense{aVerifier > 1 ? 's' : ''} fixe{aVerifier > 1 ? 's' : ''} repérée{aVerifier > 1 ? 's' : ''} dans l’historique ne {aVerifier > 1 ? 'sont' : 'est'} pas encore comptée{aVerifier > 1 ? 's' : ''}.{' '}
            <button onClick={onVoirFixes} className="font-medium text-accent hover:underline">Les vérifier</button>
          </p>
        )}
      </section>
    </div>
  )
}

/** Une question « Et si… ? » : on l'active d'un clic, ses réglages n'apparaissent qu'alors. */
function Question({ actif, onBasculer, libelle, children }: { actif: boolean; onBasculer: () => void; libelle: string; children: ReactNode }) {
  return (
    <div className={`rounded-lg border bg-surface ${actif ? 'border-encre-2' : 'border-filet'}`}>
      <button onClick={onBasculer} aria-pressed={actif} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-survol">
        <span className={`grid size-4 shrink-0 place-items-center rounded border ${actif ? 'border-encre bg-encre' : 'border-filet-fort'}`}>
          {actif && (
            <svg viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.2" className="size-3"><path d="M3.5 8.5l3 3 6-7" /></svg>
          )}
        </span>
        <span className="font-medium">{libelle}</span>
      </button>
      {actif && <div className="flex flex-wrap items-center gap-2 border-t border-filet px-4 py-3">{children}</div>}
    </div>
  )
}

function signe(montant: number): string {
  return `${montant > 0 ? '+' : ''}${formatEurosArrondis(montant)}`
}

function Ligne({ libelle, detail, valeur, fort }: { libelle: string; detail?: string; valeur: string; fort?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-6 border-b border-filet py-2 last:border-b-0 ${fort ? 'font-semibold' : ''}`}>
      <dt className="min-w-0">
        <span className={fort ? 'text-encre' : 'text-encre-2'}>{libelle}</span>
        {detail && <span className="block text-xs font-normal text-sourdine">{detail}</span>}
      </dt>
      <dd className={`whitespace-nowrap tabular-nums ${fort ? '' : 'font-medium'}`}>{valeur}</dd>
    </div>
  )
}
