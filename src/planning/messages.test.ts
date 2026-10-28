import { describe, expect, it } from 'vitest'
import { chargerJeux } from '../donnees/chargement'
import type { JeuDeDonnees, ModeleMessage } from '../donnees/types'
import { appliquerCreneau, trouverCreneaux } from './creneaux'
import { clientsAPrevenir, creneauHoraire, enregistrerEnvois, genererMessage, quand } from './messages'
import { annulerJournee, proposerReplacements } from './meteo'

const AUJOURDHUI = '2026-10-28'
const DEMAIN = '2026-10-29'
const jeux = chargerJeux(AUJOURDHUI)
const ctxDe = (j: JeuDeDonnees, interventions = j.interventions) => ({
  depot: j.entite.depot, clients: j.clients, agents: j.agents, interventions, dateDuJour: AUJOURDHUI,
})
const apresPluie = (j: JeuDeDonnees) => proposerReplacements(ctxDe(j, annulerJournee(j.interventions, DEMAIN))).interventions

describe('textes des messages', () => {
  it('annonce un créneau d’une heure arrondi à la demi-heure', () => {
    expect(creneauHoraire(14 * 60)).toBe('entre 14h et 15h')
    expect(creneauHoraire(8 * 60 + 32)).toBe('entre 8h30 et 9h30')
    expect(creneauHoraire(13 * 60 + 47)).toBe('entre 13h30 et 14h30')
  })

  it('dit « demain » ou la date', () => {
    expect(quand(DEMAIN, AUJOURDHUI)).toBe('demain')
    expect(quand(AUJOURDHUI, AUJOURDHUI)).toBe('aujourd’hui')
    expect(quand('2026-11-04', AUJOURDHUI)).toBe('le mer. 04/11')
  })

  it('reprend les 3 modèles du cahier des charges', () => {
    const jeu = jeux.valence
    const i = { ...jeu.interventions.find((x) => x.date === DEMAIN)!, debutMin: 14 * 60 }
    const client = jeu.clients.find((c) => c.id === i.clientId)!
    const ctx = { client, intervention: i, entite: jeu.entite, dateDuJour: AUJOURDHUI }
    expect(genererMessage('rappel_veille', ctx).sms).toContain('passage prévu demain entre 14h et 15h')
    expect(genererMessage('retard', ctx).sms).toContain('retard possible de 30 minutes')
    const replace = { ...i, date: '2026-10-30', debutMin: 8 * 60 + 10, statut: 'replanifiee' as const, dateOrigine: DEMAIN, motif: 'meteo' as const }
    const meteo = genererMessage('annulation_meteo', { ...ctx, intervention: replace })
    expect(meteo.sms).toContain('passage du jeu. 29/10 annulé à cause de la météo, nouveau créneau proposé : ven. 30/10 entre 8h et 9h.')
    expect(meteo.mail.objet).toBe('Passage annulé à cause de la météo, nouveau créneau proposé : le ven. 30/10 entre 8h et 9h')
    expect(meteo.mail.corps).toMatch(/^Bonjour .+,\n/)
    expect(meteo.mail.corps).toContain(client.adresse)
  })

  it.each(Object.keys(jeux))('%s : SMS de 160 caractères au plus, quel que soit le client', (id) => {
    const jeu = jeux[id]
    const modeles: ModeleMessage[] = ['rappel_veille', 'retard', 'annulation_meteo', 'deplacement']
    for (const client of jeu.clients) {
      const i = { id: 'x', clientId: client.id, date: '2026-11-30', agentId: 'a1', ordre: 1, debutMin: 13 * 60 + 30, statut: 'replanifiee' as const, dateOrigine: '2026-10-29' }
      for (const m of modeles) {
        const sms = genererMessage(m, { client, intervention: i, entite: jeu.entite, dateDuJour: AUJOURDHUI }).sms
        expect(sms.length, `${m} : ${sms}`).toBeLessThanOrEqual(160)
      }
    }
  })

  it('salue le contact sans la précision entre parenthèses', () => {
    const jeu = jeux.valence
    const client = jeu.clients.find((c) => c.contact.nom === 'Mme Lambert (syndic)')!
    const i = jeu.interventions.find((x) => x.clientId === client.id)!
    const corps = genererMessage('rappel_veille', { client, intervention: i, entite: jeu.entite, dateDuJour: AUJOURDHUI }).mail.corps
    expect(corps.startsWith('Bonjour Mme Lambert,\n')).toBe(true)
  })

  it('signe au nom du franchisé', () => {
    const jeu = jeux.romans
    const i = jeu.interventions.find((x) => x.date === DEMAIN)!
    const sms = genererMessage('rappel_veille', { client: jeu.clients.find((c) => c.id === i.clientId)!, intervention: i, entite: jeu.entite, dateDuJour: AUJOURDHUI }).sms
    expect(sms.startsWith('Guillaume Propreté Romans-sur-Isère :')).toBe(true)
  })
})

