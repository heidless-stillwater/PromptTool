import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, error, icon, ...props }, ref) => {
        return (
            <div className="w-full space-y-1.5">
                {label && <label className="text-[10px] font-black uppercase tracking-widest text-foreground-muted ml-1">{label}</label>}
                <div className="relative">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none">
                            {icon}
                        </div>
                    )}
                    <input
                        type={type}
                        className={cn(
                            "w-full px-4 py-3 rounded-xl bg-background-secondary border border-border text-foreground transition-all duration-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-foreground-muted",
                            icon && "pl-11",
                            error && "border-error focus:border-error focus:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]",
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                </div>
                {error && <p className="text-xs text-error ml-1 font-medium">{error}</p>}
            </div>
        )
    }
)
Input.displayName = "Input"

export { Input }
