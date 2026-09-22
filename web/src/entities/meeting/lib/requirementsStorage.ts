import { type MeetingId } from "../model/meeting";
import {
  parseRequirementsDocument,
  type RequirementsDocument,
} from "../model/requirementsDocument";

export const REQUIREMENTS_STORAGE_PREFIX = "reqlogue.requirements.";
const CHANGE_EVENT = "reqlogue-requirements-change";
const parsedDocuments = new Map<
  string,
  { raw: string; document: RequirementsDocument }
>();

export function requirementsStorageKey(id: MeetingId): string {
  return `${REQUIREMENTS_STORAGE_PREFIX}${id}`;
}

export function readRequirements(id: MeetingId): RequirementsDocument | null {
  if (!hasLocalStorage()) {
    return null;
  }
  const key = requirementsStorageKey(id);
  const raw = localStorage.getItem(key);
  if (raw === null) {
    parsedDocuments.delete(key);
    return null;
  }
  const cached = parsedDocuments.get(key);
  if (cached !== undefined && cached.raw === raw) {
    return cached.document;
  }
  try {
    const document = parseRequirementsDocument(id, JSON.parse(raw) as unknown);
    if (document === null) {
      parsedDocuments.delete(key);
      return null;
    }
    parsedDocuments.set(key, { raw, document });
    return document;
  } catch {
    parsedDocuments.delete(key);
    return null;
  }
}

export function writeRequirements(document: RequirementsDocument): void {
  if (!hasLocalStorage()) {
    return;
  }
  const key = requirementsStorageKey(document.meetingId);
  const raw = JSON.stringify(document);
  parsedDocuments.set(key, { raw, document });
  localStorage.setItem(key, raw);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeRequirements(onStoreChange: () => void): () => void {
  if (!hasLocalStorage()) {
    return () => undefined;
  }
  const onChange = () => {
    onStoreChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function hasLocalStorage(): boolean {
  return typeof localStorage !== "undefined";
}
