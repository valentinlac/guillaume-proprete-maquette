import { describe, expect, it } from 'vitest'
import { chargerJeux } from '../donnees/chargement'
import { creerHasard } from '../donnees/hasard'
import type { Intervention, JeuDeDonnees } from '../donnees/types'
import { distanceVolOiseauKm, serviceTrajet } from '../trajets/tempsTrajet'
import { ecartJours } from '../utils/dates'
import { estJourTravaille, prochainJourTravaille } from './calendrierTravail'
import { appliquerCreneau, periodesDeRecherche, replacerEnSerie, tourneeDuJour, trouverCreneaux } from './creneaux'
import type { ContexteCreneaux, DemandeCreneau } from './creneaux'
import { planningInitial } from './tournees'
import { verifierPlanning } from './verifications'

const AUJOURDHUI = '2026-10-28'
const DEMAIN = '2026-10-29'
const FENETRE = { debut: '2026-10-30', fin: '2026-11-30' }
const jeux = chargerJeux(AUJOURDHUI)

function contexte(jeu: JeuDeDonnees, interventions?: Intervention[]): ContexteCreneaux {
  return {
    depot: jeu.entite.depot,
    clients: jeu.clients,
    agents: jeu.agents,
    interventions: interventions ?? planningInitial({ depot: jeu.entite.depot, clients: jeu.clients, agents: jeu.agents }, AUJOURDHUI).interventions,
    dateDuJour: AUJOURDHUI,
  }
}

/** Planning après « Annuler la journée de demain (pluie) ». */
function apresPluie(ctx: ContexteCreneaux) {
  const interventions = ctx.interventions.map((i) => (i.date === DEMAIN ? { ...i, statut: 'annulee_meteo' as const } : i))
  const demandes: DemandeCreneau[] = interventions
    .filter((i) => i.statut === 'annulee_meteo')
    .map((i) => ({ clientId: i.clientId, interventionId: i.id, fenetre: FENETRE, joursExclus: [DEMAIN] }))
  return { ctx: { ...ctx, interventions }, demandes }
}

