import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DateISO } from '../../donnees/types'
import { minimumsHebdomadaires } from '../../tresorerie/prevision'
import type { EvenementPrevu, Prevision } from '../../tresorerie/prevision'
import { ajouterJours, formatDate, mois, nomMoisCourt } from '../../utils/dates'
import { formatEuros, formatEurosArrondis } from '../../utils/format'

/** Couleurs validées (contraste et daltonisme) ; la situation simulée est aussi en pointillés. */
export const COULEUR_BASE = '#2f5fb3'
export const COULEUR_SCENARIO = '#c2602a'
export const COULEUR_SEUIL = '#8f5a00'

interface Point {
  /** Lundi de la semaine. */
  date: DateISO
  base: number
  scenario?: number
}

/**
 * Courbe du compte : un point par semaine, au solde le plus bas de la semaine
 * (plus lisible qu'une courbe jour par jour, et le moment le plus bas reste exact).
 */
export function CourbeTresorerie({ base, scenario, seuil }: { base: Prevision; scenario: Prevision | null; seuil: number }) {
  const semainesScenario = new Map(scenario ? minimumsHebdomadaires(scenario.points).map((p) => [p.date, p.solde]) : [])
  const donnees: Point[] = minimumsHebdomadaires(base.points).map((p) => ({ date: p.date, base: p.solde, scenario: semainesScenario.get(p.date) }))

  const affichee = scenario ?? base
  const bas = affichee.pointBas
  const semaineDuBas = donnees.reduce((choisie, p) => (p.date <= bas.date ? p : choisie), donnees[0])
  const evenementsDeLaSemaine = (lundi: DateISO): EvenementPrevu[] =>
    affichee.evenements.filter((e) => e.date >= lundi && e.date <= ajouterJours(lundi, 6) && e.type !== 'variable')

  // Repères de mois : la première semaine de chaque nouveau mois (le mois en cours, déjà entamé, n'en a pas).
  const reperes = donnees.filter((p, k) => k > 0 && mois(p.date) !== mois(donnees[k - 1].date)).map((p) => p.date)
  const minimum = Math.min(...donnees.map((p) => Math.min(p.base, p.scenario ?? Infinity)))

  return (
    <div
      className="h-56 w-full md:h-60"
      role="img"
      aria-label={`Évolution prévue du compte, de ${formatEurosArrondis(base.soldeActuel)} aujourd’hui ; plus bas ${formatEurosArrondis(bas.solde)} le ${formatDate(bas.date)}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={donnees} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#e6e3db" vertical={false} />
          <XAxis
            dataKey="date"
            ticks={reperes}
            tickFormatter={(d: string) => nomMoisCourt(mois(d))}
            tick={{ fontSize: 12, fill: '#7d796f' }}
            axisLine={{ stroke: '#cfcbc0' }}
            tickLine={false}
          />
          <YAxis
            // L'axe part de 0 ; il ne descend en dessous (avec une marge pour l'étiquette du plus bas) que si le compte devient négatif.
            domain={[minimum >= 0 ? 0 : Math.floor((minimum - 4000) / 5000) * 5000, 'auto']}
            tickFormatter={(v: number) => `${(v / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k€`}
            tick={{ fontSize: 12, fill: '#7d796f' }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <ReferenceLine y={0} stroke="#cfcbc0" />
          {/* Seuil de sécurité : nommé dans la légende au-dessus de la courbe. */}
          <ReferenceLine y={seuil} stroke={COULEUR_SEUIL} strokeDasharray="4 4" />
          <Tooltip
            cursor={{ stroke: '#7d796f', strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload as Point
              const evenements = evenementsDeLaSemaine(p.date)
              return (
                <div className="max-w-xs rounded-lg border border-filet bg-surface px-3 py-2 text-xs shadow-lg">
                  <div className="mb-1 font-semibold text-encre">Semaine du {formatDate(p.date).slice(0, 5)}</div>
                  <div className="flex items-center gap-2 text-encre-2">
                    <span className="h-0.5 w-3" style={{ backgroundColor: COULEUR_BASE }} /> Au plus bas : <span className="font-semibold tabular-nums">{formatEurosArrondis(p.base)}</span>
                  </div>
                  {p.scenario !== undefined && (
                    <div className="flex items-center gap-2 text-encre-2">
                      <span className="h-0.5 w-3 border-t-2 border-dashed" style={{ borderColor: COULEUR_SCENARIO }} /> Avec cette situation : <span className="font-semibold tabular-nums">{formatEurosArrondis(p.scenario)}</span>
                    </div>
                  )}
                  {evenements.slice(0, 4).map((e, k) => (
                    <div key={k} className="mt-0.5 flex justify-between gap-3 text-sourdine">
                      <span className="truncate">{e.libelle}</span>
                      <span className="tabular-nums">{formatEuros(e.montant)}</span>
                    </div>
                  ))}
                </div>
              )
            }}
          />
          <Line type="monotone" dataKey="base" name="Prévision" stroke={COULEUR_BASE} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
          {scenario && (
            <Line type="monotone" dataKey="scenario" name="Avec cette situation" stroke={COULEUR_SCENARIO} strokeWidth={2} strokeDasharray="6 4" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
          )}
          <ReferenceDot
            x={semaineDuBas.date}
            y={bas.solde}
            r={5}
            fill={scenario ? COULEUR_SCENARIO : COULEUR_BASE}
            stroke="#fff"
            strokeWidth={2}
            label={(props: { viewBox?: { x?: number; y?: number } }) => {
              // Sous le point : c'est le plus bas, aucune courbe ne passe en dessous. Aligné pour ne pas sortir du cadre.
              const x = props.viewBox?.x ?? 0
              const y = props.viewBox?.y ?? 0
              const position = donnees.indexOf(semaineDuBas) / Math.max(1, donnees.length - 1)
              const ancre = position < 0.15 ? 'start' : position > 0.85 ? 'end' : 'middle'
              return (
                <text
                  x={x + (ancre === 'start' ? -6 : ancre === 'end' ? 6 : 0)}
                  y={y + 20}
                  textAnchor={ancre}
                  fontSize={12}
                  fontWeight={600}
                  fill="#1c1b18"
                  stroke="#fff"
                  strokeWidth={4}
                  paintOrder="stroke"
                >
                  Plus bas : {formatEurosArrondis(bas.solde)} le {formatDate(bas.date).slice(0, 5)}
                </text>
              )
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
