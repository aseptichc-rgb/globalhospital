"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { BilingualField, FollowUpQA, ChatMessage } from "@/types/consultation";
import { FieldKey } from "@/config/medical-fields";

interface ConsultationState {
  languageCode: string;
  formData: Record<FieldKey, BilingualField>;
  followUpQuestions: string[];
  followUpQuestionsKorean: string[];
  followUpChiefComplaint: string;
  followUpAnswers: Record<number, BilingualField>;
  sessionId: string | null;
  chatMessages: ChatMessage[];

  setLanguage: (code: string) => void;
  updateField: (key: FieldKey, value: BilingualField) => void;
  setFollowUpQuestions: (questions: string[], questionsKorean?: string[]) => void;
  updateFollowUpAnswer: (index: number, answer: BilingualField) => void;
  setSessionId: (id: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  reset: () => void;
}

const emptyBilingual: BilingualField = { original: "", korean: "" };

const initialFormData: Record<FieldKey, BilingualField> = {
  chiefComplaint: { ...emptyBilingual },
  pastMedicalHistory: { ...emptyBilingual },
  surgicalHistory: { ...emptyBilingual },
  currentMedications: { ...emptyBilingual },
  otherInfo: { ...emptyBilingual },
};

export const useConsultationStore = create<ConsultationState>()(
  persist(
    (set) => ({
      languageCode: "",
      formData: { ...initialFormData },
      followUpQuestions: [],
      followUpQuestionsKorean: [],
      followUpChiefComplaint: "",
      followUpAnswers: {},
      sessionId: null,
      chatMessages: [],

      setLanguage: (code) => set({ languageCode: code }),

      updateField: (key, value) =>
        set((state) => ({
          formData: { ...state.formData, [key]: value },
        })),

      setFollowUpQuestions: (questions, questionsKorean) =>
        set((state) => ({
          followUpQuestions: questions,
          followUpQuestionsKorean: questionsKorean || [],
          followUpChiefComplaint: questions.length > 0 ? state.formData.chiefComplaint?.original || "" : "",
        })),

      updateFollowUpAnswer: (index, answer) =>
        set((state) => ({
          followUpAnswers: { ...state.followUpAnswers, [index]: answer },
        })),

      setSessionId: (id) => set({ sessionId: id }),

      addChatMessage: (message) =>
        set((state) => ({
          chatMessages: [...state.chatMessages, message],
        })),

      reset: () =>
        set({
          languageCode: "",
          formData: { ...initialFormData },
          followUpQuestions: [],
          followUpQuestionsKorean: [],
          followUpChiefComplaint: "",
          followUpAnswers: {},
          sessionId: null,
          chatMessages: [],
        }),
    }),
    {
      name: "consultation-storage",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? sessionStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
    }
  )
);
