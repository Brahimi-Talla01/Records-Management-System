// components/ui/Select.jsx - Shadcn style Select
import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";
import { cn } from "../../utils/cn";
import Button from "./Button";
import Input from "./Input";

/**
 * Select contrôlé personnalisé.
 *
 * Accessibilité : bouton `aria-haspopup="listbox"` + `aria-expanded`, liste
 * `role="listbox"` / options `role="option"` avec `aria-selected`, navigation
 * clavier complète (flèches, Début/Fin, Entrée/Espace, Échap), label relié via
 * `htmlFor` et description/erreur reliées par `aria-describedby`.
 */
const Select = React.forwardRef(({
    className,
    options = [],
    value,
    defaultValue: _defaultValue,
    placeholder = "Select an option",
    multiple = false,
    disabled = false,
    required = false,
    label,
    description,
    error,
    searchable = false,
    clearable = false,
    loading = false,
    id,
    name,
    onChange,
    onOpenChange,
    ...props
}, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeIndex, setActiveIndex] = useState(-1);
    const searchRef = useRef(null);

    // Generate unique ID if not provided
    const selectId = id || `select-${Math.random()?.toString(36)?.substr(2, 9)}`;
    const labelId = `${selectId}-label`;
    const listboxId = `${selectId}-listbox`;
    const descriptionId = `${selectId}-description`;
    const errorId = `${selectId}-error`;

    // Filter options based on search
    const filteredOptions = searchable && searchTerm
        ? options?.filter(option =>
            option?.label?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
            (option?.value && option?.value?.toString()?.toLowerCase()?.includes(searchTerm?.toLowerCase()))
        )
        : options;

    // Get selected option(s) for display
    const getSelectedDisplay = () => {
        if (!value) return placeholder;

        if (multiple) {
            const selectedOptions = options?.filter(opt => value?.includes(opt?.value));
            if (selectedOptions?.length === 0) return placeholder;
            if (selectedOptions?.length === 1) return selectedOptions?.[0]?.label;
            return `${selectedOptions?.length} items selected`;
        }

        const selectedOption = options?.find(opt => opt?.value === value);
        return selectedOption ? selectedOption?.label : placeholder;
    };

    const isSelected = (optionValue) => {
        if (multiple) {
            return value?.includes(optionValue) || false;
        }
        return value === optionValue;
    };

    const hasValue = multiple ? value?.length > 0 : value !== undefined && value !== '';

    const openMenu = () => {
        if (disabled) return;
        setIsOpen(true);
        onOpenChange?.(true);
        const selectedIdx = filteredOptions?.findIndex((opt) => isSelected(opt?.value));
        setActiveIndex(selectedIdx >= 0 ? selectedIdx : 0);
    };

    const closeMenu = () => {
        setIsOpen(false);
        onOpenChange?.(false);
        setSearchTerm("");
        setActiveIndex(-1);
    };

    const handleToggle = () => {
        if (disabled) return;
        if (isOpen) closeMenu();
        else openMenu();
    };

    // Focus la recherche quand le menu s'ouvre (mode `searchable`).
    useEffect(() => {
        if (isOpen && searchable) searchRef.current?.focus();
    }, [isOpen, searchable]);

    const handleOptionSelect = (option) => {
        if (multiple) {
            const current = value || [];
            const updatedValue = current?.includes(option?.value)
                ? current?.filter(v => v !== option?.value)
                : [...current, option?.value];
            onChange?.(updatedValue);
        } else {
            onChange?.(option?.value);
            closeMenu();
        }
    };

    const handleClear = (e) => {
        e?.stopPropagation();
        onChange?.(multiple ? [] : '');
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e?.target?.value);
        setActiveIndex(0);
    };

    // Navigation clavier commune au bouton et au champ de recherche.
    const handleKeyDown = (e) => {
        if (disabled) return;
        const lastIndex = (filteredOptions?.length || 0) - 1;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (!isOpen) openMenu();
                else setActiveIndex((i) => Math.min(i + 1, lastIndex));
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (!isOpen) openMenu();
                else setActiveIndex((i) => Math.max(i - 1, 0));
                break;
            case 'Home':
                if (isOpen) { e.preventDefault(); setActiveIndex(0); }
                break;
            case 'End':
                if (isOpen) { e.preventDefault(); setActiveIndex(lastIndex); }
                break;
            case 'Enter':
            case ' ':
                if (!isOpen) {
                    e.preventDefault();
                    openMenu();
                } else if (activeIndex >= 0 && filteredOptions?.[activeIndex]) {
                    e.preventDefault();
                    handleOptionSelect(filteredOptions[activeIndex]);
                }
                break;
            case 'Escape':
                if (isOpen) { e.preventDefault(); closeMenu(); }
                break;
            case 'Tab':
                if (isOpen) closeMenu();
                break;
            default:
                break;
        }
    };

    return (
        <div className={cn("relative", className)}>
            {label && (
                <label
                    id={labelId}
                    htmlFor={selectId}
                    className={cn(
                        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block",
                        error ? "text-error" : "text-foreground"
                    )}
                >
                    {label}
                    {required && <span className="text-error ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                <button
                    ref={ref}
                    id={selectId}
                    type="button"
                    className={cn(
                        "flex h-10 w-full items-center justify-between rounded-md border border-border bg-input text-foreground px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        error && "border-error focus:ring-error",
                        !hasValue && "text-muted-foreground"
                    )}
                    onClick={handleToggle}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    aria-controls={isOpen ? listboxId : undefined}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={
                        [description && !error ? descriptionId : null, error ? errorId : null]
                            .filter(Boolean)
                            .join(' ') || undefined
                    }
                    {...props}
                >
                    <span className="truncate">{getSelectedDisplay()}</span>

                    <div className="flex items-center gap-1">
                        {loading && (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        )}

                        {clearable && hasValue && !loading && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4"
                                aria-label="Effacer la sélection"
                                onClick={handleClear}
                            >
                                <X className="h-3 w-3" aria-hidden="true" />
                            </Button>
                        )}

                        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                    </div>
                </button>

                {/* Select natif masqué : conserve `name` pour la soumission de formulaire. */}
                <select
                    name={name}
                    value={value || ''}
                    onChange={() => { }} // Contrôlé par la logique ci-dessus
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                    multiple={multiple}
                >
                    <option value="">Select...</option>
                    {options?.map(option => (
                        <option key={option?.value} value={option?.value}>
                            {option?.label}
                        </option>
                    ))}
                </select>

                {/* Dropdown */}
                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border border-border rounded-md shadow-md">
                        {searchable && (
                            <div className="p-2 border-b">
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                    <Input
                                        ref={searchRef}
                                        placeholder="Search options..."
                                        aria-label="Rechercher une option"
                                        value={searchTerm}
                                        onChange={handleSearchChange}
                                        onKeyDown={handleKeyDown}
                                        className="pl-8"
                                    />
                                </div>
                            </div>
                        )}

                        <div
                            id={listboxId}
                            role="listbox"
                            aria-labelledby={label ? labelId : undefined}
                            aria-label={label ? undefined : 'Options disponibles'}
                            aria-multiselectable={multiple || undefined}
                            className="py-1 max-h-60 overflow-auto"
                        >
                            {filteredOptions?.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                    {searchTerm ? 'No options found' : 'No options available'}
                                </div>
                            ) : (
                                filteredOptions?.map((option, index) => (
                                    <div
                                        key={option?.value}
                                        id={`${listboxId}-option-${index}`}
                                        role="option"
                                        aria-selected={isSelected(option?.value)}
                                        aria-disabled={option?.disabled || undefined}
                                        className={cn(
                                            "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none",
                                            index === activeIndex && "bg-accent text-accent-foreground",
                                            isSelected(option?.value) && "bg-primary text-primary-foreground",
                                            option?.disabled && "pointer-events-none opacity-50"
                                        )}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        onClick={() => !option?.disabled && handleOptionSelect(option)}
                                    >
                                        <span className="flex-1">{option?.label}</span>
                                        {multiple && isSelected(option?.value) && (
                                            <Check className="h-4 w-4" aria-hidden="true" />
                                        )}
                                        {option?.description && (
                                            <span className="text-xs text-muted-foreground ml-2">
                                                {option?.description}
                                            </span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
            {description && !error && (
                <p id={descriptionId} className="text-sm text-muted-foreground mt-1">
                    {description}
                </p>
            )}
            {error && (
                <p id={errorId} role="alert" className="text-sm text-error mt-1">
                    {error}
                </p>
            )}
        </div>
    );
});

Select.displayName = "Select";

export default Select;
