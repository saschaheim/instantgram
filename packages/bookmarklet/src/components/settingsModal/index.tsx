import { h } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { Program } from "../../App";
import localize from "../../helpers/localize";
import { uiClasses } from "../shared/uiTokens";

type SettingsPane = "general" | "stories";

export type SettingsConfig = {
  id: string;
  pane: SettingsPane;
  title: string;
  description: string;
  largeInput?: boolean;
};

const defaultFormat = "{Username}__{Year}-{Month}-{Day}--{Hour}-{Minute}";
const stored = (program: Program, id: string) =>
  localStorage.getItem(program.STORAGE_NAME+"_"+id) ?? (id === "g4" ? defaultFormat : "false");

export function SettingsModalBody({ program, settings, onSettingChange }: {
  program: Program;
  settings: SettingsConfig[];
  onSettingChange: (key: string, value: string | boolean) => void;
}) {
  const [pane, setPane] = useState<SettingsPane>("general");
  const [checks, setChecks] = useState(() => Object.fromEntries(
    settings.filter(({ largeInput }) => !largeInput).map(({ id }) => [id, stored(program, id) === "true"]),
  ));
  const [format, setFormat] = useState(() => stored(program, "g4"));
  const [saved, setSaved] = useState(false);
  const tcRef = useRef<HTMLDivElement>(null);
  const [minHeight, setMinHeight] = useState<number>();

  useLayoutEffect(() => {
    if (tcRef.current) {
      setMinHeight(tcRef.current.getBoundingClientRect().height);
    }
  }, []);

  useEffect(() => {
    if (!saved) return undefined;
    const timer = setTimeout(() => setSaved(false), 1000);
    return () => clearTimeout(timer);
  }, [saved]);

  const change = (id: string, value: boolean) => {
    localStorage.setItem(program.STORAGE_NAME+"_"+id, String(value));
    setChecks((current) => ({ ...current, [id]: value }));
    onSettingChange(id, value);
  };

  const save = () => {
    localStorage.setItem(program.STORAGE_NAME+"_g4", format);
    onSettingChange("g4", format);
    setSaved(true);
  };

  const reset = () => {
    if (!confirm(localize("clr.q"))) return;

    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index);
      if (key === program.STORAGE_NAME || key?.startsWith(program.STORAGE_NAME+"_")) {
        localStorage.removeItem(key);
      }
    }

    const resetChecks = Object.fromEntries(
      settings.filter(({ largeInput }) => !largeInput).map(({ id }) => [id, false]),
    );
    setChecks(resetChecks);
    setFormat(defaultFormat);
    setSaved(false);
    settings.forEach(({ id, largeInput }) => onSettingChange(id, largeInput ? defaultFormat : false));
  };

  const renderSetting = (setting: SettingsConfig) => {
    const title = localize(setting.title);
    const description = localize(setting.description);
    return (
      <div
        class={"si"+(setting.largeInput ? " wide" : "")}
        key={setting.id}
        title={setting.largeInput ? undefined : description}
        onClick={setting.largeInput ? undefined : () => change(setting.id, !checks[setting.id])}
      >
        <div class="sr">
          {setting.largeInput ? (
            <div class="sf">
              <strong>{title}</strong>
              <p class="sm mb-0">{description}</p>
              <input class="fi" value={format} placeholder={defaultFormat} onInput={(event) => setFormat(event.currentTarget.value)} />
              <button class={uiClasses.btn+" "+(saved ? uiClasses.btnSuccess : uiClasses.btnPrimary)+" mt-2"} onClick={save}>
                {localize(saved ? "sd" : "s")}
              </button>
            </div>
          ) : (
            <>
              <div class="sgw">
                <strong class="mb-0">{title}</strong>
              </div>
              <div class="se">
                <label class="slideon" onClick={(event) => event.stopPropagation()}>
                  <input type="checkbox" checked={checks[setting.id] || false} onChange={(event) => change(setting.id, event.currentTarget.checked)} />
                  <span class="slideon-slider" />
                </label>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div class="sg" style="text-align:left">
      <div class="sy">
        <div class="st">
          {(["general", "stories"] as SettingsPane[]).map((name) => (
            <button class={"tb"+(pane === name ? " active" : "")} onClick={() => setPane(name)}>
              {name === "general" ? localize("ms.g") : "Stories"}
            </button>
          ))}
        </div>
        <div class="tc" ref={tcRef} style={minHeight ? { minHeight: minHeight+"px" } : undefined}>
          <div class="tp">
            {settings.filter((setting) => setting.pane === pane).map(renderSetting)}
          </div>
        </div>
        <button class="sc" type="button" onClick={reset}>{localize("clr")}</button>
        <p style="text-align:center"><a class="sm" href="//saschaheim.github.io/instantgram">{localize("sup")}</a></p>
      </div>
    </div>
  );
}
