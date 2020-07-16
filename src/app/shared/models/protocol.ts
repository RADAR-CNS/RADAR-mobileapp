import { MultiLanguageText } from './text'

export interface ClinicalProtocol {
  requiresInClinicCompletion?: boolean
  repeatAfterClinicVisit: RepeatQuestionnaire
}

export interface Protocol {
  notification?: ProtocolNotification
  repeatProtocol: TimeInterval
  repeatQuestionnaire: RepeatQuestionnaire
  reminders?: Reminder[] | Reminders
  clinicalProtocol?: ClinicalProtocol
  onDemandProtocol?
  completionWindow?: TimeInterval
  referenceTimestamp?: string
}

export interface ProtocolMetaData {
  protocol: string
  url?: string
}

export interface TimeInterval {
  unit?: string
  amount?: number
  dayOfWeek?: string
}

export interface RepeatQuestionnaire {
  unit: string
  unitsFromZero: number[]
}

export interface Reminder {
  offset: TimeInterval
  notification?: ProtocolNotification
}

export interface Reminders extends TimeInterval {
  repeat?: number
}

export interface ProtocolNotification {
  title?: MultiLanguageText
  text?: MultiLanguageText
  vibrate?: boolean
  sound?: boolean
}
