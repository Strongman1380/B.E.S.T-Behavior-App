import { useEffect, useState } from "react";
import { BehaviorSummary } from "@/api/entities";

export default function useBehaviorSummaries(studentIds, date) {
  const [summaries, setSummaries] = useState({});
  useEffect(() => {
    if (!studentIds || studentIds.length === 0) return;
    let isMounted = true;
    (async () => {
      // Fetch summaries for all students for the given date
      const allSummaries = await BehaviorSummary.list('-date_range_end');
      // Filter for each student and date
      const summaryMap = {};
      studentIds.forEach(id => {
        // Find summary for student for the date
        const summary = allSummaries.find(s => s.student_id === id && s.date_range_end === date);
        summaryMap[id] = summary || null;
      });
      if (isMounted) setSummaries(summaryMap);
    })();
    return () => { isMounted = false; };
  }, [studentIds, date]);
  return summaries;
}
