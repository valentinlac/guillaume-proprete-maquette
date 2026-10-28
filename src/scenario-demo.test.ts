/**
 * Le scénario de démo du cahier des charges (10 minutes), rejoué de bout en bout
 * sur chaque entité avec les mêmes fonctions que l'interface.
 * « Ce parcours doit fonctionner sans accroc, à chaque fois. »
 */
import { describe, expect, it } from 'vitest'
import { chargerJeux } from './donnees/chargement'
import { DATE_DU_JOUR } from './donnees/donnees-fictives'
import type { JeuDeDonnees } from './donnees/types'
import { prochainJourTravaille } from './planning/calendrierTravail'
import { appliquerCreneau, trouverCreneaux } from './planning/creneaux'
import { clientsAPrevenir, enregistrerEnvois, genererMessage } from './planning/messages'
import { annulerJournee, changementsParAgent, demandesDeReplacement, nombreDeChangements, proposerReplacements } from './planning/meteo'
import { verifierPlanning } from './planning/verifications'
import { statsDuMois, tourneesDuJour } from './planning/vues'
import { prevoir, soldePrevuAu } from './tresorerie/prevision'
import { recurrentsAvecDecisions } from './tresorerie/recurrents'
import { ajouterMois } from './utils/dates'

const jeux = chargerJeux(DATE_DU_JOUR)
const DEMAIN = prochainJourTravaille(DATE_DU_JOUR)

