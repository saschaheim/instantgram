export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export const normalizeVersionString = (version: string): string =>
    version.replace(/^v/i, "").trim().replace(/\./g, "-");

export const formatVersionLabel = (version: string): string =>
    `v${normalizeVersionString(version).replace(/-/g, ".")}`;

export const formatVersionTransition = (fromVersion: string, toVersion: string): string =>
    `${formatVersionLabel(fromVersion)} -> ${formatVersionLabel(toVersion)}`;

export const buildModalHeader = (left: string, right: string, middle = ""): string =>
    `<h5>
        <span class="header-text-left">${left}</span>
        ${middle ? `<span class="header-text-middle">${middle}</span>` : ""}
        <span class="header-text-right">${right}</span>
    </h5>`;

export const getBrowserInfo = (): { name: string; version: string } => {
    const ua = navigator.userAgent;
    const match = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    let temp: RegExpExecArray | RegExpMatchArray | null;

    if (/trident/i.test(match[1] || "")) {
        temp = /\brv[ :]+(\d+)/g.exec(ua);
        return { name: "IE", version: temp?.[1] || "" };
    }

    if (match[1] === "Chrome") {
        temp = ua.match(/\b(OPR|Edge)\/(\d+)/);
        if (temp) {
            return { name: temp[1].replace("OPR", "Opera"), version: temp[2] };
        }
    }

    if (match.length > 1) {
        const versionMatch = ua.match(/version\/(\d+)/i);
        if (versionMatch) {
            match[2] = versionMatch[1];
        }
        return { name: match[1], version: match[2] };
    }

    return { name: navigator.appName, version: navigator.appVersion };
};
