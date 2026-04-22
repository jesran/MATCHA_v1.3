export default function SectionCard({ title, description, children, actions }) {
  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white/70 p-6 shadow-[0_18px_48px_rgba(132,122,173,0.08)] backdrop-blur">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1f3ea7]">{title}</h2>
          {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
