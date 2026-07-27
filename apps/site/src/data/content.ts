export const localeContent = {
  "en-US": {
    langIso: "en",
    name: "English",
    link: "https://saschaheim.github.io/instantgram/",
    projectLead: "☁️ A bookmarklet for downloading images from Instagram.",
    projectButtonHelper: "drag this button to the bookmark bar of your browser.",
    projectDescription:
      "[instantgram] is a bookmarklet for downloading single images from Instagram. Tiny, simple, without any further extensions or downloads. Just drag the [instantgram] button to the bookmark bar of your browser, open any Instagram post and click on the bookmarklet. Just works  :-)",
  },
  "de-DE": {
    langIso: "de",
    name: "German (Deutsch)",
    link: "https://saschaheim.github.io/instantgram/lang/de-de",
    projectLead: "☁️ Ein Bookmarklet, um Bilder auf Instagram herunterzuladen",
    projectButtonHelper: "Ziehe diesen Button in die Favoritenleiste deines Browsers.",
    projectDescription:
      "[instantgram] ist ein Bookmarklet, um einzelne Instagram Bilder herunterzuladen. Klein, simpel, ohne Abhängigkeiten zu anderen Erweiterungen oder Downloads. Ziehe einfach den [instantgram] button in die Favoritenleiste deines Browsers, öffne einen einzelnen Instagram Post und klicke auf das Bookmarklet. So einfach :-)",
  },
  "pt-BR": {
    langIso: "pt",
    name: "Portuguese (Brasil)",
    link: "https://saschaheim.github.io/instantgram/lang/pt-br",
    projectLead: "☁️ Um bookmarklet para download de fotos do Instagram",
    projectButtonHelper: "arraste o botão acima para a barra de favoritos do navegador",
    projectDescription:
      "[instantgram] é um bookmarklet com a função de baixar imagens do Instagram. Pequeno, simples, sem necessidade de extensões ou downloads. Só é necessário arrastar o link do [instantgram] para a barra de favoritos do seu navegador, ir até o instagram.com (versão web), abrir um post e clicar no bookmarklet. Simples e funcional.",
  },
  "es-AR": {
    langIso: "es",
    name: "Spanish (Argentina)",
    link: "https://saschaheim.github.io/instantgram/lang/es-ar",
    projectLead: "☁️ Un bookmarklet para descargar imágenes de Instagram.",
    projectButtonHelper: "Arrastre este botón a la barra de favoritos de su navegador.",
    projectDescription:
      "[instantgram] es un bookmarklet para descargar imágenes individuales de Instagram. Minúsculo, sencillo, sin más extensiones ni descargas. Sólo tienes que arrastrar el botón [instantgram] a la barra de marcadores de tu navegador, abrir cualquier publicación de Instagram y hacer clic en el bookmarklet. Simplemente funciona :-)",
  },
} as const;

export const locales = Object.keys(localeContent) as Array<keyof typeof localeContent>;
