// รูปโปรไฟล์ ถ้าไม่มีรูปแสดงตัวอักษรแรกของชื่อ
export default function Avatar({ name, src, size = 32 }: { name: string; src?: string; size?: number }) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "?";
  const box = { width: size, height: size, fontSize: Math.max(11, size * 0.4) };
  if (src) return <img src={src} alt="" className="shrink-0 rounded-full object-cover" style={box} />;
  return <span className="btn-primary flex shrink-0 items-center justify-center rounded-full font-semibold" style={box}>{initial}</span>;
}