describe('clients à prévenir', () => {
  const jeu = jeux.valence

  it('sans changement : rappel de la veille pour les passages de demain', () => {
    const liste = clientsAPrevenir(jeu, AUJOURDHUI)
    const demain = jeu.interventions.filter((i) => i.date === DEMAIN)
    expect(liste.map((x) => x.intervention.id).sort()).toEqual(demain.map((i) => i.id).sort())
    expect(liste.every((x) => x.modele === 'rappel_veille' && !x.dejaPrevenu)).toBe(true)
  })

  it('après la pluie : annulation météo avec nouveau créneau pour chaque client touché', () => {
    const interventions = apresPluie(jeu)
    const liste = clientsAPrevenir({ ...jeu, interventions }, AUJOURDHUI)
    const touches = jeu.interventions.filter((i) => i.date === DEMAIN).map((i) => i.id).sort()
    const meteo = liste.filter((x) => x.modele === 'annulation_meteo')
    expect(meteo.map((x) => x.intervention.id).sort()).toEqual(touches)
    expect(meteo.every((x) => x.intervention.statut === 'replanifiee' && x.intervention.motif === 'meteo')).toBe(true)
    // Les messages météo viennent en tête de liste.
    expect(liste.slice(0, meteo.length).every((x) => x.modele === 'annulation_meteo')).toBe(true)
  })

  it('un passage annulé non replacé reçoit un message sans nouveau créneau', () => {
    const interventions = annulerJournee(jeu.interventions, DEMAIN)
    const liste = clientsAPrevenir({ ...jeu, interventions }, AUJOURDHUI)
    const x = liste.find((l) => l.intervention.statut === 'annulee_meteo')!
    const sms = genererMessage(x.modele, { client: x.client, intervention: x.intervention, entite: jeu.entite, dateDuJour: AUJOURDHUI }).sms
    expect(sms).toContain('Nous revenons vers vous')
    expect(sms).not.toContain('Nouveau créneau')
  })

  it('un passage déplacé à la main reçoit le message « déplacé »', () => {
    const existante = jeu.interventions.find((i) => i.date === '2026-11-05')!
    const demande = { clientId: existante.clientId, interventionId: existante.id, fenetre: { debut: '2026-11-02', fin: '2026-11-30' }, joursExclus: [existante.date] }
    const p = trouverCreneaux(ctxDe(jeu), demande)[0]
    const interventions = appliquerCreneau(ctxDe(jeu), demande, p)
    const x = clientsAPrevenir({ ...jeu, interventions }, AUJOURDHUI).find((l) => l.intervention.id === existante.id)!
    expect(x.modele).toBe('deplacement')
  })

  it('ne redemande pas un message déjà envoyé, sauf si le passage change encore', () => {
    const interventions = apresPluie(jeu)
    const liste = clientsAPrevenir({ ...jeu, interventions }, AUJOURDHUI)
    const messagesEnvoyes = enregistrerEnvois([], liste.map((x) => ({ aPrevenir: x, modele: x.modele, canaux: ['sms', 'mail'] })), AUJOURDHUI)
    expect(clientsAPrevenir({ ...jeu, interventions, messagesEnvoyes }, AUJOURDHUI).every((x) => x.dejaPrevenu)).toBe(true)
    // Le passage change d'heure : il faut prévenir à nouveau.
    const change = interventions.map((i) => (i.id === liste[0].intervention.id ? { ...i, debutMin: i.debutMin + 60 } : i))
    const apres = clientsAPrevenir({ ...jeu, interventions: change, messagesEnvoyes }, AUJOURDHUI)
    expect(apres.filter((x) => !x.dejaPrevenu).map((x) => x.intervention.id)).toEqual([liste[0].intervention.id])
  })
})
