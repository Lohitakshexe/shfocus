/**
 * Calculates the start of the current tracking week (Monday 2:00 AM).
 * Any sessions before 2 AM on Monday are attributed to the previous week.
 */
export const getWeekStart = (referenceDate = new Date()) => {
  // Shift reference date back by 2 hours to handle the 2 AM boundary easily
  const shiftedDate = new Date(referenceDate.getTime() - (2 * 60 * 60 * 1000));
  const day = shiftedDate.getDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = (day === 0 ? 6 : day - 1);
  
  const mondayStart = new Date(shiftedDate);
  mondayStart.setDate(shiftedDate.getDate() - diffToMonday);
  mondayStart.setHours(2, 0, 0, 0);
  mondayStart.setMilliseconds(0);
  
  return mondayStart;
};
