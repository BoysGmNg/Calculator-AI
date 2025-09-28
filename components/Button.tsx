import React from 'react';

type ButtonVariant = 'default' | 'number' | 'operator' | 'advanced' | 'special1' | 'special2' | 'toggleActive';

interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
    label: string | React.ReactNode;
    onClick: () => void;
    className?: string;
    variant?: ButtonVariant;
    isActive?: boolean;
    isDisabled?: boolean;
    isDraggable?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
    label, 
    onClick, 
    className, 
    variant = 'default', 
    isActive = false,
    isDisabled = false,
    isDraggable = false,
    ...dragProps
}) => {
    
    if (variant === 'number') variant = 'default';

    const baseClasses = "rounded-2xl text-2xl font-medium w-full aspect-square flex items-center justify-center transition-all duration-150 ease-in-out transform active:scale-95 focus:outline-none focus:ring-2 ring-inset focus:ring-[--color-accent] focus:ring-opacity-50";

    const variantClasses: Record<ButtonVariant, string> = {
        default: 'bg-[--color-buttonBackground] hover:bg-[--color-buttonBackgroundHover] text-[--color-textPrimary]',
        number: 'bg-[--color-buttonBackground] hover:bg-[--color-buttonBackgroundHover] text-[--color-textPrimary]',
        operator: 'bg-[--color-buttonOperatorBackground] hover:bg-[--color-buttonOperatorBackgroundHover] text-[--color-accent]',
        advanced: 'bg-[--color-buttonAdvancedBackground] hover:bg-[--color-buttonAdvancedBackgroundHover] text-[--color-textPrimary]',
        special1: 'bg-[--color-buttonSpecial1Background] hover:bg-[--color-buttonSpecial1BackgroundHover] text-[--color-accent]',
        special2: 'bg-[--color-buttonSpecial2Background] hover:bg-[--color-buttonSpecial2BackgroundHover] text-[--color-textPrimary]',
        toggleActive: 'bg-[--color-accent] hover:bg-[--color-accentHover] text-[--color-background]',
    };
    
    const colorClasses = variantClasses[variant] || variantClasses.default;
    const activeClasses = isActive ? variantClasses.toggleActive : colorClasses;
    const disabledClasses = isDisabled ? 'opacity-40 cursor-not-allowed' : '';
    const draggableClasses = isDraggable ? 'cursor-grab animate-wobble' : '';

    return (
        <>
        {isDraggable && (
             <style>{`
                @keyframes wobble {
                    0%, 100% { transform: rotate(-1deg); }
                    50% { transform: rotate(1deg); }
                }
                .animate-wobble {
                    animation: wobble 0.5s ease-in-out infinite;
                }
            `}</style>
        )}
        <button
            onClick={onClick}
            disabled={isDisabled || isDraggable}
            className={`${baseClasses} ${activeClasses} ${disabledClasses} ${draggableClasses} ${className || ''}`}
            draggable={isDraggable}
            {...dragProps}
        >
            {label}
        </button>
        </>
    );
};

export default Button;