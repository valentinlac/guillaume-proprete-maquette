import { useState } from 'react'
import { useEtatDemo } from '../donnees/EtatDemo'
import { calculerIndicateurs, COUT_KM_DEFAUT } from '../indicateurs/rentabilite'
import type { Periode } from '../indicateurs/rentabilite'
import { Carte, Indicateur } from '../ui/Carte'
import { Bascule } from '../ui/Onglets'
import { PastilleAgent } from '../ui/statuts'
import { ajouterJours, dernierDuMois, formatDate, premierDuMois, annee, mois } from '../utils/dates'
import type { DateISO } from '../utils/dates'
import { formatEurosArrondis } from '../utils/format'

type ChoixPeriode = 'semaine' | 'mois' | 'prevu'

function periodeDe(choix: ChoixPeriode, dateDuJour: DateISO): Periode {
  if (choix === 'semaine') return { debut: ajouterJours(dateDuJour, -6), fin: dateDuJour }
  if (choix === 'mois') return { debut: premierDuMois(annee(dateDuJour), mois(dateDuJour)), fin: dateDuJour }
  return { debut: premierDuMois(annee(dateDuJour), mois(dateDuJour)), fin: dernierDuMois(annee(dateDuJour), mois(dateDuJour) + 1) }
}

const heures = (h: number) => `${h.toFixed(1).replace('.', ',')} h`

/** Indicateurs et rentabilité par journée et par agent. */
export function PageIndicateurs() {
  const { donnees, dateDuJour } = useEtatDemo()
  const [choix, setChoix] = useState<ChoixPeriode>('mois')
  const [coutKm, setCoutKm] = useState(COUT_KM_DEFAUT)
  const periode = periodeDe(choix, dateDuJour)
  const ind = calculerIndicateurs(donnees, periode, coutKm)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Indicateurs</h1>
          <p className="text-[13px] text-sourdine">
            Du {formatDate(periode.debut)} au {formatDate(periode.fin)}. Heures et chiffre d’affaires des journées faites, à partir du pointage des agents.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Bascule
            valeur={choix}
            onChange={setChoix}
            options={[
              { valeur: 'semaine', libelle: '7 derniers jours' },
              { valeur: 'mois', libelle: 'Mois en cours' },
              { valeur: 'prevu', libelle: 'Avec le prévu' },
            ]}
          />
          <label className="flex items-center gap-2 text-[13px] text-encre-2">
            Coût au km
            <input
              type="number"
              step="0.05"
              min="0"
              value={coutKm}
              onChange={(e) => setCoutKm(Number(e.target.value) || 0)}
              className="h-8 w-20 rounded-md border border-filet-fort bg-surface px-2 text-sm tabular-nums"
            />
            €
          </label>
        </div>
      </div>

      <Carte>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Indicateur libelle="Chiffre d’affaires réalisé" valeur={formatEurosArrondis(ind.caRealise)} />
          <Indicateur libelle="Heures réelles" valeur={heures(ind.heuresReelles)} detail="route comprise" />
          <Indicateur libelle="Vitreries décalées" valeur={ind.vitreriesDecalees} detail="pluie ou déplacement" />
          <Indicateur
            libelle="Journées déficitaires"
            valeur={<span className={ind.journeesDeficitaires ? 'text-alerte' : ''}>{ind.journeesDeficitaires}</span>}
            detail={`sur ${ind.journees.length} journées`}
          />
        </div>
      </Carte>

      <Carte titre="Par agent" sansMarge>
        <table className="w-full text-sm">
          <thead className="text-left text-[13px] text-sourdine">
            <tr className="border-b border-filet">
              <th className="px-5 py-2 font-medium">Agent</th>
              <th className="px-3 py-2 text-right font-medium">Taux horaire</th>
              <th className="px-3 py-2 text-right font-medium">Journées</th>
              <th className="px-3 py-2 text-right font-medium">Heures réelles</th>
              <th className="px-3 py-2 text-right font-medium">CA réalisé</th>
              <th className="px-5 py-2 text-right font-medium">Marge</th>
            </tr>
          </thead>
          <tbody>
            {ind.parAgent.map((a) => (
              <tr key={a.agent.id} className="border-b border-filet last:border-b-0">
                <td className="px-5 py-2.5">
                  <span className="flex items-center gap-2 font-medium"><PastilleAgent couleur={a.agent.couleur} />{a.agent.nom}</span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{a.agent.tauxHoraire.toFixed(2).replace('.', ',')} €</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{a.journees}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{heures(a.heures)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatEurosArrondis(a.ca)}</td>
                <td className={`px-5 py-2.5 text-right font-medium tabular-nums ${a.marge < 0 ? 'text-alerte' : ''}`}>{formatEurosArrondis(a.marge)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Carte>

      <Carte titre="Rentabilité par journée" sansMarge>
        <p className="border-b border-filet px-5 py-2.5 text-[13px] text-sourdine">
          Marge = chiffre d’affaires de la journée − taux horaire × heures (route comprise) − kilomètres × coût au km.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[13px] text-sourdine">
              <tr className="border-b border-filet">
                <th className="px-5 py-2 font-medium">Jour</th>
                <th className="px-3 py-2 font-medium">Agent</th>
                <th className="px-3 py-2 text-right font-medium">Passages</th>
                <th className="px-3 py-2 text-right font-medium">CA</th>
                <th className="px-3 py-2 text-right font-medium">Heures</th>
                <th className="px-3 py-2 text-right font-medium">Main-d’œuvre</th>
                <th className="px-3 py-2 text-right font-medium">Km</th>
                <th className="px-3 py-2 text-right font-medium">Déplacements</th>
                <th className="px-5 py-2 text-right font-medium">Marge</th>
              </tr>
            </thead>
            <tbody>
              {ind.journees.map((j) => (
                <tr key={`${j.date}-${j.agent.id}`} className={`border-b border-filet last:border-b-0 ${j.marge < 0 ? 'bg-alerte-doux' : ''}`}>
                  <td className="px-5 py-2 whitespace-nowrap tabular-nums">
                    {formatDate(j.date).slice(0, 5)}
                    {j.prevue && <span className="ml-2 text-xs text-sourdine">prévu</span>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="flex items-center gap-2"><PastilleAgent couleur={j.agent.couleur} />{j.agent.nom}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{j.passages}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatEurosArrondis(j.ca)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{heures(j.heures)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-encre-2">{formatEurosArrondis(j.coutMainOeuvre)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-encre-2">{Math.round(j.km)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-encre-2">{formatEurosArrondis(j.coutDeplacements)}</td>
                  <td className={`px-5 py-2 text-right font-medium whitespace-nowrap tabular-nums ${j.marge < 0 ? 'text-alerte' : ''}`}>
                    {formatEurosArrondis(j.marge)}
                    {j.marge < 0 && <span className="ml-1.5 text-xs">déficitaire</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Carte>
    </div>
  )
}
