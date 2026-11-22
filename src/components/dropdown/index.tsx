import Chevron from "payload/dist/admin/components/icons/Chevron";
import React, { useState } from "react";

interface Props {
  triggerText: string;
  items: { label: string; action: () => void }[];
  className?: string;
}

export const Dropdown = (props: Readonly<Props>) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`selectMenu ${props.className ?? ""}`}>
      {expanded && (
        <button
          type="button"
          className="backdrop"
          aria-label="Menü schließen"
          onClick={() => setExpanded(false)}
        />
      )}

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span>{props.triggerText}</span>
        <span className="icon">
          <Chevron />
        </span>
      </button>

      <div className="menu" aria-expanded={expanded}>
        <ul>
          {props.items.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => {
                  item.action();
                  setExpanded(false);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
