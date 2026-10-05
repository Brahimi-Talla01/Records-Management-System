import { HelpCircle } from 'lucide-react';
import { ICONS } from './icons';

/**
 * Icône unique de l'application.
 *
 * La couleur est **toujours** héritée via `currentColor` : on colore une icône
 * avec une classe de token sur le parent (`text-primary-foreground`, `text-error`…),
 * jamais avec une prop `color` (celle-ci est volontairement ignorée).
 *
 * Les icônes disponibles sont déclarées dans `./icons` (registre nommé) : c'est
 * ce qui évite d'embarquer toute la bibliothèque lucide dans le bundle.
 */
function Icon({
    name,
    size = 24,
    className = '',
    strokeWidth = 2,
    color: _color,
    ...props
}) {
    const IconComponent = ICONS[name];

    if (!IconComponent) {
        return <HelpCircle size={size} strokeWidth={strokeWidth} className={className} {...props} />;
    }

    return <IconComponent
        size={size}
        strokeWidth={strokeWidth}
        className={className}
        {...props}
    />;
}
export default Icon;
