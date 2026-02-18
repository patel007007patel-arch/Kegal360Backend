/**
 * Cycle Calculation Service
 * Uses User model data only: lastPeriodStart, cycleLength, periodLength, cycleType, cycleLengthRange.
 * All values come from onboarding / cycle settings stored on User (no Question model).
 */

export const calculateCurrentPhase = (lastPeriodStart, cycleLength = 28, periodLength = 5) => {
  if (!lastPeriodStart) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const periodStart = new Date(lastPeriodStart);
  periodStart.setHours(0, 0, 0, 0);

  const daysSincePeriod = Math.floor((today - periodStart) / (1000 * 60 * 60 * 24));
  const cycleDay = (daysSincePeriod % cycleLength) + 1;
  const ovulationDay = Math.floor(cycleLength / 2);

  let phase;
  let phaseName;
  if (cycleDay >= 1 && cycleDay <= periodLength) {
    phase = 'menstrual';
    phaseName = 'Period';
  } else if (cycleDay > periodLength && cycleDay < ovulationDay - 2) {
    phase = 'follicular';
    phaseName = 'Follicular';
  } else if (cycleDay >= ovulationDay - 2 && cycleDay <= ovulationDay + 2) {
    phase = 'ovulation';
    phaseName = 'Ovulation';
  } else {
    phase = 'luteal';
    phaseName = 'Luteal';
  }

  return { phase, phaseName, cycleDay, daysSincePeriod };
};

export const calculateNextPeriod = (lastPeriodStart, cycleLength = 28) => {
  if (!lastPeriodStart) return null;

  const periodStart = new Date(lastPeriodStart);
  periodStart.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Advance to the first period date that is today or in the future
  const nextPeriod = new Date(periodStart);
  nextPeriod.setDate(nextPeriod.getDate() + cycleLength);
  while (nextPeriod < today) {
    nextPeriod.setDate(nextPeriod.getDate() + cycleLength);
  }

  const daysUntil = Math.ceil((nextPeriod - today) / (1000 * 60 * 60 * 24));

  return {
    date: nextPeriod,
    daysUntil,
    isOverdue: daysUntil < 0
  };
};

export const calculateNextOvulation = (lastPeriodStart, cycleLength = 28) => {
  if (!lastPeriodStart) return null;

  const periodStart = new Date(lastPeriodStart);
  periodStart.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find next period (first period date >= today), then ovulation is 14 days before that
  const nextPeriod = new Date(periodStart);
  nextPeriod.setDate(nextPeriod.getDate() + cycleLength);
  while (nextPeriod < today) {
    nextPeriod.setDate(nextPeriod.getDate() + cycleLength);
  }

  let nextOvulation = new Date(nextPeriod);
  nextOvulation.setDate(nextOvulation.getDate() - 14);

  // If that ovulation already passed, use the next cycle's ovulation
  if (nextOvulation < today) {
    nextOvulation.setDate(nextOvulation.getDate() + cycleLength);
  }

  const daysUntil = Math.ceil((nextOvulation - today) / (1000 * 60 * 60 * 24));

  return {
    date: nextOvulation,
    daysUntil
  };
};

export const calculateFertileWindow = (lastPeriodStart, cycleLength = 28) => {
  if (!lastPeriodStart) return null;

  const nextOvulation = calculateNextOvulation(lastPeriodStart, cycleLength);
  if (!nextOvulation) return null;

  const fertileStart = new Date(nextOvulation.date);
  fertileStart.setDate(fertileStart.getDate() - 5); // 5 days before ovulation

  const fertileEnd = new Date(nextOvulation.date);
  fertileEnd.setDate(fertileEnd.getDate() + 1); // 1 day after ovulation

  return {
    start: fertileStart,
    end: fertileEnd,
    ovulationDate: nextOvulation.date
  };
};

/** Effective cycle length from User (same logic as calculateCyclePredictions). Export for scheduler/insights. */
export const getEffectiveCycleLength = (user) => {
  if (user.cycleType === 'regular') return user.cycleLength || 28;
  if (user.cycleLengthRange?.min != null && user.cycleLengthRange?.max != null) {
    return Math.round((user.cycleLengthRange.min + user.cycleLengthRange.max) / 2);
  }
  return 28;
};

/**
 * Last day of the given month in UTC (1–31).
 */
const getDaysInMonthUtc = (year, month) => {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
};

/** Add n days in UTC. */
const addDaysUtc = (d, n) => {
  const t = new Date(d);
  t.setUTCDate(t.getUTCDate() + n);
  return t;
};

