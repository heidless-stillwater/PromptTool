'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface TourStep {
    id: string;
    targetId: string;
    title: string;
    content: string;
    path?: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

interface TourContextType {
    isActive: boolean;
    currentStep: number;
    steps: TourStep[];
    startTour: (initialSteps?: TourStep[]) => void;
    nextStep: () => void;
    prevStep: () => void;
    skipTour: () => void;
}

export const DASHBOARD_STEPS: TourStep[] = [
    {
        id: 'welcome',
        targetId: 'dashboard-title',
        title: 'Welcome to the Studio!',
        content: "Let's take a quick 1-minute tour to help you master AI image generation.",
        position: 'bottom'
    },
    {
        id: 'credits',
        targetId: 'wallet-wisdom',
        title: 'Creative Energy',
        content: 'Your available credits are shown here. Different qualities consume different amounts of energy.',
        position: 'top'
    },
    {
        id: 'styles',
        targetId: 'starter-styles',
        title: 'Starter Styles',
        content: 'Not sure where to start? Pick one of these curated styles to jump-start your imagination.',
        position: 'top'
    },
    {
        id: 'go-to-studio',
        targetId: 'studio-link',
        title: 'Enter the Studio',
        content: "Ready to see the workshop? Let's head over to the Generator.",
        position: 'bottom',
        path: '/generate'
    }
];

export const GENERATOR_STEPS: TourStep[] = [
    {
        id: 'exemplar',
        targetId: 'tour-exemplar-2',
        title: 'Pick your starting point',
        content: 'Select an exemplar from the gallery to pre-fill the prompt and modifiers.',
        position: 'right'
    },
    {
        id: 'modifiers',
        targetId: 'tour-modifiers',
        title: 'The Modifiers Core',
        content: 'Tweak the active modifiers to refine the style and mood of your creation.',
        position: 'top'
    },
    {
        id: 'modality',
        targetId: 'tour-modality',
        title: 'Modality',
        content: 'Choose whether you want to generate an image or a video.',
        position: 'left'
    },
    {
        id: 'aspect-ratio',
        targetId: 'tour-aspect-ratio',
        title: 'Aspect Ratio',
        content: 'Select the dimension format for your generated media.',
        position: 'left'
    },
    {
        id: 'quality',
        targetId: 'tour-quality',
        title: 'Quality',
        content: 'Pick the output quality. Higher quality costs more energy credits.',
        position: 'left'
    },
    {
        id: 'batch',
        targetId: 'tour-batch-size',
        title: 'Batch Size',
        content: 'Choose how many variations to generate in one go.',
        position: 'left'
    },
    {
        id: 'finish',
        targetId: 'manifest-button',
        title: 'Generate Studio Batch',
        content: "You're all set! Click here to bring your vision to life. Happy creating!",
        position: 'top'
    }
];

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
    const [isActive, setIsActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [overrideSteps, setOverrideSteps] = useState<TourStep[] | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    const defaultSteps = pathname === '/generate' ? GENERATOR_STEPS : DASHBOARD_STEPS;
    const steps = overrideSteps || defaultSteps;

    const startTour = useCallback((initialSteps?: TourStep[]) => {
        if (initialSteps) setOverrideSteps(initialSteps);
        else setOverrideSteps(null);
        setCurrentStep(0);
        setIsActive(true);
    }, []);

    const skipTour = useCallback(() => {
        setIsActive(false);
        setCurrentStep(0);
        setOverrideSteps(null);
    }, []);

    const nextStep = useCallback(() => {
        const currentStepData = steps[currentStep];

        if (currentStepData.path && pathname !== currentStepData.path) {
            router.push(currentStepData.path);
            setCurrentStep(0);
            return;
        }

        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            setIsActive(false);
            setOverrideSteps(null);
        }
    }, [currentStep, steps, pathname, router]);

    const prevStep = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep]);

    // Handle cross-page transitions
    useEffect(() => {
        // If we arrive at a new page and aren't using overridden steps,
        // reset the step to 0 for the new page's default steps
        if (isActive && !overrideSteps && currentStep !== 0) {
            setCurrentStep(0);
        }

        // If we arrive at the generator, clear overrides so we use generator steps naturally
        if (pathname === '/generate' && overrideSteps === GENERATOR_STEPS) {
            setOverrideSteps(null);
        }
    }, [pathname, isActive, overrideSteps, currentStep]);

    return (
        <TourContext.Provider value={{ isActive, currentStep, steps, startTour, nextStep, prevStep, skipTour }}>
            {children}
        </TourContext.Provider>
    );
}

export function useTour() {
    const context = useContext(TourContext);
    if (!context) throw new Error('useTour must be used within a TourProvider');
    return context;
}
