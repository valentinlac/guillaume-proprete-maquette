import { describe, expect, it } from 'vitest'
import { chargerJeux } from '../donnees/chargement'
import type { JeuDeDonnees } from '../donnees/types'
import { formatDate } from '../utils/dates'
import { appliquerCreneau, trouverCreneaux } from './creneaux'
import {
  preparerJourneePluie,
  validerJourneePluie,
  annulerJournee,
  changementsParAgent,
  demandesDeReplacement,
  laisserAnnule,
  nombreDeChangements,
  passagesAReplacer,
  proposerReplacements,
  retablirJournee,
} from './meteo'
import { verifierPlanning } from './verifications'
import { clientsAPrevenir } from './messages'

const AUJOURDHUI = '2026-10-28'
const DEMAIN = '2026-10-29'
const jeux = chargerJeux(AUJOURDHUI)
const ctxDe = (j: JeuDeDonnees, interventions = j.interventions) => ({
  depot: j.entite.depot,
  clients: j.clients,
  agents: j.agents,
  interventions,
  dateDuJour: AUJOURDHUI,
})

describe.each(Object.keys(jeux))('annulation météo (%s)', (id) => {
  const jeu = jeux[id]
  const annule = annulerJournee(jeu.interventions, DEMAIN)

  it('annule uniquement les passages à faire de la journée', () => {
    const duJour = jeu.interventions.filter((i) => i.date === DEMAIN)
    expect(duJour.length).toBeGreaterThan(0)
    expect(passagesAReplacer(annule).map((i) => i.id).sort()).toEqual(duJour.map((i) => i.id).sort())
    expect(annule.filter((i) => i.date !== DEMAIN)).toEqual(jeu.interventions.filter((i) => i.date !== DEMAIN))
  })

  it('peut être rétablie à l’identique', () => {
    expect(retablirJournee(annule, DEMAIN)).toEqual(jeu.interventions)
  })

  it('cherche un créneau du lendemain à la fin du mois suivant, sans la journée annulée', () => {
    for (const d of demandesDeReplacement(annule, AUJOURDHUI)) {
      expect(d.fenetre).toEqual({ debut: '2026-10-30', fin: '2026-11-30' })
      expect(d.joursExclus).toEqual([DEMAIN])
    }
  })

  it('propose un replacement valide pour chaque passage, sans rien modifier', () => {
    const avant = structuredClone(annule)
    const { replacements, interventions } = proposerReplacements(ctxDe(jeu, annule))
    expect(annule).toEqual(avant)
    expect(replacements.every((r) => r.retenue && r.retenue.date > DEMAIN)).toBe(true)
    expect(passagesAReplacer(interventions)).toEqual([])
    expect(verifierPlanning(ctxDe(jeu), interventions)).toEqual([])
  })

  it('laisse l’utilisateur changer un replacement ou le retirer', () => {
    const { replacements, interventions: brouillon } = proposerReplacements(ctxDe(jeu, annule))
    const r = replacements[0]
    // Changer : on reprend « Trouver un créneau » sur le brouillon, en ignorant la place actuelle.
    const actuelle = brouillon.find((i) => i.id === r.demande.interventionId)!
    const autres = trouverCreneaux(ctxDe(jeu, brouillon), { ...r.demande, joursExclus: [DEMAIN, actuelle.date] })
    expect(autres.length).toBeGreaterThan(0)
    const change = appliquerCreneau(ctxDe(jeu, brouillon), r.demande, autres[0])
    expect(change.find((i) => i.id === actuelle.id)!.date).toBe(autres[0].date)
    expect(verifierPlanning(ctxDe(jeu), change)).toEqual([])
    // Retirer : le passage redevient annulé à sa date d'origine.
    const original = annule.find((i) => i.id === actuelle.id)!
    const retire = laisserAnnule(ctxDe(jeu), change, original)
    expect(retire.find((i) => i.id === actuelle.id)).toEqual(original)
    expect(verifierPlanning(ctxDe(jeu), retire)).toEqual([])
  })
})

