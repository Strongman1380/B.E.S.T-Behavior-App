import { TIME_SLOTS, TIME_SLOT_KEYS } from '@/config/timeSlots';

const LEGACY_SLOT_PATTERN = /^(?:period|slot)[_\-\s]?(\d+)/i;

const sanitizeValue = (value) => {
  if (value === undefined || value === null) return undefined;
  const str = `${value}`.trim();
  return str.length > 0 ? str : undefined;
};

const normalizeSlotSections = (slot = {}) => {
  if (!slot || typeof slot !== 'object') return {};

  const ai = sanitizeValue(slot.ai ?? slot.adultInteraction ?? slot.adult_interaction);
  const pi = sanitizeValue(slot.pi ?? slot.peerInteraction ?? slot.peer_interaction);
  const ce = sanitizeValue(slot.ce ?? slot.classroomExpectations ?? slot.classroom_expectations);

  const comment =
    sanitizeValue(
      slot.comment ??
      slot.comments ??
      slot.note ??
      slot.notes ??
      slot.observations ??
      slot.summary ??
      slot.detail
    ) || undefined;

  const rating = sanitizeValue(slot.rating ?? slot.score ?? slot.value ?? slot.total);

  const normalized = {};

  if (ai) normalized.ai = ai;
  if (pi) normalized.pi = pi;
  if (ce) normalized.ce = ce;

  if (!ai && !pi && !ce && rating) {
    // Legacy single-score entries – apply score across sections so averages behave as before
    normalized.ai = rating;
    normalized.pi = rating;
    normalized.ce = rating;
  }

  if (comment) {
    normalized.comment = comment;
  }

  return normalized;
};

const normalizeLegacySlotOrder = (legacyEntries = []) => {
  const orderedKeys = [...TIME_SLOT_KEYS];
  const normalized = {};

  legacyEntries
    .sort((a, b) => {
      const [, aOrderRaw] = LEGACY_SLOT_PATTERN.exec(a[0]) || [];
      const [, bOrderRaw] = LEGACY_SLOT_PATTERN.exec(b[0]) || [];
      const aOrder = aOrderRaw ? Number(aOrderRaw) : Number.POSITIVE_INFINITY;
      const bOrder = bOrderRaw ? Number(bOrderRaw) : Number.POSITIVE_INFINITY;
      return aOrder - bOrder;
    })
    .forEach(([legacyKey, value], index) => {
      const targetKey = orderedKeys[index] || legacyKey;
      normalized[targetKey] = normalizeSlotSections(value);
    });

  return normalized;
};

export const normalizeTimeSlots = (rawSlots) => {
  if (!rawSlots || typeof rawSlots !== 'object') return {};

  const normalized = {};
  const entries = Object.entries(rawSlots);
  if (entries.length === 0) return normalized;

  const hasModernKeys = TIME_SLOT_KEYS.some((key) => rawSlots[key] !== undefined);
  const legacyEntries = entries.filter(([key]) => LEGACY_SLOT_PATTERN.test(key));

  if (!hasModernKeys && legacyEntries.length > 0) {
    return normalizeLegacySlotOrder(legacyEntries);
  }

  // Respect configured time slots order if provided
  const availableKeys = Array.isArray(TIME_SLOTS) && TIME_SLOTS.length > 0
    ? TIME_SLOT_KEYS
    : entries.map(([key]) => key);

  availableKeys.forEach((key) => {
    if (rawSlots[key] !== undefined) {
      normalized[key] = normalizeSlotSections(rawSlots[key]);
    }
  });

  // Capture any additional non-time-slot keys for forward compatibility
  entries.forEach(([key, value]) => {
    if (normalized[key]) return;
    if (LEGACY_SLOT_PATTERN.test(key)) return;
    normalized[key] = normalizeSlotSections(value);
  });

  return normalized;
};

export const normalizeDailyEvaluation = (evaluation = {}) => {
  if (!evaluation || typeof evaluation !== 'object') return evaluation;

  const normalizedSlots = normalizeTimeSlots(evaluation.time_slots);

  const generalComments =
    sanitizeValue(
      evaluation.general_comments ??
      evaluation.general_comment ??
      evaluation.comments ??
      evaluation.notes ??
      ''
    ) || '';

  return {
    ...evaluation,
    time_slots: normalizedSlots,
    general_comments: generalComments,
  };
};

export const prepareTimeSlotsForSave = (slots) => {
  const normalized = normalizeTimeSlots(slots);
  const cleaned = {};

  Object.entries(normalized).forEach(([key, value]) => {
    if (!value || typeof value !== 'object') return;
    const cleanedSlot = {};
    ['ai', 'pi', 'ce'].forEach((section) => {
      const sectionValue = sanitizeValue(value[section]);
      if (sectionValue !== undefined) {
        cleanedSlot[section] = sectionValue;
      }
    });
    const commentValue = sanitizeValue(value.comment);
    if (commentValue !== undefined) {
      cleanedSlot.comment = commentValue;
    }
    if (Object.keys(cleanedSlot).length > 0) {
      cleaned[key] = cleanedSlot;
    }
  });

  return cleaned;
};

export const prepareDailyEvaluationForSave = (evaluation = {}) => {
  if (!evaluation || typeof evaluation !== 'object') return evaluation;
  const prepared = { ...evaluation };
  prepared.time_slots = prepareTimeSlotsForSave(evaluation.time_slots);
  if (prepared.general_comments === undefined && evaluation.general_comment) {
    prepared.general_comments = evaluation.general_comment;
  }
  return prepared;
};

