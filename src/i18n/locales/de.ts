import { authCopy } from "./auth";
import { voiceSettingsCopy } from "./voice-settings";
import { liveVoiceCopy } from "./live-voice";
import { uxCopy } from "./ux";
import type { Dictionary } from "./en";
export const dictionary = {
  ...liveVoiceCopy["de"],
  ...voiceSettingsCopy["de"],
  ...authCopy["de"],
  ...uxCopy["de"],
  voice: "Sprachchat",
  playReply: "Antwort abspielen",
  stopPlayback: "Wiedergabe stoppen",
  voiceCompanion: "Dein KI-Pflanzenbegleiter",
  voiceTurnHelp: "Lass uns gemeinsam wachsen.",
  voiceSpeaking: "Plantopedia spricht",
  voiceNoSpeech: "Nicht ganz verstanden. Versuch es noch einmal.",
  voiceUnavailable:
    "Die Antwort konnte nicht beendet werden. Prüfe vor einem neuen Versuch den Chat.",
  voiceInfo: "Über den Sprachchat",
  voiceTranscript: "Transkript lesen",

  newAttempt: "Neuer Versuch",
  retryCost:
    "Die vorherige Anfrage hat den Anbieter möglicherweise erreicht. Ein neuer Versuch kann weitere Kosten verursachen.",
  deletedDraft:
    "Diese Pflanze wurde auf einem anderen Gerät gelöscht. Ausstehende Daten bleiben privat erhalten und können nicht synchronisiert werden.",
  explore: "Entdecken",
  scan: "Scannen",
  plants: "Meine Pflanzen",
  tasks: "Aufgaben",
  ask: "Fragen",
  settings: "Einstellungen",
  tagline: "Die lebendige Welt genauer betrachten.",
  discover: "Jede Pflanze hat eine Geschichte.",
  webPhotoPrivacy:
    "Nur ein verkleinertes Foto mit geprüften Metadaten wird hochgeladen. Browserentwürfe bleiben nur während dieser Seitensitzung erhalten.",
  captureInvalid:
    "Prüfe die Angaben: Name mit 1–120 Zeichen, Ort mit höchstens 200 Zeichen und Notiz mit höchstens 8.000 Zeichen.",
  capturePhoneApiError:
    "Diese Vorschau erreicht den Dienst vom Smartphone aus nicht. Aktiviere den Smartphone-Zugriff auf dem Entwicklungscomputer, lade die App neu und öffne diesen gespeicherten Entwurf.",
  capturePhotoError:
    "Dieses Foto konnte nicht vorbereitet werden. Versuche erneut zu speichern oder wähle ein anderes Foto.",
  captureAuthError:
    "Deine Sitzung konnte nicht bestätigt werden. Melde dich vor dem nächsten Versuch erneut an.",
  captureServiceError:
    "Das Speichern von Pflanzen ist vorübergehend nicht verfügbar. Versuche es später erneut.",
  captureSaveError:
    "Deine Pflanze konnte nicht vollständig gespeichert werden. Prüfe die Verbindung und versuche es erneut. Die Bestimmung ist nach dem Speichern verfügbar.",
  webDraftRecovery:
    "Dein Foto und deine Angaben sind noch auf dieser Seite. Lass den Tab offen und versuche es erneut. Neuladen oder Schließen entfernt ungespeicherte Entwürfe.",
  draftRecovery:
    "Dein Foto und deine Angaben bleiben auf diesem Gerät. Versuche es erneut, um das Speichern fortzusetzen.",
  capture: "Pflanze fotografieren",
  gallery: "Foto auswählen",
  startDiscoveryTitle: "Entdecke die Pflanzen um dich herum.",
  startDiscoveryAction: "Mit einem Foto beginnen",
  discoveryTipTitle: "Ein guter Anfang",
  discoveryTipBody:
    "Wähle eine Zimmerpflanze, eine Gartenblume oder einen Baum beim nächsten Spaziergang.",
  homeCollectionStale: "Deine zuletzt geladenen Entdeckungen werden angezeigt.",
  homeCollectionUnavailable:
    "Deine Sammlung ist vorübergehend nicht verfügbar. Aktualisiere sie, um dich erneut zu verbinden.",
  refreshCollection: "Sammlung aktualisieren",
  firstDiscovery: "Entdecke deine erste Pflanze.",
  discoveryIntro:
    "Nimm ein Foto auf oder wähle eines aus, speichere deine Pflanze und sieh dir Bestimmungsvorschläge an.",
  firstPlantAction: "Erste Pflanze hinzufügen",
  collectionStart: "Hier beginnt deine Sammlung",
  collectionStartHelp:
    "Gespeicherte Pflanzen erscheinen hier. Beginne mit einer Zimmerpflanze, einer Gartenpflanze oder einer Entdeckung vom Spaziergang.",
  loadingPlants: "Deine Pflanzen werden geladen…",
  collectionLoadError: "Deine Pflanzen konnten nicht geladen werden.",
  collectionLoadHelp:
    "Versuche es gleich noch einmal. Du kannst schon ein Foto aufnehmen oder auswählen und eine Entdeckung beginnen.",
  collectionStale:
    "Zuvor geladene Pflanzen werden angezeigt. Neuere Änderungen fehlen möglicherweise.",
  tryAgain: "Erneut versuchen",
  noSearchResults:
    "Keine passenden Pflanzen gefunden. Versuche einen anderen Namen oder eine andere Beobachtung.",
  recent: "Letzte Entdeckungen",
  collection: "Deine lebendige Sammlung",
  empty: "Deine nächste Entdeckung beginnt mit einem Foto.",
  search: "Pflanzen und Beobachtungen suchen",
  searchAction: "Suchen",
  nickname: "Name dieser einzelnen Pflanze",
  place: "Ort (optional)",
  note: "Was hast du beobachtet?",
  observed: "Beobachtet",
  owned: "Eigene / gepflegte Pflanze",
  save: "Pflanze speichern",
  pending: "Synchronisierung ausstehend",
  saved: "Gespeichert",
  draft: "Lokaler Entwurf",
  retry: "Erneut versuchen",
  cancel: "Abbrechen",
  confirm: "Bestätigen",
  remove: "Löschen",
  identify: "Diese Pflanze bestimmen",
  uncertain: "Bestätigung erforderlich",
  evidence: "Belege",
  identification: "Bestimmung",
  identificationSaved: "Bestimmung gespeichert",
  yourChoice: "Deine Wahl",
  editIdentification: "Bestimmung bearbeiten",
  bestMatch: "Beste Übereinstimmung",
  confidence: "Konfidenz",
  aboutConfidence: "Über die Konfidenz",
  confidenceHelp: "Dies sind Pl@ntNet-Bewertungen, keine Garantie für die Art.",
  chooseIdentification: "Bestimmung auswählen",
  chooseIdentificationHelp:
    "Wähle die passende Art für deine Pflanze. Du kannst sie später ändern.",
  compareMatches: "Andere Vorschläge vergleichen",
  hideOtherMatches: "Andere Vorschläge ausblenden",
  currentIdentification: "Aktuelle Bestimmung",
  enterIdentificationName: "Anderen Namen eingeben",
  useIdentificationName: "Diesen Namen verwenden",
  manualIdentification: "Von dir eingegebener Name",
  basedOnPhotos: "Anhand von",
  photoShort: "Foto",
  viewPhoto: "Foto ansehen",
  selectPhotos: "Fotos auswählen",
  selectPhotosHelp: "Wähle bis zu 5 Ansichten dieser Pflanze.",
  findMatches: "Übereinstimmungen suchen",
  findingMatches: "Suche läuft…",
  identifyFromPhotos: "Mit Fotos bestimmen",
  reviewSuggestions: "Vorschläge ansehen",
  reviewLatest: "Neueste Vorschläge ansehen",
  decideLater: "Später entscheiden",
  notIdentified: "Noch keine Bestimmung gewählt.",
  identificationSaveError:
    "Die Wahl konnte nicht bestätigt werden. Vor einem neuen Versuch aktualisieren.",
  refreshIdentification: "Bestimmung aktualisieren",
  identificationFindError:
    "Keine Übereinstimmung gefunden. Deine Fotos sind gespeichert.",
  candidates: "Bestimmungsvorschläge",
  noMatch: "Keine verlässliche Übereinstimmung. Dein Foto bleibt erhalten.",
  anotherPhoto:
    "Versuche einen anderen Blickwinkel oder Pflanzenteil für mehr Belege.",
  select: "Diesen Vorschlag wählen",
  score: "Anbieterwert",
  timeline: "Beobachtungsverlauf",
  addNote: "Beobachtung hinzufügen",
  photo: "Pflanzenfoto",
  permission: "Erlaube die Kamera für Pflanzenfotos oder wähle ein Foto aus.",
  allow: "Kamera erlauben",
  shutter: "Foto aufnehmen",
  privacy:
    "Originale bleiben auf diesem Gerät. Nur ein verkleinertes Foto mit geprüften Metadaten wird hochgeladen.",
  talking: "Gespräch über",
  noContext:
    "Frage nach deinen gespeicherten Pflanzen oder wähle eine für das Gespräch aus.",
  composer: "Frage zu deiner Entdeckung…",
  send: "Senden",
  ai: "Plantopedia ist eine KI. Eine Bestimmung belegt keine Essbarkeit.",
  thinking: "Belege werden geprüft",
  captions: "Untertitel",
  light: "Hell",
  dark: "Dunkel",
  system: "System",
  appearance: "Darstellung",
  language: "Sprache",
  signIn: "Anmelden oder Konto erstellen",
  signOut: "Abmelden",
  welcome: "Dein Pflanzenbegleiter wartet.",
  continue: "Weiter",
  loading: "Wird geladen…",
  error:
    "Die Aktion konnte nicht abgeschlossen werden. Bitte versuche es erneut.",
  offline:
    "Offline oder nicht erreichbar. Gespeichertes ansehen oder lokal entwerfen.",
  recall: "Öffne eine Entdeckung erneut und setze ihre Geschichte fort.",
  noTasks:
    "Keine Erinnerungen. Besprich eine eigene Pflanze und bestätige einen Vorschlag.",
  proposed: "Vorgeschlagene Aktion prüfen",
  history: "Gespräche",
  retain: "Sprachtranskripte speichern",
  deleteAccount: "Konto und Anwendungsdaten löschen",
  deleteWarning:
    "Die Pflanze und ihre Belege werden dauerhaft gelöscht. Lokale Originale werden bei der Synchronisierung entfernt.",
  deleteAccountWarning:
    "Deine Daten und deine Anmeldeidentität werden dauerhaft gelöscht.",
  localDrafts: "Entwürfe auf diesem Gerät",
  source: "Quellen",
  responseReferences: "Fotos und Quellen",
  referencePhoto: "Foto",
  technicalDetails: "Technische Details",
  photoIdentifier: "Foto-ID",
  plantIdentifier: "Pflanzen-ID",
  manual: "Wissenschaftlichen Namen korrigieren",
  correction: "Korrektur speichern",
  details: "Pflanze ansehen",
  newChat: "Neues Gespräch",
  back: "Zurück",
  originalLocal: "Originalfoto auf diesem Gerät gespeichert",
  configuration:
    "Konfiguriere die beiden öffentlichen Mobilvariablen für deinen Server.",
} satisfies Dictionary;
