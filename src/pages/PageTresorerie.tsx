import { useState } from 'react'
import { useEtatDemo } from '../donnees/EtatDemo'
import { totauxDuMois } from '../tresorerie/calculs'
import { attendusAujourdhui, recurrentsAvecDecisions } from '../tresorerie/recurrents'
import { Onglets } from '../ui/Onglets'
import { annee, mois, nomMois } from '../utils/dates'
import { formatEurosArrondis } from '../utils/format'
import { BandeauSellsy } from './tresorerie/BandeauSellsy'
import { FacturesAEncaisser } from './tresorerie/FacturesAEncaisser'
import { Journal } from './tresorerie/Journal'
import { OngletPrevision } from './tresorerie/OngletPrevision'
import { PrevuContreReel } from './tresorerie/PrevuContreReel'
import { Recurrents } from './tresorerie/Recurrents'
import { ReleveDuJour } from './tresorerie/ReleveDuJour'
import { SaisieDuJour } from './tresorerie/SaisieDuJour'
import { classerReleve } from '../tresorerie/releve'

type Vue = 'prevision' | 'saisie' | 'fixes'

/**
 * Trésorerie en trois onglets, un rôle chacun :
 * Prévision (où en sera le compte ?), Saisie (le quotidien), Dépenses fixes (ce qui revient chaque mois).
 */
export function PageTresorerie() {
  const { donnees, dateDuJour } = useEtatDemo()
  const [vue, setVue] = useState<Vue>('prevision')
  const recurrents = recurrentsAvecDecisions(donnees.mouvements, donnees.decisionsRecurrents)
  const aVerifier = recurrents.filter((r) => r.statut === 'propose').length
  const releve = classerReleve(donnees)
  const totaux = totauxDuMois(donnees.mouvements, dateDuJour.slice(0, 7), dateDuJour)
  const moisCourant = nomMois(annee(dateDuJour), mois(dateDuJour)).split(' ')[0]

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[22px] font-semibold tracking-tight">Trésorerie</h1>
        <BandeauSellsy />
      </header>

      <div className="mt-6">
        <Onglets<Vue>
          valeur={vue}
          onChange={setVue}
          options={[
            { valeur: 'prevision', libelle: 'Prévision' },
            {
              valeur: 'saisie',
              libelle: (
                <span className="flex items-center gap-1.5">
                  Saisie du jour
                  {releve.length > 0 && <span className="rounded bg-accent-doux px-1.5 text-xs font-medium text-accent">{releve.length}<span className="hidden sm:inline"> à valider</span></span>}
                </span>
              ),
            },
            {
              valeur: 'fixes',
              libelle: (
                <span className="flex items-center gap-1.5">
                  Dépenses fixes
                  {aVerifier > 0 && <span className="rounded bg-accent-doux px-1.5 text-xs font-medium text-accent">{aVerifier}<span className="hidden sm:inline"> à vérifier</span></span>}
                </span>
              ),
            },
          ]}
        />
      </div>

      <div className="mt-6">
        {vue === 'prevision' && <OngletPrevision recurrents={recurrents} onVoirFixes={() => setVue('fixes')} />}

        {vue === 'saisie' && (
          <div className="space-y-6">
            <p className="text-encre-2">
              En {moisCourant} : <strong className="font-semibold text-encre tabular-nums">{formatEurosArrondis(totaux.entrees)}</strong> d’entrées et{' '}
              <strong className="font-semibold text-encre tabular-nums">{formatEurosArrondis(-totaux.sorties)}</strong> de sorties.
            </p>
            <ReleveDuJour />
            {/* Les mouvements déjà présents dans le relevé ne sont pas redemandés en saisie. */}
            <SaisieDuJour attendus={attendusAujourdhui(donnees.mouvements, recurrents, dateDuJour).filter((r) => !releve.some((l) => l.tiers === r.tiers))} />
            <Journal />
          </div>
        )}

        {vue === 'fixes' && (
          <div className="space-y-6">
            <div className="grid gap-6 [&>*]:min-w-0 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <Recurrents recurrents={recurrents} />
              <FacturesAEncaisser factures={donnees.factures} scenario={null} />
            </div>
            <PrevuContreReel recurrents={recurrents} />
          </div>
        )}
      </div>
    </div>
  )
}
