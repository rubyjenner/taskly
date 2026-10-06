import { useEffect, useState } from "react";
import { timeAgo } from "../lib/datetime";
import { usePrefs } from "../lib/prefs";

// แสดงเวลาแบบ "5 นาทีที่แล้ว" และอัปเดตเองทุก 30 วินาที (hover ดูเวลาเต็ม)
export default function TimeAgo({ iso }: { iso: string }) {
  const { lang } = usePrefs();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return <time dateTime={iso} title={new Date(iso).toLocaleString(lang === "th" ? "th-TH" : "en-GB")}>{timeAgo(iso, lang, now)}</time>;
}
