import { Fragment } from "react";

type Props = {
  text: string;
};

// Renders `backtick` spans from Claude's response as actual inline <code>
// elements instead of leaving the literal backticks in the plain text.
export default function InlineCodeText({ text }: Props) {
  const parts = text.split(/(`[^`]+`)/g).filter((part) => part.length > 0);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
          return (
            <code
              key={i}
              className="rounded-sm bg-(--bg-elevated) px-1 py-0.5 font-mono text-[11px] text-(--accent-strong)"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
