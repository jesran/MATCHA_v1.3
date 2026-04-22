export default function TagList({ items, tone = "default" }) {
  if (!items?.length) {
    return <span className="text-sm text-slate-500">No data yet</span>;
  }

  const toneClass =
    tone === "accent"
      ? "border-[#7d5cff]/20 bg-[#7455f7] text-white"
      : "border-[#dce7e4] bg-[#e9f3f1] text-[#244a46]";

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={`rounded-full border px-4 py-2 text-sm font-medium ${toneClass}`}>
          {item}
        </span>
      ))}
    </div>
  );
}
