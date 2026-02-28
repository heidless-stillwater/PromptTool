import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
    size?: 'sm' | 'md' | 'lg' | 'icon'
    isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
        const variants = {
            primary: 'bg-gradient-to-r from-primary to-accent text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(217,70,239,0.6)] hover:scale-[1.02] border border-white/10',
            secondary: 'bg-card border-2 border-border text-foreground hover:bg-card-hover hover:border-primary/50 shadow-[0_4px_10px_rgba(0,0,0,0.3)]',
            outline: 'border-2 border-border hover:border-primary/50 hover:bg-card-hover text-foreground',
            ghost: 'hover:bg-primary/10 text-primary',
            danger: 'bg-error/10 text-error border-2 border-error/20 hover:bg-error/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]',
        }

        const sizes = {
            sm: 'px-3 py-1.5 text-xs tracking-wider uppercase',
            md: 'px-6 py-3 tracking-wide',
            lg: 'px-8 py-4 text-lg tracking-widest uppercase',
            icon: 'p-2',
        }

        return (
            <button
                className={cn(
                    'relative inline-flex items-center justify-center rounded-lg font-bold transition-all duration-300 active:scale-[0.95] disabled:opacity-50 disabled:pointer-events-none',
                    variants[variant],
                    size !== 'icon' && sizes[size as keyof typeof sizes],
                    size === 'icon' && sizes.icon,
                    className
                )}
                ref={ref}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <>
                        <span className="opacity-0">{children}</span>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        </div>
                    </>
                ) : (
                    children
                )}
            </button>
        )
    }
)
Button.displayName = "Button"

export { Button }
