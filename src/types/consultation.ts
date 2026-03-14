export interface BilingualField {
  original: string;
  korean: string;
}

export interface FormData {
  chiefComplaint: BilingualField;
  pastMedicalHistory: BilingualField;
  surgicalHistory: BilingualField;
  currentMedications: BilingualField;
  otherInfo: BilingualField;
}

export interface FollowUpQA {
  question: BilingualField;
  answer: BilingualField;
}

export interface ConsultationSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  languageCode: string;
  languageName: string;
  status: "in-progress" | "completed";
  formData: FormData;
  followUpQA: FollowUpQA[];
  chatMessages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  timestamp: string;
  speaker: "doctor" | "patient";
  originalText: string;
  translatedText: string;
  originalLang: string;
  translatedLang: string;
}