describe('trouver un créneau : règles de base (Valence)', () => {
  const ctx = contexte(jeux.valence)
  const nom = (id: string) => jeux.valence.clients.find((c) => c.id === id)!.nom
  // Un passage de chaque client de Valence, à placer en novembre.
  const demandes: DemandeCreneau[] = jeux.valence.clients.map((c) => ({ clientId: c.id, fenetre: { debut: '2026-11-02', fin: '2026-11-30' } }))

  it.each(demandes.map((d) => [nom(d.clientId), d] as const))('%s : 3 propositions valides', (_, demande) => {
    const props = trouverCreneaux(ctx, demande)
    expect(props).toHaveLength(3)
    // Distinctes, triées par score
    expect(new Set(props.map((p) => `${p.date}|${p.agentId}`)).size).toBe(3)
    for (let k = 1; k < props.length; k++) expect(props[k].score).toBeGreaterThanOrEqual(props[k - 1].score)

    const autresDates = ctx.interventions.filter((i) => i.clientId === demande.clientId).map((i) => i.date)
    for (const p of props) {
      expect(p.date >= demande.fenetre.debut && p.date <= demande.fenetre.fin).toBe(true)
      expect(p.date > AUJOURDHUI).toBe(true)
      expect(estJourTravaille(p.date)).toBe(true)
      for (const d of autresDates) expect(Math.abs(ecartJours(d, p.date))).toBeGreaterThanOrEqual(3) // jamais deux passages rapprochés
      expect(p.chargeApresMin).toBeLessThanOrEqual(p.capaciteMin)
      expect(p.raison.length).toBeGreaterThan(10)
      // Appliquer la proposition donne un planning sans anomalie.
      const apres = appliquerCreneau(ctx, demande, p)
      expect(verifierPlanning(ctx, apres)).toEqual([])
      expect(apres).toHaveLength(ctx.interventions.length + 1)
    }
  })

  it('regarde les deux agents : chacun apparaît dans les propositions', () => {
    for (const d of demandes) {
      const agents = new Set(trouverCreneaux(ctx, d).map((p) => p.agentId))
      expect(agents.size, nom(d.clientId)).toBe(2)
    }
  })

  it('affiche une raison exacte : le temps de route annoncé est celui du trajet réel', () => {
    const service = serviceTrajet()
    for (const d of demandes) {
      for (const p of trouverCreneaux(ctx, d)) {
        const tournee = tourneeDuJour(ctx.interventions, p.date, p.agentId)
        const client = jeux.valence.clients.find((c) => c.id === d.clientId)!
        const depart = p.position === 0 ? jeux.valence.entite.depot : jeux.valence.clients.find((c) => c.id === tournee[p.position - 1].clientId)!
        expect(p.routeAvantMin).toBe(service.minutesEntre(depart, client))
        if (p.precedent) {
          expect(p.raison).toBe(`${p.routeAvantMin} min de route depuis ${p.precedent}`)
        } else {
          expect(p.raison).toContain(`${p.routeAvantMin} min`)
          expect(p.raison).toContain('dépôt')
        }
      }
    }
  })

  it('privilégie la proximité : la 1re proposition fait partie des détours les plus faibles', () => {
    for (const d of demandes) {
      const toutes = trouverCreneaux(ctx, d, { nombre: 999 })
      const meilleure = trouverCreneaux(ctx, d)[0]
      const detours = toutes.map((p) => p.detourMin).sort((a, b) => a - b)
      const quartile = detours[Math.floor(detours.length / 4)]
      expect(meilleure.detourMin, nom(d.clientId)).toBeLessThanOrEqual(quartile)
    }
  })

  it('ne sort du secteur que si cela fait moins de route que toute option dans le secteur', () => {
    const depot = jeux.valence.entite.depot
    for (const d of demandes) {
      const client = jeux.valence.clients.find((c) => c.id === d.clientId)!
      const dansSecteur = (p: { journeeVide: boolean; voisin: { km: number } | null }) =>
        p.journeeVide || p.voisin!.km <= 10 || distanceVolOiseauKm(depot, client) <= 10
      const premier = trouverCreneaux(ctx, d)[0]
      if (dansSecteur(premier)) continue
      const alternatives = trouverCreneaux(ctx, d, { nombre: 999 }).filter(dansSecteur)
      for (const alt of alternatives) expect(premier.detourMin, `${nom(d.clientId)} : ${premier.raison}`).toBeLessThan(alt.detourMin)
    }
  })

  it('ne modifie jamais le planning tant que l’utilisateur n’a pas choisi', () => {
    const avant = structuredClone(ctx.interventions)
    for (const d of demandes.slice(0, 10)) trouverCreneaux(ctx, d)
    expect(ctx.interventions).toEqual(avant)
  })

  it('exclut les jours demandés et les jours passés', () => {
    const d = { ...demandes[0], fenetre: { debut: '2026-10-01', fin: '2026-11-30' }, joursExclus: ['2026-10-30'] }
    for (const p of trouverCreneaux(ctx, d, { nombre: 999 })) {
      expect(p.date > AUJOURDHUI).toBe(true)
      expect(p.date).not.toBe('2026-10-30')
    }
  })

  it('ne propose aucun agent dont la journée déborderait, et rien si personne n’a la place', () => {
    const glycines = { clientId: 'c06', fenetre: { debut: '2026-11-02', fin: '2026-11-30' } } // passage de 4 h
    // Agents limités à 3 h : un passage de 4 h ne rentre nulle part.
    const agents3h = jeux.valence.agents.map((a) => ({ ...a, heuresMaxJour: 3 }))
    expect(trouverCreneaux({ ...ctx, agents: agents3h }, glycines, { nombre: 999 })).toEqual([])
    // Un seul agent à 3 h : seul l’autre est proposé.
    const unSeul = [jeux.valence.agents[0], { ...jeux.valence.agents[1], heuresMaxJour: 3 }]
    const props = trouverCreneaux({ ...ctx, agents: unSeul }, glycines, { nombre: 999 })
    expect(props.length).toBeGreaterThan(0)
    expect(props.every((p) => p.agentId === unSeul[0].id && p.chargeApresMin <= 420)).toBe(true)
    // Jour férié seul : aucune proposition.
    expect(trouverCreneaux(ctx, { clientId: 'c06', fenetre: { debut: '2026-11-11', fin: '2026-11-11' } })).toEqual([])
  })

  it('déplace une intervention existante : statut « replanifiée » et date d’origine conservée', () => {
    // Le 1er passage d'une journée qui en compte plusieurs : la journée quittée doit être recalculée.
    const existante = ctx.interventions.find(
      (i) => i.date.startsWith('2026-11') && i.ordre === 1 && ctx.interventions.some((x) => x.date === i.date && x.agentId === i.agentId && x.ordre === 3),
    )!
    const demande = { clientId: existante.clientId, interventionId: existante.id, fenetre: { debut: '2026-11-02', fin: '2026-11-30' }, joursExclus: [existante.date] }
    const p = trouverCreneaux(ctx, demande)[0]
    const apres = appliquerCreneau(ctx, demande, p)
    const deplacee = apres.find((i) => i.id === existante.id)!
    expect(apres).toHaveLength(ctx.interventions.length)
    expect(deplacee).toMatchObject({ date: p.date, agentId: p.agentId, statut: 'replanifiee', dateOrigine: existante.date })
    expect(deplacee.debutMin).toBe(p.debutMin)
    expect(verifierPlanning(ctx, apres)).toEqual([])
  })
})

