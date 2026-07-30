import { h } from "preact";
import { formatVersionLabel } from "../helpers/common";
import localize from "../helpers/localize";

const inline = (text: string) => text
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/`([^`]+)`/g, "<code style=\"font-size:.95em;background:#ebe5df;color:#101820;padding:2px 6px;border-radius:6px\">$1</code>")
  .replace(/\*\*([^*]+)\*\*/g, "<strong style=\"font-weight:700;color:#101820\">$1</strong>");

function Changelog({ text }: { text: string }) {
  const intro: string[] = [];
  const details: string[] = [];
  let captured = false;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (!captured && /^\*\*.+\*\*$/.test(line)) {
      intro.push(line);
    } else {
      details.push(line.replace(/^[-*]\s+/, ""));
    }
    captured = true;
  }

  return (
    <div style="padding:26px 28px 18px;text-align:left;font-size:14px">
      <div style="padding:0 0 18px;margin:0 0 18px;border-bottom:1px solid #ded8d2">
        {intro.map((line) => (
          <p style="margin:0;font-size:18px;font-weight:800;line-height:1.25;letter-spacing:-.02em;color:#101820" dangerouslySetInnerHTML={{ __html: inline(line) }} />
        ))}
      </div>
      <ul style="margin:0;padding:0;list-style:none;color:#101820">
        {details.map((line) => (
          <li style="position:relative;margin:0 0 12px;padding:0 0 0 18px;line-height:1.62;color:#36434d">
            <span style="position:absolute;left:0;top:.58em;width:7px;height:7px;border-radius:999px;background:#367da3" />
            <span dangerouslySetInnerHTML={{ __html: inline(line) }} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function UpdateModalBody({ localVersion, onlineVersion, text }: {
  localVersion: string;
  onlineVersion: string;
  text: string;
}) {
  return (
    <>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px">
        <div style="min-width:0;font-size:24px;font-weight:800;line-height:1.02;letter-spacing:-.03em;color:#fff">
          {localize("u.t")}
        </div>
        <div style="flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;padding:8px 11px;border-radius:999px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.24);white-space:nowrap">
          <span style="font-size:12px;font-weight:700;color:#fff">{formatVersionLabel(localVersion)}</span>
          <span style="font-size:14px;font-weight:800;line-height:1;color:#fff">&rarr;</span>
          <span style="font-size:13px;font-weight:800;color:#fff">{formatVersionLabel(onlineVersion)}</span>
        </div>
      </div>
      <Changelog text={text} />
    </>
  );
}
