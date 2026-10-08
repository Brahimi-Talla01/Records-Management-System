/**
 * Lien d'évitement (« skip to content ») — premier élément focusable de la page.
 * Invisible au repos, révélé au focus clavier, il saute directement au contenu
 * principal (`#main-content`).
 */
const SkipLink = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[2000] focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:shadow-modal"
  >
    Aller au contenu principal
  </a>
);

export default SkipLink;