describe.each(Object.values(jeux).map((j) => [j.entite.id, j] as const))('annulation météo puis replacement (%s)', (_, jeu) => {
  const base = contexte(jeu)
  const { ctx, demandes } = apresPluie(base)

  it('a des passages à replacer demain', () => {
    expect(demandes.length).toBeGreaterThan(0)
  })

  it('replace tous les passages annulés, après le jour annulé, sans anomalie', () => {
    const { replacements, interventions } = replacerEnSerie(ctx, demandes)
    expect(replacements).toHaveLength(demandes.length)
    for (const r of replacements) {
      expect(r.retenue, r.demande.clientId).not.toBeNull()
      expect(r.propositions.length).toBeGreaterThan(0)
      expect(r.retenue!.date > DEMAIN).toBe(true)
    }
    expect(interventions.filter((i) => i.statut === 'annulee_meteo')).toEqual([])
    expect(interventions.filter((i) => i.statut === 'replanifiee')).toHaveLength(demandes.length)
    expect(interventions.filter((i) => i.statut === 'replanifiee').every((i) => i.dateOrigine === DEMAIN)).toBe(true)
    expect(interventions).toHaveLength(ctx.interventions.length)
    expect(verifierPlanning(ctx, interventions)).toEqual([])
    // L’heure et l’explication affichées décrivent le planning final.
    for (const r of replacements) {
      const finale = interventions.find((i) => i.id === r.demande.interventionId)!
      expect(finale.debutMin).toBe(r.retenue!.debutMin)
      const precedente = interventions.find((i) => i.date === finale.date && i.agentId === finale.agentId && i.ordre === finale.ordre - 1 && i.statut !== 'annulee_meteo')
      expect(r.retenue!.precedent).toBe(precedente ? jeu.clients.find((c) => c.id === precedente.clientId)!.nom : null)
    }
  })

  it('ne reporte pas un passage à plus de 3 semaines quand un jour proche est libre', () => {
    const { replacements } = replacerEnSerie(ctx, demandes)
    for (const r of replacements) {
      const plusTot = r.propositions.reduce((min, p) => (p.date < min ? p.date : min), r.retenue!.date)
      expect(ecartJours(DEMAIN, r.retenue!.date) <= 21 || plusTot === r.retenue!.date, r.demande.clientId).toBe(true)
    }
  })

  it('ne touche pas au planning tant que l’utilisateur n’a pas confirmé', () => {
    const avant = structuredClone(ctx.interventions)
    replacerEnSerie(ctx, demandes)
    expect(ctx.interventions).toEqual(avant)
  })

  it('remplit d’abord le reste du mois quand c’est possible', () => {
    const { replacements } = replacerEnSerie(ctx, demandes)
    const lendemain = prochainJourTravaille(DEMAIN)
    expect(replacements.some((r) => r.retenue!.date === lendemain)).toBe(true)
  })
})

describe('trouver un créneau : endurance', () => {
  it('reste cohérent après 150 placements successifs au hasard', () => {
    const jeu = jeux.valence
    let ctx = contexte(jeu)
    const h = creerHasard(42)
    let places = 0
    for (let k = 0; k < 150; k++) {
      const client = h.choisir(jeu.clients)
      const demande = { clientId: client.id, fenetre: { debut: '2026-11-02', fin: '2026-11-30' } }
      const props = trouverCreneaux(ctx, demande)
      if (!props.length) continue
      const choix = h.choisir(props) // l’utilisateur choisit n’importe laquelle des 3
      ctx = { ...ctx, interventions: appliquerCreneau(ctx, demande, choix) }
      places++
    }
    expect(places).toBeGreaterThan(30)
    expect(verifierPlanning(ctx, ctx.interventions)).toEqual([])
  })

  it('répond en moins de 100 ms', () => {
    const ctx = contexte(jeux.valence)
    const debut = performance.now()
    trouverCreneaux(ctx, { clientId: 'c06', fenetre: FENETRE })
    expect(performance.now() - debut).toBeLessThan(100)
  })
})

describe('périodes de recherche', () => {
  it('commencent toutes après aujourd’hui et couvrent le mois en cours et le suivant', () => {
    const p = Object.fromEntries(periodesDeRecherche(AUJOURDHUI).map((x) => [x.id, x]))
    expect(p.tout.fenetre).toEqual({ debut: '2026-10-29', fin: '2026-11-30' })
    expect(p.semaine.fenetre).toEqual({ debut: '2026-10-29', fin: '2026-11-04' })
    expect(p.mois.fenetre).toEqual({ debut: '2026-10-29', fin: '2026-10-31' })
    expect(p.suivant.fenetre).toEqual({ debut: '2026-11-01', fin: '2026-11-30' })
    expect(p.suivant.libelle).toBe('Le mois prochain (novembre 2026)')
  })
})
