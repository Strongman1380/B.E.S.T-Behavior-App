import { TIME_SLOT_KEYS } from "@/config/timeSlots";

export const BEHAVIOR_SECTION_KEYS = ['ai', 'pi', 'ce'];
export const BEHAVIOR_SCORE_OPTIONS = ['4', '3', '2', '1', 'A/B', 'NS'];

const hasValue = (value) => value !== undefined && value !== null && `${value}`.trim().length > 0;

export const formatDisplayValue = (value, isNonNumeric = false) => {
  if (isNonNumeric || typeof value === 'string') {
    // Handle AB/NS values
    const str = `${value}`.trim();
    if (str === 'AB' || str === 'A/B') return 'AB';
    if (str === 'NS') return 'NS';
    return str;
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  return '--';
};

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

export const getNonNumericSectionValues = (slot) => {
  return getSectionValues(slot)
    .filter(value => !Number.isFinite(Number(value)));
};

export const getAllSectionValues = (slot) => {
  return getSectionValues(slot);
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

  // Check if any section has a value (including AB/NS)
  const hasAnySectionValue = BEHAVIOR_SECTION_KEYS.some(key => hasValue(slot?.[key]));
  if (hasAnySectionValue) return true;

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

  // Check if all slots have only non-numeric values (AB/NS)
  const allValues = slots.flatMap(getAllSectionValues);
  const nonNumericValues = slots.flatMap(getNonNumericSectionValues);

  // If we have values and they're all non-numeric (AB/NS), check for consistency
  if (allValues.length > 0 && nonNumericValues.length === allValues.length) {
    // Check if all non-numeric values are the same (e.g., all AB or all NS)
    const uniqueValues = [...new Set(nonNumericValues)];
    if (uniqueValues.length === 1) {
      // All periods have the same AB/NS value
      return { average: uniqueValues[0], count: allValues.length, isNonNumeric: true };
    }
  }

  // Calculate numeric average, skipping AB/NS values
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
    acc[key] = { sum: 0, count: 0, nonNumericValues: [] };
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
      } else {
        // Store non-numeric values (AB/NS)
        sums[key].nonNumericValues.push(`${raw}`);
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
    const { sum, count, nonNumericValues } = sums[key];

    // If we have numeric values, use the average
    if (count > 0) {
      acc[key] = { average: sum / count, count, nonNumericValues };
    } else if (nonNumericValues.length > 0) {
      // Check if all non-numeric values are the same
      const uniqueValues = [...new Set(nonNumericValues)];
      if (uniqueValues.length === 1) {
        // All have the same AB/NS value for this section
        acc[key] = { average: uniqueValues[0], count: nonNumericValues.length, isNonNumeric: true };
      } else {
        // Mixed AB/NS values, no clear average
        acc[key] = { average: 0, count: 0, nonNumericValues };
      }
    } else {
      acc[key] = { average: 0, count: 0, nonNumericValues: [] };
    }

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
