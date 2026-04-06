import { getDb } from "./firebase";
import { ConsultationSession } from "@/types/consultation";

const COLLECTION = "sessions";

export async function createSession(
  data: Omit<ConsultationSession, "id">
): Promise<string> {
  const docRef = await getDb().collection(COLLECTION).add({
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return docRef.id;
}

export async function getSession(
  id: string
): Promise<ConsultationSession | null> {
  const doc = await getDb().collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as ConsultationSession;
}

export async function getAllSessions(): Promise<ConsultationSession[]> {
  const snapshot = await getDb()
    .collection(COLLECTION)
    .orderBy("createdAt", "desc")
    .get();
  return snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as ConsultationSession
  );
}

export async function updateSession(
  id: string,
  data: Partial<ConsultationSession>
): Promise<void> {
  await getDb()
    .collection(COLLECTION)
    .doc(id)
    .update({
      ...data,
      updatedAt: new Date().toISOString(),
    });
}