describe('envoi aux agents', () => {
  const jeu = jeux.valence
  const annule = annulerJournee(jeu.interventions, DEMAIN)
  const { interventions: apres } = proposerReplacements(ctxDe(jeu, annule))

  it('ne signale rien quand rien n’a changé', () => {
    expect(nombreDeChangements(changementsParAgent(jeu.interventions, jeu.interventions, jeu.agents, AUJOURDHUI))).toBe(0)
  })

  it('signale les passages retirés pour la pluie et les passages ajoutés ailleurs', () => {
    const c = changementsParAgent(jeu.interventions, apres, jeu.agents, AUJOURDHUI)
    const tous = [...c.values()].flat()
    const annules = jeu.interventions.filter((i) => i.date === DEMAIN)
    for (const i of annules) {
      const replace = apres.find((x) => x.id === i.id)!
      expect(tous.some((x) => x.type === 'retrait' && x.intervention.id === i.id && x.motif === `déplacé au ${formatDate(replace.date)}`)).toBe(true)
      expect(c.get(replace.agentId)!.some((x) => x.type === 'ajout' && x.intervention.id === i.id)).toBe(true)
    }
  })

  it('signale les horaires décalés dans les journées qui reçoivent un passage', () => {
    const tous = [...changementsParAgent(jeu.interventions, apres, jeu.agents, AUJOURDHUI).values()].flat()
    for (const h of tous.filter((x) => x.type === 'horaire')) {
      const avant = jeu.interventions.find((i) => i.id === h.intervention.id)!
      expect(h.ancienDebutMin).toBe(avant.debutMin)
      expect(h.intervention.debutMin).not.toBe(avant.debutMin)
    }
  })

  it('signale un passage annulé non replacé comme « annulé (météo) »', () => {
    const c = [...changementsParAgent(jeu.interventions, annule, jeu.agents, AUJOURDHUI).values()].flat()
    expect(c.length).toBe(jeu.interventions.filter((i) => i.date === DEMAIN).length)
    expect(c.every((x) => x.type === 'retrait' && x.motif === 'annulé (météo)')).toBe(true)
  })

  it('ignore le passé', () => {
    const passe = jeu.interventions.map((i) => (i.date < AUJOURDHUI ? { ...i, debutMin: i.debutMin + 5 } : i))
    expect(nombreDeChangements(changementsParAgent(jeu.interventions, passe, jeu.agents, AUJOURDHUI))).toBe(0)
  })
})

describe.each(Object.keys(jeux))('pluie en un clic (%s)', (id) => {
  const jeu = jeux[id]

  it('prépare tout sans rien modifier', () => {
    const avant = structuredClone(jeu)
    const p = preparerJourneePluie(jeu, DEMAIN, AUJOURDHUI)
    expect(jeu).toEqual(avant)
    expect(p.annules.length).toBe(jeu.interventions.filter((i) => i.date === DEMAIN).length)
    expect(p.replacements.every((r) => r.retenue)).toBe(true)
    expect(verifierPlanning(ctxDe(jeu), p.interventions)).toEqual([])
  })

  it('valide tout d’un coup : planning enregistré, clients prévenus, agents à jour', () => {
    const p = preparerJourneePluie(jeu, DEMAIN, AUJOURDHUI)
    const apres = validerJourneePluie(jeu, p.interventions, AUJOURDHUI)
    expect(apres.interventions).toEqual(p.interventions)
    expect(passagesAReplacer(apres.interventions)).toEqual([])
    const meteo = clientsAPrevenir(apres, AUJOURDHUI).filter((x) => x.modele === 'annulation_meteo')
    expect(meteo).toHaveLength(p.annules.length)
    expect(meteo.every((x) => x.dejaPrevenu)).toBe(true)
    expect(nombreDeChangements(changementsParAgent(apres.interventionsEnvoyees, apres.interventions, jeu.agents, AUJOURDHUI))).toBe(0)
  })
})

