import type { ReactNode } from "react";

/** Presentational section wrapper for the campaign detail page (server-safe). */
export default function DetailSection({
  icon,
  title,
  description,
  children,
  id,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="card-elevated p-5">
      <div className="mb-1 flex items-center gap-2">
        {icon && <span className="text-primary">{icon}</span>}
        <h2 className="text-base font-700 text-foreground">{title}</h2>
      </div>
      {description && (
        <p className="mb-4 text-2xs leading-6 text-muted-foreground">
          {description}
        </p>
      )}
      <div className={description ? "" : "mt-4"}>{children}</div>
    </section>
  );
}
