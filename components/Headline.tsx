const big = "block text-3xl sm:text-4xl md:text-5xl leading-tight font-serif";

// Big three-line title: two light lines and one vibrant accent line.
export function Headline({ light, bold }: { light: string[]; bold: string }) {
  return (
    <h1>
      {light.map((line) => (
        <span key={line} className={`${big} font-light text-[#e5e5e5]`}>
          {line}
        </span>
      ))}
      <span className={`${big} font-light italic text-[var(--primary-accent)]`}>{bold}</span>
    </h1>
  );
}

export function PageTitle({ light, bold }: { light: string; bold: string }) {
  return (
    <h1 className="text-2xl sm:text-3xl leading-tight tracking-tight font-serif">
      <span className="font-light text-[#e5e5e5]">{light} </span>
      <span className="font-light italic text-[var(--primary-accent)]">{bold}</span>
    </h1>
  );
}
