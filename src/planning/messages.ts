/**
 * Prévenance des clients : qui prévenir, et quoi leur écrire (SMS et mail).
 * Aucun envoi réel : la maquette enregistre seulement que le message est « parti ».
 */
import type { Client, DateISO, Entite, Intervention, JeuDeDonnees, MessageEnvoye, ModeleMessage } from '../donnees/types'
import { ecartJours, formatDate, nomJour } from '../utils/dates'
import { prochainJourTravaille } from './calendrierTravail'

export const LIBELLES_MODELE: Record<ModeleMessage, string> = {
  annulation_meteo: 'Annulation météo',
  deplacement: 'Passage déplacé',
  rappel_veille: 'Rappel de la veille',
  retard: 'Retard possible',
}

export interface MessageClient {
  sms: string
  mail: { objet: string; corps: string }
}

/** 8h, 8h30, 14h */
function heure(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

/** Créneau d'arrivée annoncé au client : « entre 8h30 et 9h30 » (arrondi à la demi-heure). */
export function creneauHoraire(debutMin: number): string {
  const debut = Math.floor(debutMin / 30) * 30
  return `entre ${heure(debut)} et ${heure(debut + 60)}`
}

/** « demain », « aujourd'hui » ou « le ven. 30/10 » (sans « le » en version courte, pour les SMS). */
export function quand(date: DateISO, dateDuJour: DateISO, court = false): string {
  const ecart = ecartJours(dateDuJour, date)
  if (ecart === 0) return 'aujourd’hui'
  if (ecart === 1) return 'demain'
  return `${court ? '' : 'le '}${nomJour(date).slice(0, 3)}. ${formatDate(date).slice(0, 5)}`
}

export function signature(entite: Pick<Entite, 'type' | 'ville'>): string {
  return entite.type === 'franchise' ? `Guillaume Propreté ${entite.ville}` : 'Guillaume Propreté'
}

export interface ContexteMessage {
  client: Client
  intervention: Intervention
  entite: Pick<Entite, 'type' | 'ville'>
  dateDuJour: DateISO
  retardMin?: number
}

export function genererMessage(modele: ModeleMessage, ctx: ContexteMessage): MessageClient {
  const { client, intervention: i, dateDuJour } = ctx
  const sig = signature(ctx.entite)
  // « Mme Lambert (syndic) » → « Bonjour Mme Lambert, »
  const bonjour = `Bonjour ${client.contact.nom.replace(/\s*\(.*?\)\s*$/, '')},`
  const fin = `Cordialement,\nL’équipe ${sig}`
  const nouveauCreneau = `${quand(i.date, dateDuJour)} ${creneauHoraire(i.debutMin)}`
  const dateOrigine = i.dateOrigine ?? i.date

  switch (modele) {
    case 'rappel_veille':
      return {
        sms: `${sig} : passage prévu ${quand(i.date, dateDuJour)} ${creneauHoraire(i.debutMin)} pour le lavage de vos vitres. Merci de prévoir l’accès.`,
        mail: {
          objet: `Passage prévu ${quand(i.date, dateDuJour)} ${creneauHoraire(i.debutMin)}`,
          corps: `${bonjour}\n\nNotre équipe passera ${quand(i.date, dateDuJour)} ${creneauHoraire(i.debutMin)} au ${client.adresse}, ${client.ville}, pour le nettoyage de vos vitres.\n\nMerci de prévoir l’accès aux vitres concernées.\n\n${fin}`,
        },
      }
    case 'retard': {
      const retard = ctx.retardMin ?? 30
      return {
        sms: `${sig} : retard possible de ${retard} minutes pour notre passage ${quand(i.date, dateDuJour)} (prévu ${creneauHoraire(i.debutMin)}). Merci de votre compréhension.`,
        mail: {
          objet: `Retard possible de ${retard} minutes`,
          corps: `${bonjour}\n\nNotre équipe risque d’arriver avec un retard d’environ ${retard} minutes pour le passage prévu ${quand(i.date, dateDuJour)} ${creneauHoraire(i.debutMin)}.\n\nNous vous prions de nous en excuser.\n\n${fin}`,
        },
      }
    }
    case 'annulation_meteo': {
      const annule = `le passage du ${nomJour(dateOrigine)} ${formatDate(dateOrigine).slice(0, 5)}`
      if (i.statut === 'annulee_meteo') {
        return {
          sms: `${sig} : en raison de la météo, ${annule} est annulé. Nous revenons vers vous pour un nouveau créneau.`,
          mail: {
            objet: 'Passage annulé à cause de la météo',
            corps: `${bonjour}\n\nEn raison des conditions météo, nous devons annuler ${annule}.\n\nNous revenons vers vous très vite pour vous proposer un nouveau créneau.\n\n${fin}`,
          },
        }
      }
      return {
        // Formulation du cahier des charges, tenue sous 160 caractères (1 SMS).
        sms: `${sig} : passage du ${nomJour(dateOrigine).slice(0, 3)}. ${formatDate(dateOrigine).slice(0, 5)} annulé à cause de la météo, nouveau créneau proposé : ${quand(i.date, dateDuJour, true)} ${creneauHoraire(i.debutMin)}.`,
        mail: {
          objet: `Passage annulé à cause de la météo, nouveau créneau proposé : ${nouveauCreneau}`,
          corps: `${bonjour}\n\nEn raison des conditions météo, nous devons annuler ${annule}.\n\nNouveau créneau proposé : ${nouveauCreneau}, au ${client.adresse}, ${client.ville}.\n\nSi ce créneau ne vous convient pas, il vous suffit de répondre à ce message.\n\n${fin}`,
        },
      }
    }
    case 'deplacement':
      return {
        sms: `${sig} : votre passage du ${formatDate(dateOrigine).slice(0, 5)} est déplacé ${nouveauCreneau}. Répondez si cela ne convient pas.`,
        mail: {
          objet: `Votre passage est déplacé ${nouveauCreneau}`,
          corps: `${bonjour}\n\nNous avons dû déplacer votre passage du ${nomJour(dateOrigine)} ${formatDate(dateOrigine)}.\n\nNouveau créneau : ${nouveauCreneau}, au ${client.adresse}, ${client.ville}.\n\nSi ce créneau ne vous convient pas, il vous suffit de répondre à ce message.\n\n${fin}`,
        },
      }
  }
}

// ─── Qui prévenir ───────────────────────────────────────────────────────────

export interface ClientAPrevenir {
  intervention: Intervention
  client: Client
  modele: ModeleMessage
  /** Modèles proposés dans la liste déroulante. */
  modelesPossibles: ModeleMessage[]
  signature: string
  dejaPrevenu: boolean
}

export function signatureMessage(i: Intervention): string {
  return `${i.date}|${i.debutMin}|${i.statut}`
}

const ORDRE: Record<ModeleMessage, number> = { annulation_meteo: 0, deplacement: 1, retard: 2, rappel_veille: 3 }

/**
 * Clients à prévenir : passages annulés ou replacés pour la météo, passages
 * déplacés, et rappel des passages de demain.
 */
export function clientsAPrevenir(
  jeu: Pick<JeuDeDonnees, 'clients' | 'interventions' | 'messagesEnvoyes'>,
  dateDuJour: DateISO,
): ClientAPrevenir[] {
  const clients = new Map(jeu.clients.map((c) => [c.id, c]))
  const envoyes = new Set(jeu.messagesEnvoyes.map((m) => `${m.interventionId}#${m.signature}`))
  const demain = prochainJourTravaille(dateDuJour)
  const resultat: ClientAPrevenir[] = []

  for (const i of jeu.interventions) {
    if (i.date < dateDuJour && i.statut !== 'annulee_meteo') continue
    let modele: ModeleMessage | null = null
    if (i.statut === 'annulee_meteo' || (i.statut === 'replanifiee' && i.motif === 'meteo')) modele = 'annulation_meteo'
    else if (i.statut === 'replanifiee') modele = 'deplacement'
    else if (i.statut === 'planifiee' && i.date === demain) modele = 'rappel_veille'
    if (!modele) continue

    const sig = signatureMessage(i)
    resultat.push({
      intervention: i,
      client: clients.get(i.clientId)!,
      modele,
      modelesPossibles: i.statut === 'annulee_meteo' ? [modele] : [modele, 'retard'],
      signature: sig,
      dejaPrevenu: envoyes.has(`${i.id}#${sig}`),
    })
  }
  return resultat.sort(
    (a, b) =>
      ORDRE[a.modele] - ORDRE[b.modele] ||
      a.intervention.date.localeCompare(b.intervention.date) ||
      a.intervention.debutMin - b.intervention.debutMin,
  )
}

/** Enregistre l'envoi (simulé) des messages. */
export function enregistrerEnvois(
  dejaEnvoyes: MessageEnvoye[],
  envois: { aPrevenir: ClientAPrevenir; modele: ModeleMessage; canaux: MessageEnvoye['canaux'] }[],
  dateDuJour: DateISO,
): MessageEnvoye[] {
  return [
    ...dejaEnvoyes,
    ...envois.map(({ aPrevenir, modele, canaux }) => ({
      interventionId: aPrevenir.intervention.id,
      modele,
      canaux,
      signature: aPrevenir.signature,
      envoyeLe: dateDuJour,
    })),
  ]
}