describe.each(Object.keys(jeux))('scénario de démo (%s)', (id) => {
  let jeu: JeuDeDonnees = jeux[id]
  const ctx = () => ({ depot: jeu.entite.depot, clients: jeu.clients, agents: jeu.agents, interventions: jeu.interventions, dateDuJour: DATE_DU_JOUR })
  const verifier = () => expect(verifierPlanning(ctx(), jeu.interventions)).toEqual([])

  it('1. ouverture sur le planning du mois : deux agents, tournées déjà regroupées', () => {
    expect(jeu.agents).toHaveLength(2)
    expect(statsDuMois(jeu, DATE_DU_JOUR.slice(0, 7)).passages).toBeGreaterThan(15)
    expect(new Set(jeu.interventions.map((i) => i.agentId)).size).toBe(2)
    verifier()
  })

  it('2. il pleut demain : les passages passent en « annulée météo »', () => {
    const avant = jeu.interventions.filter((i) => i.date === DEMAIN)
    expect(tourneesDuJour(jeu, avant)).toHaveLength(2) // les deux agents travaillent demain
    jeu = { ...jeu, interventions: annulerJournee(jeu.interventions, DEMAIN) }
    expect(jeu.interventions.filter((i) => i.date === DEMAIN).every((i) => i.statut === 'annulee_meteo')).toBe(true)
  })

  it('3. l’outil propose de replacer chaque passage ; « Trouver un créneau » sur un client ; confirmation', () => {
    const { replacements, interventions } = proposerReplacements(ctx())
    expect(replacements.every((r) => r.retenue)).toBe(true)
    // L'utilisateur change le créneau d'un client avec « Trouver un créneau ».
    const demande = demandesDeReplacement(jeu.interventions, DATE_DU_JOUR)[0]
    const brouillon = { ...ctx(), interventions }
    const place = interventions.find((i) => i.id === demande.interventionId)!
    const autres = trouverCreneaux(brouillon, { ...demande, joursExclus: [DEMAIN, place.date] })
    expect(autres.length).toBeGreaterThan(0)
    expect(autres[0].raison).toMatch(/min/)
    jeu = { ...jeu, interventions: appliquerCreneau(brouillon, demande, autres[0]) }
    expect(jeu.interventions.filter((i) => i.statut === 'annulee_meteo')).toEqual([])
    verifier()
  })

  it('4. le panneau de prévenance liste les clients touchés, avec SMS et mail ; « Envoyer »', () => {
    const touches = clientsAPrevenir(jeu, DATE_DU_JOUR).filter((x) => x.modele === 'annulation_meteo')
    expect(touches.length).toBe(jeux[id].interventions.filter((i) => i.date === DEMAIN).length)
    for (const x of touches) {
      const m = genererMessage(x.modele, { client: x.client, intervention: x.intervention, entite: jeu.entite, dateDuJour: DATE_DU_JOUR })
      expect(m.sms).toContain('annulé à cause de la météo, nouveau créneau proposé')
      expect(m.sms.length).toBeLessThanOrEqual(160)
      expect(m.mail.corps).toContain(`Bonjour ${x.client.contact.nom.replace(/\s*\(.*?\)\s*$/, '')},`)
    }
    jeu = { ...jeu, messagesEnvoyes: enregistrerEnvois(jeu.messagesEnvoyes, touches.map((x) => ({ aPrevenir: x, modele: x.modele, canaux: ['sms', 'mail'] })), DATE_DU_JOUR) }
    expect(clientsAPrevenir(jeu, DATE_DU_JOUR).filter((x) => x.modele === 'annulation_meteo').every((x) => x.dejaPrevenu)).toBe(true)
  })

  it('5. « Envoyer aux agents » : le planning modifié repart vers les agents', () => {
    expect(nombreDeChangements(changementsParAgent(jeu.interventionsEnvoyees, jeu.interventions, jeu.agents, DATE_DU_JOUR))).toBeGreaterThan(0)
    jeu = { ...jeu, interventionsEnvoyees: jeu.interventions }
    expect(nombreDeChangements(changementsParAgent(jeu.interventionsEnvoyees, jeu.interventions, jeu.agents, DATE_DU_JOUR))).toBe(0)
  })

  it('6. trésorerie : solde actuel, prévision à 6 mois, dépenses récurrentes détectées', () => {
    const recurrents = recurrentsAvecDecisions(jeu.mouvements, jeu.decisionsRecurrents)
    expect(recurrents.filter((r) => r.statut === 'propose').length).toBeGreaterThan(0)
    const p = prevoir(jeu, recurrents, DATE_DU_JOUR, 6)
    expect(p.soldeActuel).toBeGreaterThan(0)
    expect(Number.isFinite(soldePrevuAu(p, ajouterMois(DATE_DU_JOUR, 3)))).toBe(true)
    expect(Number.isFinite(soldePrevuAu(p, ajouterMois(DATE_DU_JOUR, 6)))).toBe(true)
  })

  it('7. un gros client paie avec 30 jours de retard : la courbe baisse et le point bas apparaît', () => {
    const recurrents = recurrentsAvecDecisions(jeu.mouvements, jeu.decisionsRecurrents)
    const gros = [...jeu.factures].sort((a, b) => b.montant - a.montant)[0]
    const base = prevoir(jeu, recurrents, DATE_DU_JOUR, 6)
    const retard = prevoir(jeu, recurrents, DATE_DU_JOUR, 6, { retard: { client: gros.client, jours: 30 } })
    expect(retard.pointBas.solde).toBeLessThan(base.pointBas.solde)
    // Il manque la facture du client pendant 30 jours, puis tout revient : l'argent est décalé, pas perdu.
    const ecarts = base.points.map((p, k) => p.solde - retard.points[k].solde)
    expect(Math.max(...ecarts)).toBeCloseTo(gros.montant, 1)
    expect(Math.min(...ecarts)).toBeGreaterThanOrEqual(-0.5) // jamais mieux qu'à l'heure
    expect(retard.points.at(-1)!.solde).toBeCloseTo(base.points.at(-1)!.solde, 2)
  })

  it('8. changer de franchisé : les données changent', () => {
    const autres = Object.values(jeux).filter((j) => j.entite.id !== id)
    for (const a of autres) {
      expect(a.clients.map((c) => c.nom)).not.toEqual(jeu.clients.map((c) => c.nom))
      expect(a.agents.map((x) => x.nom)).not.toEqual(jeu.agents.map((x) => x.nom))
    }
  })
})