export const generateCalendarData = (user, month, year) => {
  if (!user.lastPeriodStart) {
    return { calendar: [], phases: {} };
  }
  const cycleLength = getEffectiveCycleLength(user);

  const daysInMonth = getDaysInMonthUtc(year, month);
  const calendar = [];
  const phases = {
    menstrual: [],
    follicular: [],
    ovulation: [],
    luteal: []
  };

  // Use UTC midnight so calendar dates match settings (lastPeriodStart/End stored as UTC).
  const periodStart = new Date(user.lastPeriodStart);
  periodStart.setUTCHours(0, 0, 0, 0);
  const periodLen = user.periodLength ?? 5;

  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(Date.UTC(year, month - 1, day));

    const daysSincePeriod = Math.floor((currentDate - periodStart) / (1000 * 60 * 60 * 24));

    if (daysSincePeriod < 0) {
      const cyclesBack = Math.ceil(Math.abs(daysSincePeriod) / cycleLength);
      const adjustedPeriodStart = new Date(periodStart);
      adjustedPeriodStart.setUTCDate(adjustedPeriodStart.getUTCDate() - (cyclesBack * cycleLength));
      const adjustedDays = Math.floor((currentDate - adjustedPeriodStart) / (1000 * 60 * 60 * 24));
      const cycleDay = (adjustedDays % cycleLength) + 1;
      const phaseInfo = getPhaseFromCycleDay(cycleDay, cycleLength, periodLen);
      calendar.push({
        date: currentDate,
        day: day,
        cycleDay,
        phase: phaseInfo.phase,
        phaseName: phaseInfo.phaseName,
        isPeriod: phaseInfo.isPeriod
      });
      if (phases[phaseInfo.phase]) phases[phaseInfo.phase].push(day);
    } else {
      const cycleDay = (daysSincePeriod % cycleLength) + 1;
      const phaseInfo = getPhaseFromCycleDay(cycleDay, cycleLength, periodLen);

      calendar.push({
        date: currentDate,
        day: day,
        cycleDay,
        phase: phaseInfo.phase,
        phaseName: phaseInfo.phaseName,
        isPeriod: phaseInfo.isPeriod
      });

      if (phases[phaseInfo.phase]) {
        phases[phaseInfo.phase].push(day);
      }
    }
  }

  return {
    calendar,
    phases
  };
};

const getPhaseFromCycleDay = (cycleDay, cycleLength, periodLength = 5) => {
  // Menstrual: days 1 to periodLength; ovulation ~mid-cycle; rest follicular/luteal
  const ovulationDay = Math.floor(cycleLength / 2); // Typically around day 14 for 28-day cycle

  let phase;
  let phaseName;
  let isPeriod = false;

  if (cycleDay >= 1 && cycleDay <= periodLength) {
    phase = 'menstrual';
    phaseName = 'Menstrual';
    isPeriod = true;
  } else if (cycleDay > periodLength && cycleDay < ovulationDay - 2) {
    phase = 'follicular';
    phaseName = 'Follicular';
  } else if (cycleDay >= ovulationDay - 2 && cycleDay <= ovulationDay + 2) {
    phase = 'ovulation';
    phaseName = 'Ovulation';
  } else {
    phase = 'luteal';
    phaseName = 'Luteal';
  }

  return { phase, phaseName, isPeriod };
};

export const calculateCyclePredictions = (user) => {
  if (!user.lastPeriodStart) {
    return {
      currentPhase: null,
      cycleDay: null,
      nextPeriod: null,
      nextOvulation: null,
      fertileWindow: null
    };
  }

  const cycleLength = user.cycleType === 'regular' 
    ? user.cycleLength || 28
    : user.cycleLengthRange 
      ? Math.round((user.cycleLengthRange.min + user.cycleLengthRange.max) / 2)
      : 28;

  const periodLen = user.periodLength ?? 5;
  const currentPhase = calculateCurrentPhase(user.lastPeriodStart, cycleLength, periodLen);
  const nextPeriod = calculateNextPeriod(user.lastPeriodStart, cycleLength);
  const nextOvulation = calculateNextOvulation(user.lastPeriodStart, cycleLength);
  const fertileWindow = calculateFertileWindow(user.lastPeriodStart, cycleLength);

  return {
    currentPhase: currentPhase ? {
      phase: currentPhase.phase,
      phaseName: currentPhase.phaseName,
      cycleDay: currentPhase.cycleDay
    } : null,
    cycleDay: currentPhase?.cycleDay || null,
    nextPeriod: nextPeriod ? {
      date: nextPeriod.date.toISOString(),
      daysUntil: nextPeriod.daysUntil,
      isOverdue: nextPeriod.isOverdue
    } : null,
    nextOvulation: nextOvulation ? {
      date: nextOvulation.date.toISOString(),
      daysUntil: nextOvulation.daysUntil
    } : null,
    fertileWindow: fertileWindow ? {
      start: fertileWindow.start.toISOString(),
      end: fertileWindow.end.toISOString(),
      ovulationDate: fertileWindow.ovulationDate.toISOString()
    } : null,
    cycleLength
  };
};

export default {
  calculateCurrentPhase,
  calculateNextPeriod,
  calculateNextOvulation,
  calculateFertileWindow,
  getEffectiveCycleLength,
  generateCalendarData,
  calculateCyclePredictions
};
