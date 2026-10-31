import { useEffect, useRef, useState, type ReactNode } from "react";
const paths: Record<string, ReactNode> = {
  home: <path d="m3 10 9-7 9 7v10H4V10m5 10v-7h6v7" />,
  tools: (
    <path d="M14 5a5 5 0 0 0-6 6L3 16a3 3 0 0 0 5 5l6-6a5 5 0 0 0 6-6l-4 3-4-4 2-3Z" />
  ),
  pulse: <path d="M2 12h5l3-9 4 18 3-9h5" />,
  bell: <path d="M5 16h14l-2-3V8a5 5 0 0 0-10 0v5l-2 3Zm5 4h4" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v7l4 2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="7" r="3" />
      <path d="M5 21v-5a7 7 0 0 1 14 0v5Z" />
    </>
  ),
  settings: (
    <>
      <path d="m9 3-1 3-3 1v4l-2 1 2 2v3l3 1 1 3h5l1-3 3-1v-3l3-2-3-2V7l-3-1-1-3Z" />
      <circle cx="11.5" cy="12" r="3" />
    </>
  ),
  moon: <path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2" />
    </>
  ),
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
};
export function Icon({ name }: { name: string }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name] || paths.user}
    </svg>
  );
}
export function Theme() {
  const [dark, setDark] = useState(
    () => localStorage.getItem("centralpdf-admin-theme") === "dark",
  );
  useEffect(() => {
    document.body.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("centralpdf-admin-theme", dark ? "dark" : "light");
  }, [dark]);
  return (
    <button
      className="theme"
      role="switch"
      aria-label="Tema escuro"
      aria-checked={dark}
      onClick={() => setDark(!dark)}
    >
      <span>
        <Icon name="moon" />
        Escuro
      </span>
      <span>
        <Icon name="sun" />
        Claro
      </span>
    </button>
  );
}
export function Heading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1 tabIndex={-1}>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
export function Message({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <p
      role={error ? "alert" : "status"}
      className={"note-box" + (error ? " error-message" : "")}
    >
      {children}
    </p>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose} aria-label={title}>
      <header>
        <h2>{title}</h2>
        <button onClick={onClose} aria-label="Fechar">
          ×
        </button>
      </header>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}