describe.each(Object.keys(jeux))('agent habituel (%s)', (id) => {
  const jeu = jeux[id]

  it('pluie de demain : chaque client reste avec son agent, sinon le changement est expliqué', () => {
    const p = preparerJourneePluie(jeu, DEMAIN, AUJOURDHUI)
    for (const original of p.annules) {
      const r = p.replacements.find((x) => x.demande.interventionId === original.id)!
      expect(r.retenue).not.toBeNull()
      if (r.retenue!.agentId !== original.agentId) expect(r.retenue!.changementAgent).toMatch(/remplace .*, l’agent habituel de ce client : /)
      else expect(r.retenue!.changementAgent).toBeUndefined()
    }
    // Sur les données de démo, aucun échange de secteur n'est nécessaire.
    expect(p.annules.every((o) => p.interventions.find((i) => i.id === o.id)!.agentId === o.agentId)).toBe(true)
  })

  it('agent habituel complet ce jour-là : l’autre agent est proposé, avec l’explication', () => {
    const [a, b] = jeu.agents
    // Un jour où l'agent habituel n'a plus la place pour un passage de ce client, mais l'autre agent oui.
    for (const client of [...jeu.clients].sort((x, y) => y.dureeMin - x.dureeMin)) {
      for (const date of [...new Set(jeu.interventions.filter((i) => i.date > DEMAIN && i.agentId === a.id).map((i) => i.date))].sort()) {
        const demande = { clientId: client.id, fenetre: { debut: date, fin: date }, agentHabituelId: a.id }
        const propositions = trouverCreneaux(ctxDe(jeu), demande)
        if (propositions.length === 0 || propositions.some((p) => p.agentId === a.id)) continue
        expect(propositions[0].agentId).toBe(b.id)
        expect(propositions[0].changementAgent).toBe(
          `${b.nom.split(' ')[0]} remplace ${a.nom.split(' ')[0]}, l’agent habituel de ce client : ${a.nom.split(' ')[0]} n’a plus de place sur la période`,
        )
        return
      }
    }
    throw new Error('aucun jour complet trouvé pour ce test')
  })

  it('la meilleure option de l’autre agent, toujours montrée, explique pourquoi elle n’est pas recommandée', () => {
    const intervention = jeu.interventions.find((i) => i.date > DEMAIN && i.statut === 'planifiee')!
    const propositions = trouverCreneaux(ctxDe(jeu), { clientId: intervention.clientId, interventionId: intervention.id, fenetre: { debut: '2026-11-02', fin: '2026-11-30' } })
    const autre = propositions.find((p) => p.agentId !== intervention.agentId)!
    expect(autre.changementAgent).toContain('l’agent habituel de ce client')
    expect(propositions.filter((p) => p.agentId === intervention.agentId).every((p) => !p.changementAgent)).toBe(true)
  })

  it('après la pluie, le créneau retenu est le meilleur, et les explications ne contredisent pas la liste', () => {
    const p = preparerJourneePluie(jeu, DEMAIN, AUJOURDHUI)
    const ctx = ctxDe(jeu, p.interventions)
    for (const r of p.replacements) {
      const placee = p.interventions.find((i) => i.id === r.demande.interventionId)!
      const toutes = trouverCreneaux(ctx, r.demande, { nombre: 1000 })
      const actuelle = toutes.find((q) => q.date === placee.date && q.agentId === placee.agentId)!
      // Aucun autre créneau nettement meilleur que celui retenu (ce que « Changer » montrerait en tête).
      expect(toutes[0].score).toBeGreaterThanOrEqual(actuelle.score - 0.5)
      // « X n'a pas de place avant le … » : vrai seulement si l'agent habituel n'a rien de plus tôt.
      for (const q of toutes) {
        const pasAvant = q.changementAgent?.match(/n’a pas de place avant le (\d\d)\/(\d\d)\/(\d{4})/)
        if (!pasAvant) continue
        const date = `${pasAvant[3]}-${pasAvant[2]}-${pasAvant[1]}`
        expect(toutes.some((o) => o.agentId === r.demande.agentHabituelId && o.date < date)).toBe(false)
        expect(date > q.date).toBe(true)
      }
    }
  })
})
