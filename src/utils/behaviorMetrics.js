import { TIME_SLOT_KEYS } from "@/config/timeSlots";

export const BEHAVIOR_SECTION_KEYS = ['ai', 'pi', 'ce'];
export const BEHAVIOR_SCORE_OPTIONS = ['4', '3', '2', '1', 'A', 'B', 'NS'];

const hasValue = (value) => value !== undefined && value !== null && `${value}`.trim().length > 0;

export const getSectionValues = (slot) => {
  if (!slot) return [];
  const sectionValues = BEHAVIOR_SECTION_KEYS
    .map(key => slot?.[key])
    .filter(value => value !== undefined && value !== null)
    .map(value => `${value}`)
    .filter(value => value.trim().length > 0);

  if (sectionValues.length > 0) {
    return sectionValues;
  }

  if (typeof slot?.rating === 'number') {
    return [`${slot.rating}`];
  }
  if (typeof slot?.score === 'number') {
    return [`${slot.score}`];
  }

  return [];
};

export const getNumericSectionValues = (slot) => {
  return getSectionValues(slot)
    .map(value => Number(value))
    .filter(value => Number.isFinite(value));
};

export const isSlotCompleted = (slot) => {
  if (!slot) return false;
  const allSectionsFilled = BEHAVIOR_SECTION_KEYS.every(key => hasValue(slot?.[key]));
  if (allSectionsFilled) return true;

  if (typeof slot?.status === 'string' && slot.status.trim().length > 0) return true;
  if (typeof slot?.status === 'number') return true;
  if (typeof slot?.rating === 'number') return true;
  if (typeof slot?.score === 'number') return true;
  if (typeof slot?.completed === 'boolean') return slot.completed;

  return false;
};

export const countCompletedSlots = (timeSlots) => {
  const slots = Object.values(timeSlots || {});
  return slots.filter(isSlotCompleted).length;
};

export const calculateAverageFromSlots = (timeSlots) => {
  const slots = Object.values(timeSlots || {});
  const numericValues = slots.flatMap(getNumericSectionValues);
  if (numericValues.length === 0) {
    return { average: 0, count: 0 };
  }
  const sum = numericValues.reduce((acc, value) => acc + value, 0);
  return { average: sum / numericValues.length, count: numericValues.length };
};

export const calculateSectionAverages = (timeSlots) => {
  const slots = Object.values(timeSlots || {});

  const sums = BEHAVIOR_SECTION_KEYS.reduce((acc, key) => {
    acc[key] = { sum: 0, count: 0 };
    return acc;
  }, {});

  slots.forEach(slot => {
    if (!slot) return;

    let sectionCaptured = false;

    BEHAVIOR_SECTION_KEYS.forEach(key => {
      const raw = slot?.[key];
      if (raw === undefined || raw === null || `${raw}`.trim().length === 0) {
        return;
      }
      const numeric = Number(raw);
      if (Number.isFinite(numeric)) {
        sums[key].sum += numeric;
        sums[key].count += 1;
        sectionCaptured = true;
      }
    });

    if (!sectionCaptured) {
      const fallback = Number(slot?.rating ?? slot?.score);
      if (Number.isFinite(fallback)) {
        BEHAVIOR_SECTION_KEYS.forEach(key => {
          sums[key].sum += fallback;
          sums[key].count += 1;
        });
      }
    }
  });

  return BEHAVIOR_SECTION_KEYS.reduce((acc, key) => {
    const { sum, count } = sums[key];
    acc[key] = count > 0 ? { average: sum / count, count } : { average: 0, count: 0 };
    return acc;
  }, {});
};

export const deriveTotalSlotCount = (settings) => {
  if (Array.isArray(settings?.time_slot_labels) && settings.time_slot_labels.length > 0) {
    return settings.time_slot_labels.length;
  }
  if (Array.isArray(settings?.time_slots) && settings.time_slots.length > 0) {
    return settings.time_slots.length;
  }
  return TIME_SLOT_KEYS.length;
};
