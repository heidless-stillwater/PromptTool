"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queries/useQueryHooks";
import { Icons } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { motion, AnimatePresence } from "framer-motion";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import HistorySidebar from "@/components/generate/HistorySidebar";
import Tooltip from "@/components/Tooltip";
import { normalizeImageData } from "@/lib/image-utils";
import { formatDate } from "@/lib/date-utils";
import { useToast } from "@/components/Toast";
import { GeneratedImage } from "@/lib/types";
import { DNAStrip } from "@/components/generate/DNAViews";
import DNAModifierModal from "@/components/generate/DNAModifierModal";
import { MODIFIER_CATEGORIES } from "@/lib/constants";
import { Suspense } from "react";
import { cn, sanitizeAIResponse } from "@/lib/utils";
import ImageGroupModal from "@/components/gallery/ImageGroupModal";
import { GallerySelectionModal } from "@/components/gallery/GallerySelectionModal";
import { useSettings, type UserLevel } from "@/lib/context/SettingsContext";
import { CREDIT_COSTS, getGenerationCost } from "@/lib/types";
import RefillModal from "@/components/billing/RefillModal";
import ConfirmationModal from "@/components/ConfirmationModal";
import VisualStylePicker, {
  VisualStyle,
} from "@/components/generate/VisualStylePicker";
import { VariableProvider, useVariables } from "@/lib/context/VariableContext";
import { ActiveVariablesPanel } from "@/components/generate/ActiveVariablesPanel";
import { VariableInteractiveEditor } from "@/components/generate/VariableInteractiveEditor";
import { VariableInjector } from "@/components/generate/VariableInjector";
import { VariableVault } from "@/components/generate/VariableVault";
import { syncModifiersWithText, syncVariablesWithText, getActiveModifiersFromText } from "@/lib/prompt-utils";

// --- TYPES ---
export type PresentationMode = "grid-sm" | "grid-md" | "grid-lg" | "list";
export type MediaType = "image" | "video";

export interface Modifier {
  id: string;
  category: string;
  value: string;
}

export interface Exemplar {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl?: string;
  subjectBase: string;
  modifiers: Modifier[];
}

export interface GeneratorState {
  mediaType: MediaType;
  quality: "standard" | "high" | "ultra";
  aspectRatio: string;
  batchSize: number;
  promptSetId: string;
  promptSetName?: string;
  seed?: number;
  guidanceScale?: number;
  negativePrompt?: string;
  modelType?: "standard" | "pro";
  safetyThreshold?: "strict" | "medium" | "permissive";
  attributionName?: string;
  attributionUrl?: string;
  originatorName?: string;
  originatorUrl?: string;
}

// --- CONSTANTS ---

const CHARACTER_LIMIT = 100;

/**
 * Normalizes legacy modifiers or misaligned strings to match the current UI categories and options.
 * This fixes the "ghost modifier" issue where a style might be active but not highlighted in the UI.
 */
function normalizeModifier(
  category: string,
  value: string,
): { category: string; value: string } {
  const lowVal = value.toLowerCase().trim();
  const lowCat = category.toLowerCase().trim();

  // 1. Style & Medium mapping (Legacy to Current)
  if (lowVal.includes("studio ghibli"))
    return { category: "style", value: "Studio Ghibli" };
  if (lowVal === "anime/manga style" || lowVal === "anime")
    return { category: "medium", value: "Anime" };
  if (lowVal === "oil painting")
    return { category: "medium", value: "Oil Painting" };
  if (lowVal === "watercolor")
    return { category: "medium", value: "Watercolor" };
  if (lowVal === "digital art")
    return { category: "medium", value: "Digital Illustration" };
  if (lowVal === "digital illustration")
    return { category: "medium", value: "Digital Illustration" };
  if (lowVal === "pop art") return { category: "style", value: "Pop Art" };
  if (lowVal === "photorealistic")
    return { category: "magic", value: "Photorealistic" };
  if (lowVal === "surrealist" || lowVal === "surrealism")
    return { category: "style", value: "Surrealism" };
  if (lowVal === "cyberpunk") return { category: "style", value: "Cyberpunk" };
  if (lowVal === "steampunk") return { category: "style", value: "Steampunk" };
  if (lowVal === "minimalist")
    return { category: "style", value: "Minimalist" };
  if (lowVal === "fantasy") return { category: "style", value: "Fantasy" };
  if (lowVal === "noir") return { category: "style", value: "Noir" };
  if (lowVal === "vaporwave") return { category: "style", value: "Vaporwave" };

  if (lowCat === "mood" || lowCat === "atmosphere") {
    if (lowVal.includes("calm") || lowVal.includes("peaceful") || lowVal.includes("serene"))
      return { category: "atmosphere", value: "Serene" };
    if (lowVal.includes("whimsical") || lowVal.includes("playful") || lowVal.includes("joyful"))
      return { category: "atmosphere", value: "Joyful" };
    if (lowVal.includes("dark") || lowVal.includes("mysterious") || lowVal.includes("eerie") || lowVal.includes("ominous"))
      return { category: "atmosphere", value: "Ominous" };
    if (lowVal.includes("vibrant") || lowVal.includes("energetic"))
      return { category: "color", value: "Vibrant" };
    if (lowVal.includes("dramatic") || lowVal.includes("intense") || lowVal.includes("cinematic"))
      return { category: "lighting", value: "Cinematic" };
    if (lowVal.includes("nostalgic") || lowVal.includes("warm"))
      return { category: "atmosphere", value: "Nostalgic" };
    if (lowVal.includes("stormy"))
      return { category: "atmosphere", value: "Stormy" };
    if (lowVal.includes("epic"))
      return { category: "atmosphere", value: "Epic" };
    if (lowVal.includes("melancholy"))
      return { category: "atmosphere", value: "Melancholy" };
    if (lowVal.includes("dreamlike"))
      return { category: "atmosphere", value: "Dreamlike" };
    if (lowVal.includes("ethereal"))
      return { category: "atmosphere", value: "Ethereal" };
    if (lowVal.includes("chaotic"))
      return { category: "atmosphere", value: "Chaotic" };

    // No fallback to "Serene" - preserve original value if possible, capitalized
    return {
      category: "atmosphere",
      value: value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(),
    };
  }

  // 3. Setting category mapping (Setting is no longer a top-level category in UI)
  if (lowCat === "setting") {
    if (lowVal.includes("golden hour"))
      return { category: "lighting", value: "Golden Hour" };
    if (lowVal.includes("starry night"))
      return { category: "environment", value: "Deep Space" };
    if (lowVal.includes("foggy") || lowVal.includes("misty"))
      return { category: "atmosphere", value: "Heavy Fog" };
    if (lowVal.includes("thunderstorm") || lowVal.includes("rain"))
      return { category: "atmosphere", value: "Stormy" };
    if (lowVal.includes("aurora") || lowVal.includes("northern lights"))
      return { category: "atmosphere", value: "Aurora Borealis" };
    // Fallback: put it in environment
    return {
      category: "environment",
      value: value.charAt(0).toUpperCase() + value.slice(1),
    };
  }

  return { category, value };
}

const MOCK_EXEMPLARS: Exemplar[] = [
  {
    id: "ex-001",
    title: "Cyberpunk Portrait",
    description: "Neon-lit futuristic character.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1535295972055-1c762f4483e5?w=500&q=80",
    subjectBase:
      "A close-up portrait of a cyborg in a neon-lit futuristic city",
    modifiers: [
      { id: "m1", category: "style", value: "Cyberpunk" },
      { id: "m2", category: "lighting", value: "Neon" },
    ],
  },
  {
    id: "ex-002",
    title: "Fantasy Landscape",
    description: "Epic mountains and castles.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1506466010722-395aa2bef877?w=500&q=80",
    subjectBase:
      "An epic fantasy landscape with towering ancient castles and floating mountains",
    modifiers: [
      { id: "m3", category: "style", value: "Fantasy" },
      { id: "m4", category: "lighting", value: "Golden Hour" },
    ],
  },
  {
    id: "ex-003",
    title: "Minimalist Vector",
    description: "Clean, flat vector art.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=500&q=80",
    subjectBase: "A serene mountain lake at dawn",
    modifiers: [
      { id: "m5", category: "style", value: "Minimalist" },
      { id: "m6", category: "medium", value: "Digital Illustration" },
    ],
  },
];

function GeneratePageContent() {
  const {
    profile,
    user,
    credits,
    effectiveRole,
    switchRole,
    setAudienceMode,
    signOut,
    isAdmin,
    isSu,
  } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const lastAppliedExemplarId = useRef<string | null>(null);
  const lastResolvedRef = useRef<string | null>(null);

  // Top Level State
  const {
    userLevel,
    setUserLevel,
    attributionNameDefault,
    setAttributionNameDefault,
    attributionUrlDefault,
    setAttributionUrlDefault,
    originatorNameDefault,
    setOriginatorNameDefault,
    originatorUrlDefault,
    setOriginatorUrlDefault
  } = useSettings();
  const [showOnboarding, setShowOnboarding] = useState(true);

  // Left panel tab
  const [leftTab, setLeftTab] = useState<
    "exemplars" | "current" | "vault" | "styles" | "variables"
  >("current");
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryModalMode, setGalleryModalMode] = useState<"personal" | "community">("personal");
  const [activeStyleId, setActiveStyleId] = useState<string | undefined>(
    undefined,
  );

  // Active State
  const [activeExemplarId, setActiveExemplarId] = useState<string | null>(null);
  const [remixImage, setRemixImage] = useState<GeneratedImage | null>(null);
  const [presentationMode, setPresentationMode] =
    useState<PresentationMode>("grid-md");

  // Customization State
  const [coreSubject, setCoreSubject] = useState<string>("");
  const [promptEditMode, setPromptEditMode] = useState<"subject" | "full">(
    "full",
  );
  const [dnaViewMode, setDnaViewMode] = useState<"subject" | "full">("full");
  const [preflightViewMode, setPreflightViewMode] = useState<
    "subject" | "full"
  >("full");
  const [inputCursorPos, setInputCursorPos] = useState<{ start: number; end: number } | null>(null);
  const [activeModifiers, setActiveModifiers] = useState<Modifier[]>([]);
  const { scanPrompt, resolvePrompt, loadVariables, variables, getMissingVariables, updateVariableValue, registerVariable, clearVariables, removeVariable } = useVariables();
  const [missingVars, setMissingVars] = useState<string[]>([]);
  const [showVariableRequiredModal, setShowVariableRequiredModal] = useState(false);
  const [showAttributionRequiredModal, setShowAttributionRequiredModal] = useState(false);

  const [isModifiersOpen, setIsModifiersOpen] = useState(false);
  const [isInteractiveDNA, setIsInteractiveDNA] = useState(false);
  const [isEngineeringCoreOpen, setIsEngineeringCoreOpen] = useState(false);
  const [pendingStyle, setPendingStyle] = useState<VisualStyle | null>(null);
  const [showStyleMergeModal, setShowStyleMergeModal] = useState(false);
  const [isWeaveFailed, setIsWeaveFailed] = useState(false);
  const [showImprovePromptModal, setShowImprovePromptModal] = useState(false);
  const [improvePromptText, setImprovePromptText] = useState("");
  const [serviceError, setServiceError] = useState<{
    code: number;
    title: string;
    message: string;
    layman: string;
    action: string;
  } | null>(null);

  const interpretServiceError = useCallback((errorStr: string) => {
    // Attempt to extract JSON from string if it's like "Initial generation failed: {..."
    let cleanMsg = errorStr;
    let code = 500;

    if (errorStr.includes("{")) {
      try {
        const jsonPart = errorStr.substring(errorStr.indexOf("{"));
        const parsed = JSON.parse(jsonPart);
        const err = parsed.error || parsed;
        if (err) {
          code = err.code || code;
          if (err.message) cleanMsg = err.message;
          // Check for status string in the error object
          if (
            err.status === "UNAVAILABLE" ||
            err.status === "RESOURCE_EXHAUSTED"
          ) {
            if (err.status === "UNAVAILABLE") code = 503;
            if (err.status === "RESOURCE_EXHAUSTED") code = 429;
          }
        }
      } catch (e) {
        // Fallback to regex/string checks if parse fails
      }
    }

    const lowError = errorStr.toLowerCase();

    if (
      code === 503 ||
      lowError.includes("unavailable") ||
      lowError.includes("high demand") ||
      lowError.includes("overload")
    ) {
      return {
        code: 503,
        title: "Neural Engine Overload",
        message: cleanMsg,
        layman:
          "The high-performance AI cores are currently handling extreme global traffic. This is a temporary spike caused by high demand and usually clears in less than 60 seconds.",
        action:
          "You can try switching to 'Standard (Flash)' mode which has higher capacity, or simply wait a moment and click Generate again.",
      };
    }

    if (
      code === 429 ||
      lowError.includes("quota") ||
      lowError.includes("too many requests") ||
      lowError.includes("exhausted")
    ) {
      return {
        code: 429,
        title: "Transmission Frequency Cap",
        message: cleanMsg,
        layman:
          "You've sent too many requests in a short period. Our protocols prevent rapid-fire synthesis to ensure stability for all creators.",
        action: "Please wait a few seconds before your next generation attempt.",
      };
    }

    if (
      lowError.includes("failed to fetch") ||
      lowError.includes("fetch failed") ||
      lowError.includes("network error") ||
      lowError.includes("aborted") ||
      lowError.includes("connection") ||
      lowError.includes("timeout") ||
      lowError.includes("timed out")
    ) {
      return {
        code: 0,
        title: "Relay Link Severed",
        message: cleanMsg,
        layman:
          "The connection between our server and the AI neural lattice was unexpectedly severed. This is usually caused by a transient network fluctuation or a local proxy interference.",
        action:
          "Please verify your internet stability and try clicking 'Generate' again. If you are using a VPN, toggling it may resolve the handshake failure.",
      };
    }

    return null; // For other errors, use standard toast
  }, []);


  // Generator State
  const [genState, setGenState] = useState<GeneratorState>({
    mediaType: "image",
    quality: "standard",
    aspectRatio: "1:1",
    batchSize: 1,
    promptSetId: Date.now().toString(36),
    promptSetName: "",
    modelType: "standard",
    safetyThreshold: "medium",
    attributionName: attributionNameDefault || "",
    attributionUrl: attributionUrlDefault || "",
    originatorName: originatorNameDefault || "",
    originatorUrl: originatorUrlDefault || "",
  });

  // Pre-fill Attribution & Originator defaults when profile loads (only for new, blank generations)
  useEffect(() => {
    if (profile && !remixImage && !activeExemplarId) {
      setGenState(prev => {
        const updates: Partial<typeof prev> = {};
        let changed = false;

        // Auto-fill attribution from settings or profile
        if (!prev.attributionName && !prev.attributionUrl) {
          updates.attributionName = attributionNameDefault || profile.displayName || profile.username || "";
          updates.attributionUrl = attributionUrlDefault || profile.socialLinks?.website || "";
          changed = true;
        }

        // Auto-fill originator from settings or profile
        if (!prev.originatorName && !prev.originatorUrl) {
          updates.originatorName = originatorNameDefault || profile.displayName || profile.username || "";
          updates.originatorUrl = originatorUrlDefault || profile.socialLinks?.website || "";
          changed = true;
        }

        return changed ? { ...prev, ...updates } : prev;
      });
    }
  }, [profile, remixImage, activeExemplarId, attributionNameDefault, attributionUrlDefault, originatorNameDefault, originatorUrlDefault]);

  // Auto-focus first blank field when attribution modal opens
  useEffect(() => {
    if (showAttributionRequiredModal) {
      const timer = setTimeout(() => {
        const fields = [
          { id: 'attr-prompt-set-name', value: genState.promptSetName },
          { id: 'attr-attribution-name', value: genState.attributionName },
          { id: 'attr-attribution-url', value: genState.attributionUrl },
          { id: 'attr-originator-name', value: genState.originatorName },
          { id: 'attr-originator-url', value: genState.originatorUrl },
        ];
        const firstEmpty = fields.find(f => !f.value?.trim());
        if (firstEmpty) {
          const element = document.getElementById(firstEmpty.id);
          if (element) {
            element.focus();
            // If it's an input/textarea, move cursor to end
            if ('selectionStart' in element) {
              const input = element as HTMLInputElement;
              input.selectionStart = input.selectionEnd = input.value.length;
            }
          }
        }
      }, 150); // Small delay to ensure modal animation is underway/DOM is ready
      return () => clearTimeout(timer);
    }
  }, [showAttributionRequiredModal]);

  // Active State
  const [saveAttributionAsDefault, setSaveAttributionAsDefault] = useState(false);
  const [saveOriginatorAsDefault, setSaveOriginatorAsDefault] = useState(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedImages, setGeneratedImages] = useState<
    GeneratedImage[] | null
  >(null);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generationMessage, setGenerationMessage] = useState<string>("");
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // Reserved keys that belong to DNA Helix categories. 
  // We exclude these from 'custom variables' sent to the AI to prevent 
  // removed modifiers from being re-instated as mandatory variables.
  const dnaReservedKeys = useMemo(() => new Set(MODIFIER_CATEGORIES.map(c => c.id.toUpperCase())), []);

  // AI Weaver State
  const [compiledPrompt, setCompiledPrompt] = useState<string>("");
  const [lastWovenPrompt, setLastWovenPrompt] = useState<string>("");

  useEffect(() => {
    const timer = setTimeout(() => {
      const primaries = promptEditMode === "full" && compiledPrompt
        ? [compiledPrompt]
        : [coreSubject, ...activeModifiers.map((m) => m.value)];

      const secondaries = promptEditMode === "full"
        ? [coreSubject, ...activeModifiers.map((m) => m.value)]
        : (compiledPrompt ? [compiledPrompt] : []);

      scanPrompt(primaries, secondaries);
    }, 300);
    return () => clearTimeout(timer);
  }, [coreSubject, compiledPrompt, activeModifiers, scanPrompt]);

  // Synchronize DNA Helix to the Variable Engine as first-class variables
  useEffect(() => {
    // 1. Register/Update Active Modifiers
    activeModifiers.forEach(m => {
      const varName = m.category.toUpperCase();
      const varValue = m.value.toLowerCase();

      // Populate the registry with DNA Helix selections. 
      // These are treated as 'registry' source so they persist and stabilize the synthesis.
      if (variables[varName]?.currentValue !== varValue) {
        registerVariable({
          name: varName,
          defaultValue: varValue,
          currentValue: varValue,
          source: 'registry'
        });
      }
    });

    // 2. Clear Stale Modifiers (categories no longer selected)
    const activeCategories = new Set(activeModifiers.map(m => m.category.toUpperCase()));
    Object.entries(variables).forEach(([name, v]) => {
      if (v.source === 'registry' && !activeCategories.has(name)) {
        removeVariable(name);
      }
    });
  }, [activeModifiers, registerVariable, variables, removeVariable]);

  // Synchronize variable values with the compiled prompt text
  useEffect(() => {
    if (isApplyingSubstitution.current) return;
    if (compiledPrompt) {
      const synced = syncVariablesWithText(compiledPrompt, variables);
      if (synced !== compiledPrompt) {
        setCompiledPrompt(synced);
      }
    }
  }, [variables, compiledPrompt]);

  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [remainingEnhances, setRemainingEnhances] = useState<number | null>(
    null,
  );
  const [remainingCompiles, setRemainingCompiles] = useState<number | null>(
    null,
  );
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [showRefillModal, setShowRefillModal] = useState<boolean>(false);
  const [requiredCredits, setRequiredCredits] = useState<number>(0);
  const [pendingAction, setPendingAction] = useState<"generate" | "compile" | "draft" | null>(
    null,
  );
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  // History Sidebar State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyImages, setHistoryImages] = useState<GeneratedImage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Exemplars State
  const [exemplars, setExemplars] = useState<Exemplar[]>([]);
  const [personalExemplars, setPersonalExemplars] = useState<Exemplar[]>([]);
  const [loadingExemplars, setLoadingExemplars] = useState(true);

  const [focusedImage, setFocusedImage] = useState<GeneratedImage | null>(null);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const CHARACTER_LIMIT = 100;
  const [viewingVariationsGroup, setViewingVariationsGroup] = useState<
    GeneratedImage[] | null
  >(null);

  const [showBackConfirmModal, setShowBackConfirmModal] = useState<boolean>(false);
  const [showSaveChoiceModal, setShowSaveChoiceModal] = useState<boolean>(false);
  const [lastSavedSignature, setLastSavedSignature] = useState<string>("");

  const currentWorkspaceSignature = useMemo(() => {
    const modsStr = activeModifiers.map(m => `${m.category}:${m.value}`).sort().join(',');
    const varsStr = Object.entries(variables).map(([k, v]) => `${k}:${v.currentValue}`).sort().join(',');
    return `${coreSubject.trim()}|${modsStr}|${varsStr}|${genState.mediaType}|${genState.aspectRatio}|${genState.quality}|${genState.guidanceScale}|${genState.negativePrompt}|${genState.modelType}|${compiledPrompt}`;
  }, [coreSubject, activeModifiers, variables, genState, compiledPrompt]);

  const hasUnsavedChanges = useMemo(() => {
    if (!coreSubject.trim() && activeModifiers.length === 0) return false;
    if (lastSavedSignature === "") return true; // Initial dirty state if they typed something
    return currentWorkspaceSignature !== lastSavedSignature;
  }, [currentWorkspaceSignature, lastSavedSignature, coreSubject, activeModifiers]);


  // Generation abort signals
  const abortControllerRef = useRef<AbortController | null>(null);

  // Read prompt from URL (e.g. coming from onboarding)
  useEffect(() => {
    const promptParam = searchParams.get("prompt");
    if (promptParam) {
      setCoreSubject(promptParam);
    }

    const tabParam = searchParams.get("tab");
    if (tabParam === "current") {
      setLeftTab("current");
    } else if (tabParam === "exemplars") {
      setLeftTab("exemplars");
    } else if (tabParam === "vault") {
      setLeftTab("vault");
    } else if (!tabParam && userLevel) {
      // Adaptive defaults based on User Level
      setLeftTab(userLevel === "novice" ? "exemplars" : "current");
    }

    const exemplarIdParam = searchParams.get("exemplarId");
    if (
      exemplarIdParam &&
      exemplarIdParam !== lastAppliedExemplarId.current &&
      exemplars.length > 0
    ) {
      const exemplar =
        exemplars.find((ex) => ex.id === exemplarIdParam) ||
        personalExemplars.find((ex) => ex.id === exemplarIdParam);
      if (exemplar) {
        // Only auto-apply if we haven't modified the core subject yet or it's our first look
        if (!coreSubject || coreSubject === lastAppliedExemplarId.current) {
          handleSelectExemplar(exemplar);
          lastAppliedExemplarId.current = exemplarIdParam;
          setLeftTab("current");
          showToast(
            `Applying masterpiece settings: ${exemplar.title}`,
            "success",
          );
        }
      }
    }

    const sidParam = searchParams.get("sid");
    if (sidParam) {
      setGenState((prev) =>
        prev.promptSetId !== sidParam
          ? { ...prev, promptSetId: sidParam }
          : prev,
      );
    }
  }, [searchParams, exemplars, personalExemplars, showToast, userLevel]);

  const [isResolvingRef, setIsResolvingRef] = useState(false);
  const isApplyingSubstitution = useRef(false);
  const [pendingSubstitution, setPendingSubstitution] = useState<
    GeneratedImage | Exemplar | null
  >(null);
  const [showSubstitutionConfirm, setShowSubstitutionConfirm] = useState(false);

  // DNA Integrity: Detect changes since last AI weave
  const currentDnaInputSignature = useMemo(() => {
    const sortedMods = [...activeModifiers].sort(
      (a, b) =>
        a.category.localeCompare(b.category) || a.value.localeCompare(b.value),
    );

    const settingsPart = `${genState.aspectRatio}|${genState.mediaType}|${genState.quality}|${genState.guidanceScale}|${genState.negativePrompt}|${genState.modelType}|${genState.seed}`;
    return `${coreSubject.trim().toLowerCase()}|${sortedMods.map((m) => `${m.category}:${m.value}`).join(";")}|${settingsPart}`;
  }, [coreSubject, activeModifiers, genState]);

  const [lastWovenInputSignature, setLastWovenInputSignature] = useState<string>("");
  const isInputDiverged = currentDnaInputSignature !== lastWovenInputSignature;

  // Detect if the user edited the Woven Prompt itself (the result of synthesis)
  const stripVars = (text: string) => text.replace(/\[.*?\]/g, "");
  const isOutputDiverged = stripVars(compiledPrompt || "").trim() !== stripVars(lastWovenPrompt || "").trim();

  const synthesisRequired = !compiledPrompt || isInputDiverged || isOutputDiverged;

  // Resolve ref param for remixing
  useEffect(() => {
    const refParam = searchParams.get("ref");
    if (
      !refParam ||
      !user ||
      isResolvingRef ||
      lastResolvedRef.current === refParam
    )
      return;

    const resolveRef = async () => {
      setIsResolvingRef(true);
      try {
        // First check if it's already in history
        const existing = historyImages.find((img) => img.id === refParam);
        if (existing) {
          setTimeout(() => {
            // Mark as resolved before calling to prevent loop
            lastResolvedRef.current = refParam;
            handleRemix(existing);
          }, 100);
          return;
        }

        // 1. Try private images
        const { doc, getDoc } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        const imgRef = doc(db, "users", user.uid, "images", refParam);
        let snapshot = await getDoc(imgRef);

        if (snapshot.exists()) {
          lastResolvedRef.current = refParam;
          const img = normalizeImageData(snapshot.data(), snapshot.id);
          handleRemix(img);
          return;
        }

        // 2. Try community entries
        const communityRef = doc(db, "leagueEntries", refParam);
        snapshot = await getDoc(communityRef);

        if (snapshot.exists()) {
          lastResolvedRef.current = refParam;
          const data = snapshot.data();
          const img = normalizeImageData(data, snapshot.id);
          handleRemix(img);
          showToast("Remixing Community Masterpiece", "success");
        } else {
          console.warn(`[Remix] Image not found for ref: ${refParam}`);
        }
      } catch (err) {
        console.error("Failed to resolve image ref:", err);
      } finally {
        setIsResolvingRef(false);
      }
    };

    resolveRef();
  }, [searchParams, user, isResolvingRef, historyImages, showToast]);

  // Clear compiled prompt when core inputs change - REMOVED
  // Automatically erasing the compiled prompt wipes user's work when they simply
  // click a modifier in the DNA Helix. The application instead relies on
  // the `synthesisRequired` state flag to prompt the user to weave again when
  // inputs and outputs have diverged.

  // Ensure aspect ratio is not 1:1 if modality is video
  useEffect(() => {
    if (genState.mediaType === "video" && genState.aspectRatio === "1:1") {
      setGenState((prev) => ({ ...prev, aspectRatio: "16:9" }));
    }
  }, [genState.mediaType, genState.aspectRatio]);

  const markSaved = () => {
    setLastSavedSignature(currentWorkspaceSignature);
  };

  useEffect(() => {
    // Automatically mark as saved when a new remix or exemplar is loaded
    if (remixImage || activeExemplarId) {
      // Need a small timeout to let states flush
      const timer = setTimeout(() => markSaved(), 100);
      return () => clearTimeout(timer);
    }
  }, [remixImage, activeExemplarId]);

  const handleSaveDraft = async (showChoice = false) => {
    if (!user || (!coreSubject.trim() && activeModifiers.length === 0)) return;
    try {
      setIsSavingDraft(true);
      const token = await user.getIdToken();
      const res = await fetch("/api/generate/draft/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          draftId: draftId || undefined, // Pass existing draft ID so the API updates instead of creating
          prompt: compiledPrompt || rawPromptPreview,
          compiledPrompt: compiledPrompt || undefined,
          quality: genState.quality,
          aspectRatio: genState.aspectRatio,
          promptType: "freeform",
          seed: genState.seed,
          negativePrompt: genState.negativePrompt,
          guidanceScale: genState.guidanceScale,
          sourceImageId: remixImage?.id || activeExemplarId || undefined,
          promptSetID: genState.promptSetId || undefined,
          promptSetName: genState.promptSetName || undefined,
          modality: genState.mediaType,
          modelType: genState.modelType,
          modifiers: activeModifiers.map((m) => ({ category: m.category, value: m.value })),
          coreSubject,
          variables: Object.fromEntries(Object.entries(variables).map(([k, v]) => [k, v.currentValue])),
          attributionName: genState.attributionName || undefined,
          attributionUrl: genState.attributionUrl || undefined,
          originatorName: genState.originatorName || undefined,
          originatorUrl: genState.originatorUrl || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save draft");

      // Store the draft ID so future saves update the same document
      if (data.id && !draftId) {
        setDraftId(data.id);
      }

      showToast("Draft saved successfully", "success");
      markSaved();
      fetchHistory(); // Refresh history to show the draft

      // Update generation state to link future generations in this set to this draft's promptSetId
      if (!genState.promptSetId && data.promptSetID) {
        setGenState(prev => ({ ...prev, promptSetId: data.promptSetID }));
      } else if (!genState.promptSetId) {
        setGenState(prev => ({ ...prev, promptSetId: data.id }));
      }

      if (showChoice) {
        setShowSaveChoiceModal(true);
      }

    } catch (err: any) {
      console.error("Save Draft Error:", err);
      showToast(err.message || "Failed to save draft", "error");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Live API Call - Image Generation via SSE
  const handleGenerate = async () => {
    if (!displayPrompt || !user) return;

    const getMissingDNA = () => {
      const sourceText = promptEditMode === "subject"
        ? coreSubject
        : (compiledPrompt || rawPromptPreview);

      return getMissingVariables(sourceText);
    };

    const missing = getMissingDNA();
    if (missing.length > 0) {
      setPendingAction("generate");
      setMissingVars(missing);
      setShowVariableRequiredModal(true);
      return;
    }

    if (!genState.promptSetName?.trim() || !genState.attributionName?.trim()) {
      setPendingAction("generate");
      // Attribution auto-fills from profile but promptSetName still requires user input.
      setShowAttributionRequiredModal(true);
      return;
    }

    // 1. Pre-check Credits
    const perItemCost = getGenerationCost(
      genState.mediaType as any,
      genState.quality as any,
      genState.modelType as any
    );
    const totalCost = perItemCost * genState.batchSize;

    // Use availableCredits (balance + allowance) for the check
    const availableCredits = credits?.balance || 0;
    const canAffordWithBalance = availableCredits >= totalCost;
    const maxOverdraft = credits?.maxOverdraft || 0;
    const isOxygenAuthorized = credits?.isOxygenAuthorized || false;
    const canAffordWithOxygen =
      isOxygenAuthorized && availableCredits + maxOverdraft >= totalCost;

    if (!canAffordWithBalance && !canAffordWithOxygen) {
      console.log(
        `[Credits] Refill required. Cost: ${totalCost}, Available: ${availableCredits}, Oxygen Auth: ${isOxygenAuthorized}`,
      );
      setRequiredCredits(totalCost);
      setShowRefillModal(true);
      showToast(`Insufficient Energy. ${totalCost} unit(s) required.`, "info");
      return;
    }

    let finalPrompt = compiledPrompt || rawPromptPreview;

    // DNA Integrity: Prefix generation with a weave if inputs have changed since last synthesis
    const effectiveSubject = promptEditMode === "full"
      ? (compiledPrompt || rawPromptPreview)
      : coreSubject;

    if (synthesisRequired && effectiveSubject.trim()) {
      setIsCompiling(true);
      setGenerationMessage("Synthesizing DNA Helix...");
      try {
        const token = await user.getIdToken();
        const synthesisController = new AbortController();
        const synthesisTimeout = setTimeout(() => synthesisController.abort(), 60000); // 60s safety buffer

        // Use the current session ID for this generation batch.
        // We no longer force a new ID on subject deviation here to ensure variations remain grouped.
        const activePromptSetId = genState.promptSetId;

        const res = await fetch("/api/generate/nanobanana/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          signal: synthesisController.signal,
          body: JSON.stringify({
            subject: effectiveSubject,
            modifiers: activeModifiers.map((m) => ({
              category: m.category,
              value: m.value,
            })),
            aspectRatio: genState.aspectRatio,
            promptSetId: activePromptSetId,
            variables: Object.fromEntries(
              Object.entries(variables).map(([k, v]) => [k, v.currentValue]),
            ),
            proSettings: {
              mediaType: genState.mediaType,
              quality: genState.quality,
              guidanceScale: genState.guidanceScale,
              negativePrompt: genState.negativePrompt,
              modelType: genState.modelType,
            },
          }),
        });
        clearTimeout(synthesisTimeout);
        const data = await res.json();

        if (typeof data.remaining === "number") {
          setRemainingCompiles(data.remaining);
        }

        if (data.success && data.compiledPrompt) {
          const sanitized = sanitizeAIResponse(data.compiledPrompt);
          setCompiledPrompt(sanitized);
          setLastWovenPrompt(sanitized);
          setLastWovenInputSignature(currentDnaInputSignature);
          setPromptEditMode("full");
          setIsWeaveFailed(false);
          showToast("DNA Synthesis complete. Review your masterpiece.", "success");
          setIsCompiling(false);
          setGenerationMessage("");
          setShowReviewModal(true); // Pop the modal NOW that weave is done
          return; // Pause for user review
        } else if (data.error) {
          throw new Error(data.error);
        }
      } catch (e) {
        console.error("Auto-weave failed:", e);
        setIsWeaveFailed(true);
        showToast("Synthesis failed. You can proceed with raw DNA or abort.", "error");
        setShowReviewModal(true); // Still show modal so they can decide to proceed or abort
      } finally {
        setIsCompiling(false);
      }
    }

    setIsGenerating(true);
    setShowReviewModal(false); // Close modal only when generation actually starts

    setGeneratedImages(null);
    setGenerationProgress(0);
    setGenerationMessage("Initializing generation pipeline...");

    try {
      abortControllerRef.current = new AbortController();
      const token = await user.getIdToken();

      // Neural State Reset: If we've deviated from the original subject, start a fresh session
      // We compare RESOLVED strings to ensure that changing a variable value triggers a reset.
      // Use the current session ID for this generation batch.
      const activePromptSetId = genState.promptSetId;

      const res = await fetch("/api/generate/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          prompt: finalPrompt, // Send WITH brackets. Server will resolve before sending to model.
          compiledPrompt: finalPrompt,
          quality: genState.quality,
          aspectRatio: genState.aspectRatio,
          modality: genState.mediaType,
          promptType: "freeform", // bypassing UI-based madlibs logic
          count: genState.batchSize,
          promptSetID: activePromptSetId,
          promptSetName: genState.promptSetName || undefined,
          seed: userLevel === "master" ? genState.seed : undefined,
          guidanceScale:
            userLevel === "master" ? genState.guidanceScale : undefined,
          negativePrompt:
            userLevel === "master" ? genState.negativePrompt : undefined,
          modelType: genState.modelType,
          safetyThreshold: genState.safetyThreshold,
          skipWeave: promptEditMode === "full",
          attributionName: genState.attributionName || undefined,
          attributionUrl: genState.attributionUrl || undefined,
          originatorName: genState.originatorName || undefined,
          originatorUrl: genState.originatorUrl || undefined,
          modifiers: activeModifiers.map((m) => ({
            category: m.category,
            value: m.value,
          })),
          coreSubject: coreSubject,
          variables: Object.fromEntries(
            Object.entries(variables)
              .filter(([k]) => !dnaReservedKeys.has(k.toUpperCase()))
              .map(([k, v]) => [k, v.currentValue || ''])
          ),
          simulation: (window as any).__PR_CREDITS_OVERRIDE__
            ? {
              balance: (window as any).__PR_CREDITS_OVERRIDE__.balance,
              isOxygenAuthorized: (window as any).__PR_CREDITS_OVERRIDE__
                .isOxygenAuthorized,
              isOxygenDeployed: (window as any).__PR_CREDITS_OVERRIDE__
                .isOxygenDeployed,
            }
            : undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage =
          errorData.error || `Generation failed (${res.status})`;
        throw new Error(errorMessage);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("Failed to read response stream");

      let done = false;
      let outputs: GeneratedImage[] = [];

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.substring(6);
              if (dataStr.trim() === "[DONE]" || !dataStr.trim()) continue;
              try {
                const data = JSON.parse(dataStr);
                if (data.type === "error") {
                  console.error("API Error:", data.error);
                  const errorMsg = data.error || "Generation failed";
                  const interpretation = interpretServiceError(errorMsg);

                  if (interpretation) {
                    setServiceError(interpretation);
                  } else {
                    setGenerationMessage(`Error: ${errorMsg}`);
                    showToast(errorMsg, "error");
                  }
                  setIsGenerating(false);
                  return;
                }
                if (data.type === "progress") {
                  setGenerationMessage(data.message || "Processing batch...");
                  if (data.total > 0) {
                    setGenerationProgress((data.current / data.total) * 100);
                  }
                }
                if (data.type === "image_ready") {
                  setGenerationMessage(
                    `Batch item ${data.index + 1} finalized.`,
                  );
                }
                if (data.type === "complete" && data.images) {
                  outputs = data.images;
                }
              } catch (e) {
                // Ignore partial JSON chunk parse failures
              }
            }
          }
        }
      }

      if (outputs.length > 0) {
        setGeneratedImages(outputs);
        fetchHistory(); // Refresh image history after generation

        // 🚀 Sync Simulation Override: If we have an override, decrement it so UI drops to -1
        if (
          typeof window !== "undefined" &&
          (window as any).__PR_CREDITS_OVERRIDE__
        ) {
          const currentSim = (window as any).__PR_CREDITS_OVERRIDE__;
          const perItemCost = getGenerationCost(
            genState.mediaType as any,
            genState.quality as any,
            genState.modelType as any
          );
          const totalCost = perItemCost * genState.batchSize;

          (window as any).__PR_CREDITS_OVERRIDE__ = {
            ...currentSim,
            balance: currentSim.balance - totalCost,
            isOxygenDeployed: true,
          };
          console.log(
            "[Auth] Updated simulation balance to:",
            (window as any).__PR_CREDITS_OVERRIDE__.balance,
          );
        }

        // Invalidate credit history to show latest transaction in Ledger
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.creditHistory(user.uid),
        });
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Generation cancelled by user");
      } else {
        console.error("Generation Error:", error);
        const msg = error.message || "Generation failed";
        console.log("[Generate] Interpreting error message:", msg);
        const interpretation = interpretServiceError(msg);

        if (interpretation) {
          setServiceError(interpretation);
        } else {
          setGenerationMessage(`Error: ${msg}`);
          showToast(msg, "error");
        }
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  const handleCompilePrompt = async () => {
    const effectiveSubject = promptEditMode === "full"
      ? (compiledPrompt || rawPromptPreview)
      : coreSubject;

    if (!effectiveSubject.trim()) return;

    // Validation: Ensure all DNA variables are defined before synthesis.
    // We only scan the effectiveSubject (either the core subject or the currently woven prompt).
    const missing = getMissingVariables(effectiveSubject);

    if (missing.length > 0) {
      setPendingAction("compile");
      setMissingVars(missing);
      setShowVariableRequiredModal(true);
      return;
    }

    setIsCompiling(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/generate/nanobanana/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          subject: effectiveSubject,
          modifiers: activeModifiers.map((m) => ({
            category: m.category,
            value: m.value,
          })),
          aspectRatio: genState.aspectRatio,
          variables: Object.fromEntries(
            Object.entries(variables)
              .filter(([k]) => !dnaReservedKeys.has(k.toUpperCase()))
              .map(([k, v]) => [k, v.currentValue]),
          ),
          proSettings: {
            mediaType: genState.mediaType,
            quality: genState.quality,
            guidanceScale: genState.guidanceScale,
            negativePrompt: genState.negativePrompt,
            modelType: genState.modelType,
          },
        }),
      });
      const data = await res.json();

      if (typeof data.remaining === "number") {
        setRemainingCompiles(data.remaining);
      }

      if (data.success && data.compiledPrompt) {
        const sanitized = sanitizeAIResponse(data.compiledPrompt);
        setCompiledPrompt(sanitized);
        setLastWovenPrompt(sanitized);
        setLastWovenInputSignature(currentDnaInputSignature);
        setIsWeaveFailed(false);
        showToast("DNA Synthesis complete. Review your masterpiece.", "success");
        setShowReviewModal(true); // Pop the modal NOW that weave is done
      } else if (data.error) {
        const interpretation = interpretServiceError(data.error);
        if (interpretation) {
          setServiceError(interpretation);
          setCompiledPrompt("");
        } else {
          setCompiledPrompt(`Error: ${data.error}`);
        }
      } else {
        setCompiledPrompt("Error weaving prompt.");
      }
    } catch (e: any) {
      console.error(e);
      const msg = e.message || "Error weaving prompt.";
      const interpretation = interpretServiceError(msg);
      if (interpretation) {
        setServiceError(interpretation);
        setCompiledPrompt("");
      } else {
        setCompiledPrompt(msg);
      }
    } finally {
      setIsCompiling(false);
    }
  };

  const handleEnhancePrompt = async (overrideText?: string | any) => {
    const textOverride = typeof overrideText === "string" ? overrideText : undefined;
    const rawText = textOverride ?? (
      promptEditMode === "subject" ? coreSubject : compiledPrompt || rawPromptPreview
    );

    // Validation: Enforce that all DNA architectural variables are defined before enhancement
    const missing = getMissingVariables(rawText);
    if (missing.length > 0) {
      setMissingVars(missing);
      setShowVariableRequiredModal(true);
      setIsEnhancing(false);
      return;
    }

    // Ensure we have a string to work with
    const textToEnhance = String(rawText || "");
    if (!textToEnhance.trim()) {
      showToast("Enter a prompt to enhance.", "error");
      return;
    }

    setIsEnhancing(true);
    try {
      const mood = activeModifiers.find(
        (m) =>
          m.category === "mood" ||
          m.category === "atmosphere" ||
          m.category === "lighting",
      )?.value;
      const style = activeModifiers.find(
        (m) => m.category === "style" || m.category === "medium",
      )?.value;
      const token = await user?.getIdToken();

      const res = await fetch("/api/generate/enhance/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          prompt: textToEnhance,
          mood,
          style,
          modifiers: activeModifiers.map(m => ({ category: m.category, value: m.value })),
        }),
      });
      const data = await res.json();

      // Update rate limit state if present
      if (typeof data.remaining === "number") {
        setRemainingEnhances(data.remaining);
      }

      if (data.success && data.enhanced) {
        const sanitized = sanitizeAIResponse(data.enhanced);
        if (promptEditMode === "subject") {
          setCoreSubject(sanitized);
        } else {
          setCompiledPrompt(sanitized);
          setPromptEditMode("full");
        }
      } else if (data.error) {
        const interpretation = interpretServiceError(data.error);
        if (interpretation) {
          setServiceError(interpretation);
        } else {
          showToast(`Error: ${data.error}`, "error");
        }
      } else {
        showToast("Error enhancing prompt.", "error");
      }
    } catch (e: any) {
      console.error(e);
      const msg = e.message || "Error enhancing prompt.";
      const interpretation = interpretServiceError(msg);
      if (interpretation) {
        setServiceError(interpretation);
      } else {
        showToast(msg, "error");
      }
    } finally {
      setIsEnhancing(false);
    }
  };

  // History Retrieval
  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const { collection, query, orderBy, limit, getDocs } =
        await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");

      const imagesRef = collection(db, "users", user.uid, "images");
      const q = query(imagesRef, orderBy("createdAt", "desc"), limit(30));
      const snapshot = await getDocs(q);

      const images = snapshot.docs.map((doc) =>
        normalizeImageData(doc.data(), doc.id),
      );
      setHistoryImages(images);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  // Exemplars Retrieval
  const fetchExemplars = useCallback(async () => {
    setLoadingExemplars(true);
    try {
      const { collection, query, where, limit, getDocs } =
        await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");

      const communityRef = collection(db, "leagueEntries");
      const q = query(communityRef, where("isExemplar", "==", true), limit(20));
      const snapshot = await getDocs(q);

      const fetched = snapshot.docs.map((doc) => {
        const data = doc.data();
        // Map settings to modifiers if possible
        let mods: Modifier[] = [];
        if (data.settings?.modifiers) {
          mods = data.settings.modifiers.map((m: any) => {
            const norm = normalizeModifier(m.category, m.value);
            return {
              id: Math.random().toString(36).substring(7),
              category: norm.category,
              value: norm.value,
            };
          });
        } else if (data.settings?.madlibsData) {
          const m = data.settings.madlibsData;
          if (m.style) {
            const norm = normalizeModifier("style", m.style);
            mods.push({
              id: `s-${doc.id}`,
              category: norm.category,
              value: norm.value,
            });
          }
          if (m.action) {
            const norm = normalizeModifier("action", m.action);
            mods.push({
              id: `a-${doc.id}`,
              category: norm.category,
              value: norm.value,
            });
          }
          if (m.mood) {
            const norm = normalizeModifier("mood", m.mood);
            mods.push({
              id: `m-${doc.id}`,
              category: norm.category,
              value: norm.value,
            });
          }
          if (m.setting) {
            const norm = normalizeModifier("setting", m.setting);
            mods.push({
              id: `e-${doc.id}`,
              category: norm.category,
              value: norm.value,
            });
          }
        }

        return {
          id: doc.id,
          title: data.authorName
            ? `${data.authorName}'s Selection`
            : "Featured Creation",
          description:
            data.prompt?.substring(0, 80) + "..." ||
            "High quality prompt exemplar.",
          thumbnailUrl: data.imageUrl,
          videoUrl: data.videoUrl,
          subjectBase: data.settings?.coreSubject || data.prompt || "",
          modifiers: mods,
        };
      });

      setExemplars(fetched.length > 0 ? fetched : MOCK_EXEMPLARS);
    } catch (err) {
      console.error("Failed to fetch exemplars:", err);
      setExemplars(MOCK_EXEMPLARS);
    } finally {
      setLoadingExemplars(false);
    }
  }, []);

  const fetchPersonalExemplars = useCallback(async () => {
    if (!user) return;
    try {
      const { collection, getDocs } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");

      const personalRef = collection(
        db,
        "users",
        user.uid,
        "personalExemplars",
      );
      const snapshot = await getDocs(personalRef);

      const fetched = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Exemplar,
      );

      setPersonalExemplars(fetched);
    } catch (err) {
      console.error("Failed to fetch personal exemplars:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchHistory();
      fetchPersonalExemplars();
    }
    fetchExemplars();
  }, [user, fetchHistory, fetchExemplars, fetchPersonalExemplars]);

  const handleClearDNA = () => {
    setActiveModifiers([]);
    showToast("DNA settings cleared. Synthesis text preserved.", "info");
  };

  const handleCopyPrompt = () => {
    const textToCopy = displayPrompt;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    showToast("Prompt copied to clipboard", "success");
  };

  const handleResetWorkspace = () => {
    setCoreSubject("");
    setActiveModifiers([]);
    setCompiledPrompt("");
    setLastWovenPrompt("");
    setLastWovenInputSignature("");
    setRemixImage(null);
    setActiveExemplarId(null);
    setPromptEditMode("full");
    setIsModifiersOpen(false);
    setDraftId(null);
    clearVariables();
    setGenState((prev) => ({
      ...prev,
      promptSetId: Date.now().toString(36),
      attributionName: "",
      attributionUrl: "",
      originatorName: "",
      originatorUrl: ""
    }));
    showToast("Studio reset. All buffers and anchors cleared.", "info");
    markSaved();
  };

  const executeBack = () => {
    const currentSid = remixImage?.promptSetID || remixImage?.settings?.promptSetID || remixImage?.id || genState?.promptSetId;

    if (currentSid) {
      router.push(`/gallery?set=${currentSid}`);
    } else {
      router.push("/gallery");
    }
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowBackConfirmModal(true);
    } else {
      executeBack();
    }
  };

  const handleResetToOriginal = () => {
    if (remixImage) {
      applySubstitution(remixImage);
      showToast("Restored to original remix state.", "info");
    } else if (activeExemplarId) {
      const ex = [...personalExemplars, ...exemplars].find(
        (e) => e.id === activeExemplarId,
      );
      if (ex) {
        applySubstitution(ex);
        showToast("Restored to original template values.", "info");
      }
    }
  };

  const applySubstitution = (target: GeneratedImage | Exemplar) => {
    isApplyingSubstitution.current = true;
    setGeneratedImages(null);
    setPromptEditMode("full");

    if ("subjectBase" in target) {
      // Exemplar Path
      setRemixImage(null);
      setActiveExemplarId(target.id);
      setCoreSubject(target.subjectBase);
      setActiveModifiers([...target.modifiers]);
      setCompiledPrompt(""); // Exemplars start fresh as they are templates

      // Signature of the loaded template
      const sortedMods = [...target.modifiers].sort(
        (a, b) =>
          a.category.localeCompare(b.category) ||
          a.value.localeCompare(b.value),
      );
      const settingsPart = `${genState.aspectRatio}|${genState.mediaType}|${genState.quality}|${genState.guidanceScale}|${genState.negativePrompt}`;
      const sig = `${target.subjectBase.trim().toLowerCase()}|${sortedMods.map((m) => `${m.category}:${m.value}`).join(";")}|${settingsPart}`;
      setLastWovenInputSignature(sig);
      setLastWovenPrompt(""); // Templates start with no woven prompt baseline
      setGenState((prev) => ({
        ...prev,
        promptSetId: Date.now().toString(36),
        originatorName: (target as any).originatorName || (target as any).authorName || profile?.displayName || profile?.username || "",
        originatorUrl: (target as any).originatorUrl || profile?.socialLinks?.website || ""
      }));
      if ((target as any).variables) {
        loadVariables((target as any).variables);
      }
    } else {
      // Remix Path (GeneratedImage)
      const image = target as GeneratedImage;
      setCoreSubject(image.settings?.coreSubject || image.prompt);
      setRemixImage(image);
      setActiveExemplarId(null);

      // Restore compiled prompt if it was a woven generation
      if (image.settings?.modifiers && image.settings.modifiers.length > 0) {
        setCompiledPrompt(image.prompt);
        setLastWovenPrompt(image.prompt);
      } else {
        setCompiledPrompt("");
      }

      // If resuming a draft, track its ID so saves update in place
      setDraftId(image.status === 'draft' ? image.id : null);

      const sid = image.promptSetID || image.settings?.promptSetID || image.id;
      if (sid) {
        setGenState((prev) => ({ ...prev, promptSetId: sid }));
      }

      // Restore modifiers
      if (image.settings?.modifiers) {
        setActiveModifiers(
          image.settings.modifiers.map((m) => {
            const norm = normalizeModifier(m.category, m.value);
            return {
              id: Math.random().toString(36).substring(7),
              category: norm.category,
              value: norm.value,
            };
          }),
        );
      } else if (image.settings?.madlibsData) {
        const m = image.settings.madlibsData;
        const newModifiers: Modifier[] = [];
        if (m.style) {
          const norm = normalizeModifier("style", m.style);
          newModifiers.push({
            id: Math.random().toString(),
            category: norm.category,
            value: norm.value,
          });
        }
        if (m.action) {
          const norm = normalizeModifier("action", m.action);
          newModifiers.push({
            id: Math.random().toString(),
            category: norm.category,
            value: norm.value,
          });
        }
        if (m.mood) {
          const norm = normalizeModifier("mood", m.mood);
          newModifiers.push({
            id: Math.random().toString(),
            category: norm.category,
            value: norm.value,
          });
        }
        if (m.setting) {
          const norm = normalizeModifier("setting", m.setting);
          newModifiers.push({
            id: Math.random().toString(),
            category: norm.category,
            value: norm.value,
          });
        }
        setActiveModifiers(newModifiers);
      } else {
        setActiveModifiers([]);
      }

      // Sync genState for precise signature matching
      const s = image.settings;
      if (s) {
        setGenState((prev) => ({
          ...prev,
          aspectRatio: s.aspectRatio || prev.aspectRatio,
          mediaType: (s.modality as MediaType) || prev.mediaType,
          quality: (s.quality as any) || prev.quality,
          guidanceScale: s.guidanceScale ?? prev.guidanceScale,
          negativePrompt: s.negativePrompt || prev.negativePrompt,
          seed: s.seed,
          modelType: s.modelType || prev.modelType,
          attributionName: image.attributionName || '',
          attributionUrl: image.attributionUrl || '',
          originatorName: image.originatorName || (image as any).authorName || profile?.displayName || profile?.username || '',
          originatorUrl: image.originatorUrl || profile?.socialLinks?.website || '',
        }));
      }

      // Restore prompt and sync baseline signature
      // We prioritize the unresolved compiledPrompt (with markers) if available
      setCompiledPrompt(image.settings?.compiledPrompt || image.prompt || "");
      const subSubject = image.settings?.coreSubject || image.prompt;
      const subMods = image.settings?.modifiers || [];
      const sortedMods = [...subMods].sort(
        (a, b) =>
          a.category.localeCompare(b.category) ||
          a.value.localeCompare(b.value),
      );
      const settingsPart = `${image.settings?.aspectRatio || genState.aspectRatio}|${image.settings?.modality || genState.mediaType}|${image.settings?.quality || genState.quality}|${image.settings?.guidanceScale || genState.guidanceScale}|${image.settings?.negativePrompt || genState.negativePrompt}`;
      const sig = `${subSubject.trim().toLowerCase()}|${sortedMods.map((m) => `${m.category}:${m.value}`).join(";")}|${settingsPart}`;
      setLastWovenInputSignature(sig);
      setLastWovenPrompt(image.settings?.compiledPrompt || image.prompt || "");
      if (image.settings?.variables) {
        loadVariables(image.settings.variables as any);
      }
    }

    setLeftTab("current");
    setIsHistoryOpen(false);
    setPendingSubstitution(null);
    setShowSubstitutionConfirm(false);

    // Clear the guard after React flushes the batched state updates
    requestAnimationFrame(() => {
      isApplyingSubstitution.current = false;
    });
  };

  const handleSubstitutionRequest = (target: GeneratedImage | Exemplar) => {
    const currentId = remixImage?.id || activeExemplarId;
    if (target.id === currentId) {
      setLeftTab("current");
      return;
    }

    const isLoaded = remixImage !== null || activeExemplarId !== null;
    const hasGenerated = generatedImages !== null && generatedImages.length > 0;

    if (isLoaded && !hasGenerated) {
      setPendingSubstitution(target);
      setShowSubstitutionConfirm(true);
    } else {
      applySubstitution(target);
    }
  };

  const handleRemix = (image: GeneratedImage) =>
    handleSubstitutionRequest(image);

  const applyStyleData = (style: VisualStyle, mode: "replace" | "add") => {
    setActiveStyleId(style.id);

    // AI Style Modifiers (Normalized)
    const styleCategorySet = new Set(style.modifiers.map((m) => m.category));
    const newStyleModifiers: Modifier[] = style.modifiers.map((m, idx) => ({
      id: `style-${style.id}-${idx}`,
      category: m.category,
      value: m.value,
    }));

    if (mode === "replace") {
      setActiveModifiers(newStyleModifiers);
      setCoreSubject("");
    } else {
      // Additive mode: we still replace conflicting categories to avoid visual clashes
      // (e.g. you can't have both 'Anime' and 'Photography' usually without weirdness)
      // but we keep all other existing modifiers.
      setActiveModifiers((prev) => [
        ...prev.filter((m) => !styleCategorySet.has(m.category)),
        ...newStyleModifiers,
      ]);
    }

    // Apply specific generation settings if the style defines them
    if (style.settings) {
      setGenState((prev) => ({
        ...prev,
        ...style.settings,
      }));
    }

    // Switch to Designer tab to see the updated helix
    setLeftTab("current");
    showToast(
      `${style.name} ${mode === "replace" ? "applied" : "merged"} successfully.`,
      "success",
    );
    setPendingStyle(null);
    setShowStyleMergeModal(false);
  };

  const handleSaveTemplate = async () => {
    if (!user || !coreSubject.trim()) return;
    try {
      const { collection, addDoc, serverTimestamp } =
        await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");

      const firstMedia = generatedImages?.[0];
      const templateData = {
        title: `${coreSubject.substring(0, 15)}... Template`,
        description: `Custom template with ${activeModifiers.length} modifiers.`,
        thumbnailUrl:
          firstMedia?.imageUrl ||
          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80",
        videoUrl: firstMedia?.videoUrl || null,
        subjectBase: coreSubject,
        modifiers: activeModifiers,
        variables: Object.fromEntries(
          Object.entries(variables).map(([k, v]) => [k, v.currentValue])
        ),
        createdAt: serverTimestamp(),
      };

      await addDoc(
        collection(db, "users", user.uid, "personalExemplars"),
        templateData,
      );

      // Refresh personal list
      fetchPersonalExemplars();
    } catch (err) {
      console.error("Failed to save template:", err);
    }
  };

  const toggleCommunity = async (image: GeneratedImage) => {
    if (!user) return;
    const action = image.publishedToCommunity ? "unpublish" : "publish";
    setPublishingId(image.id);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/community/publish/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imageId: image.id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Update local state
      if (generatedImages) {
        setGeneratedImages((prev) =>
          prev
            ? prev.map((img) =>
              img.id === image.id
                ? {
                  ...img,
                  publishedToCommunity: action === "publish",
                  communityEntryId:
                    action === "publish"
                      ? data.communityEntryId
                      : undefined,
                }
                : img,
            )
            : null,
        );
      }

      // Also update history
      setHistoryImages((prev) =>
        prev.map((img) =>
          img.id === image.id
            ? {
              ...img,
              publishedToCommunity: action === "publish",
              communityEntryId:
                action === "publish" ? data.communityEntryId : undefined,
            }
            : img,
        ),
      );
    } catch (error: any) {
      console.error("Community toggle error:", error);
    } finally {
      setPublishingId(null);
    }
  };

  const handleDownloadMedia = (image: GeneratedImage) => {
    const url = image.videoUrl || image.imageUrl;
    if (!url) return;
    const filename = `studio-${image.id}.${image.videoUrl ? "mp4" : "png"}`;
    const proxyUrl = `/api/download/?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;

    const link = document.createElement("a");
    link.href = proxyUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const MediaPreview = ({ image }: { image: GeneratedImage }) => {
    const isVideo = !!(
      image.videoUrl ||
      image.settings?.modality === "video" ||
      (image.imageUrl && /\.(mp4|webm|mov)(\?|$)/i.test(image.imageUrl))
    );
    const imgIsVideo = !!(
      image.imageUrl && /\.(mp4|webm|mov)(\?|$)/i.test(image.imageUrl)
    );
    const hasThumbnail = isVideo && !imgIsVideo;
    const videoSrc = image.videoUrl || image.imageUrl || "";
    const videoSrcWithTime = videoSrc.includes("#t=")
      ? videoSrc
      : `${videoSrc}#t=0.1`;
    const isPublishing = publishingId === image.id;

    const overlay = (
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover/media:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3 z-30">
        <div className="flex gap-2">
          <Tooltip content="Remix this prompt">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemix(image);
              }}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-primary hover:scale-110 transition-all flex items-center justify-center border border-white/20"
            >
              <Icons.history size={18} className="text-white" />
            </button>
          </Tooltip>
          <Tooltip content="Download file">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadMedia(image);
              }}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-blue-500 hover:scale-110 transition-all flex items-center justify-center border border-white/20"
            >
              <Icons.download size={18} className="text-white" />
            </button>
          </Tooltip>
          <Tooltip
            content={
              image.publishedToCommunity
                ? "Unpublish from library"
                : "Publish to Community League"
            }
          >
            <button
              disabled={isPublishing}
              onClick={(e) => {
                e.stopPropagation();
                toggleCommunity(image);
              }}
              className={`w-10 h-10 rounded-full transition-all flex items-center justify-center border border-white/20 ${isPublishing ? "opacity-50" : "hover:scale-110"} ${image.publishedToCommunity ? "bg-yellow-500 text-black" : "bg-white/10 hover:bg-green-500"}`}
            >
              {isPublishing ? (
                <Icons.loader size={18} className="animate-spin" />
              ) : (
                <Icons.star
                  size={18}
                  className={
                    image.publishedToCommunity ? "text-black" : "text-white"
                  }
                />
              )}
            </button>
          </Tooltip>
        </div>
        {image.publishedToCommunity && (
          <Badge className="bg-yellow-500 text-black font-black text-[8px] uppercase tracking-widest">
            Published
          </Badge>
        )}
      </div>
    );

    if (isVideo) {
      return (
        <div
          className="relative w-full h-full group/media bg-black"
          onMouseEnter={(e) => {
            const video = e.currentTarget.querySelector("video");
            if (video && video.paused) video.play().catch(() => { });
          }}
          onMouseLeave={(e) => {
            const video = e.currentTarget.querySelector("video");
            if (video) {
              video.pause();
              video.currentTime = 0.1;
            }
          }}
        >
          {overlay}
          {hasThumbnail ? (
            <>
              {!imgIsVideo && (
                <img
                  src={image.imageUrl}
                  alt={image.prompt}
                  className="w-full h-full object-cover group-hover/media:opacity-0 transition-opacity duration-500"
                />
              )}
              <video
                src={videoSrcWithTime}
                className={`absolute inset-0 w-full h-full object-cover ${!imgIsVideo ? "opacity-0 group-hover/media:opacity-100 transition-opacity duration-300" : ""}`}
                loop
                muted
                playsInline
                preload="metadata"
              />
            </>
          ) : (
            <video
              src={videoSrcWithTime}
              className="w-full h-full object-cover"
              loop
              muted
              playsInline
              preload="metadata"
            />
          )}
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm p-1.5 rounded-lg text-white shadow-lg border border-white/10 z-20 pointer-events-none group-hover/media:opacity-0 transition-opacity">
            <Icons.video size={14} className="text-white" />
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full group/media bg-black overflow-hidden">
        {overlay}
        <img
          src={image.imageUrl}
          alt={image.prompt}
          className="w-full h-full object-cover group-hover/media:scale-110 transition-transform duration-700"
        />
      </div>
    );
  };

  // Correctly initialize onboarding state based on presence of userLevel in storage
  useEffect(() => {
    const stored = localStorage.getItem("pskill_userLevel");
    if (!stored) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, []);

  const handleSelectLevel = (level: UserLevel) => {
    setUserLevel(level);
    setShowOnboarding(false);
  };

  const handleSelectExemplar = (ex: Exemplar) => handleSubstitutionRequest(ex);

  const handleClearExemplar = () => {
    setRemixImage(null);
    setActiveExemplarId(null);
    setCoreSubject("");
    setActiveModifiers([]);
  };

  const handleToggleModifier = (category: string, value: string) => {
    setActiveModifiers((prev) => {
      const catConfig = MODIFIER_CATEGORIES.find(c => c.id === category);
      const isMultiSelect = catConfig?.multiSelect ?? false;
      const lowVal = value.toLowerCase();

      let next;
      const alreadyExists = prev.some(
        (m) => m.category === category && m.value.toLowerCase() === lowVal,
      );

      if (alreadyExists) {
        // Toggle OFF: Remove this specific value
        next = prev.filter(
          (m) => !(m.category === category && m.value.toLowerCase() === lowVal),
        );
      } else if (!isMultiSelect) {
        // Exclusive Mode: Replace previous selection in this category
        next = [
          ...prev.filter((m) => m.category !== category),
          { id: Math.random().toString(36).substring(7), category, value },
        ];
      } else {
        // Additive Mode: Just add it
        next = [
          ...prev,
          { id: Math.random().toString(36).substring(7), category, value },
        ];
      }

      // Live Sync: If we have a compiled prompt, try to update it safely using functional updater
      setCompiledPrompt((prevPrompt) => {
        if (!prevPrompt) return prevPrompt;
        const synced = syncModifiersWithText(prevPrompt, next);
        return synced !== prevPrompt ? synced : prevPrompt;
      });

      return next;
    });
  };

  // Helper: insert variable token with guaranteed spacing
  const insertVariableAtPosition = (text: string, name: string, start: number, end: number): { newText: string; cursorPos: number } => {
    const token = `[${name}]`;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const needSpaceBefore = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n');
    const needSpaceAfter = after.length > 0 && !after.startsWith(' ') && !after.startsWith('\n');
    const insert = (needSpaceBefore ? ' ' : '') + token + (needSpaceAfter ? ' ' : '');
    return {
      newText: before + insert + after,
      cursorPos: start + insert.length,
    };
  };

  // Live raw preview
  const rawPromptPreview = `${coreSubject ? coreSubject + (activeModifiers.length > 0 ? " " : "") : ""}${activeModifiers.map((m) => `[${m.category.toUpperCase()}:${m.value.toLowerCase()}]`).join(" ")}`;
  const displayPrompt = resolvePrompt(compiledPrompt || rawPromptPreview);
  const resolvedWovenPrompt = resolvePrompt(compiledPrompt || rawPromptPreview);
  const hasInputContent = promptEditMode === "subject"
    ? coreSubject.trim().length > 0
    : (compiledPrompt || rawPromptPreview).trim().length > 0;

  // Conditionals
  const canStartFromScratch =
    userLevel === "journeyman" || userLevel === "master";
  const showProSettings = userLevel === "journeyman" || userLevel === "master";
  const availableCredits = credits?.balance || 0;

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <DashboardHeader
        user={user}
        profile={profile}
        credits={credits}
        availableCredits={availableCredits || 0}
        isAdminOrSu={isAdmin || isSu}
        effectiveRole={effectiveRole}
        switchRole={switchRole}
        setAudienceMode={setAudienceMode}
        signOut={signOut}
        onHistoryOpen={() => setIsHistoryOpen(true)}
      />

      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {/* --- ONBOARDING MODAL --- */}
        <AnimatePresence>
          {showOnboarding && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-background-secondary border border-border shadow-2xl rounded-[2.5rem] p-10 max-w-4xl w-full relative"
              >
                <button
                  onClick={() => setShowOnboarding(false)}
                  className="absolute top-6 right-6 w-10 h-10 rounded-full border border-border text-foreground-muted hover:text-foreground hover:bg-border/10 flex items-center justify-center transition-all group/close"
                >
                  <Icons.close
                    size={20}
                    className="group-hover/close:rotate-90 transition-transform"
                  />
                </button>
                <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4 text-3xl">
                    🪄
                  </div>
                  <h1 className="text-3xl font-black mb-2 tracking-tight">
                    How experienced are you with Prompting?
                  </h1>
                  <p className="text-foreground-muted">
                    We will tailor the interface to match your workflow.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Novice */}
                  <Card
                    className={`p-6 cursor-pointer transition-all duration-300 group overflow-hidden relative ${userLevel === "novice" ? "border-primary shadow-xl shadow-primary/20 bg-background hover:-translate-y-1" : "hover:border-primary/50 bg-background/50 hover:bg-background hover:-translate-y-1"}`}
                    onClick={() => handleSelectLevel("novice")}
                  >
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                      Novice
                    </h3>
                    <p className="text-sm text-foreground-muted mb-4">
                      I want a simple, guided experience using templates. No
                      complex settings.
                    </p>
                    <Badge variant="outline" className="text-xs">
                      Guided Experience
                    </Badge>
                  </Card>

                  {/* Journeyman */}
                  <Card
                    className={`p-6 cursor-pointer transition-all duration-300 group overflow-hidden relative ${userLevel === "journeyman" ? "border-blue-500 shadow-xl shadow-blue-500/20 bg-blue-500/5 hover:-translate-y-1" : "hover:border-blue-500/50 bg-background/50 hover:bg-background hover:-translate-y-1"}`}
                    onClick={() => handleSelectLevel("journeyman")}
                  >
                    {userLevel === "journeyman" && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50" />
                    )}
                    <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">
                      Journeyman
                    </h3>
                    <p className="text-sm text-foreground-muted mb-4">
                      I know the basics, but I like starting from templates
                      before customizing.
                    </p>
                    <Badge
                      variant={
                        userLevel === "journeyman" ? "gradient" : "outline"
                      }
                      className={`text-xs ${userLevel === "journeyman" ? "text-primary bg-primary/10 border-primary/20" : "border-blue-500/30 text-blue-400"}`}
                    >
                      Standard Workflow
                    </Badge>
                  </Card>

                  {/* Master */}
                  <Card
                    className={`p-6 cursor-pointer transition-all duration-300 group overflow-hidden relative ${userLevel === "master" ? "border-purple-500 shadow-xl shadow-purple-500/20 bg-purple-500/5 hover:-translate-y-1" : "hover:border-purple-500/50 bg-background/50 hover:bg-background hover:-translate-y-1"}`}
                    onClick={() => handleSelectLevel("master")}
                  >
                    <h3 className="text-xl font-bold mb-2 group-hover:text-purple-400 transition-colors">
                      Master
                    </h3>
                    <p className="text-sm text-foreground-muted mb-4">
                      Give me the absolute full control panel. I know exactly
                      what I am doing.
                    </p>
                    <Badge
                      variant="outline"
                      className="text-xs border-purple-500/30 text-purple-400"
                    >
                      High Density
                    </Badge>
                  </Card>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- MAIN APP UI --- */}
        {userLevel && !showOnboarding && (
          <>
            {/* LEFT PANE: BUILDER */}
            <div className="w-full md:w-1/2 lg:w-3/5 border-r border-border h-screen overflow-y-auto relative z-30">
              {/* Builder Header */}
              <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border/50 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🪄</span>
                  <h1 className="text-sm font-black tracking-widest uppercase">
                    Studio Generator
                  </h1>
                  <Badge
                    variant="gradient"
                    className="text-[9px] uppercase tracking-widest"
                  >
                    PRO V2
                  </Badge>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 gap-2 border border-transparent hover:border-white/5 transition-all"
                    onClick={() => setIsHistoryOpen(true)}
                  >
                    <Icons.history size={14} />
                    History
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary hover:bg-primary/5 gap-2 bg-primary/5 border border-primary/20 rounded-xl transition-all"
                    onClick={() => setShowOnboarding(true)}
                  >
                    Mode: {userLevel}{" "}
                    <Icons.settings size={12} className="ml-1" />
                  </Button>
                </div>
              </div>

              {/* Main Tabs */}
              <div className="border-b border-white/5 sticky top-[65px] bg-black/80 backdrop-blur-xl z-[45] px-6 py-4">
                <div className="flex bg-black/40 rounded-[14px] p-1 border border-white/5 shadow-inner backdrop-blur-md w-fit mx-auto">
                  {[
                    {
                      id: "styles",
                      label: "1. Styles",
                      icon: Icons.grid,
                      tourId: "tour-tab-styles",
                    },
                    {
                      id: "current",
                      label: "2. Designer",
                      icon: Icons.wand,
                      tourId: "tour-tab-current",
                    },
                    {
                      id: "templates",
                      label: "3. Templates",
                      icon: Icons.image,
                      tourId: "tour-tab-templates",
                    },
                    {
                      id: "vault",
                      label: "4. Neural Vault",
                      icon: Icons.history,
                      tourId: "tour-tab-vault",
                    },
                    {
                      id: "variables",
                      label: "5. Engineering Core",
                      icon: Icons.settings,
                      tourId: "tour-tab-variables",
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      id={tab.tourId}
                      onClick={() =>
                        setLeftTab(
                          tab.id === "templates"
                            ? "exemplars"
                            : (tab.id as any),
                        )
                      }
                      className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${leftTab ===
                        (tab.id === "templates" ? "exemplars" : tab.id)
                        ? "bg-primary/20 text-primary shadow-sm"
                        : "text-white/40 hover:text-white"
                        }`}
                    >
                      <tab.icon size={14} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {leftTab === "styles" && (
                  <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                    <div className="mb-8">
                      <h2 className="text-2xl font-black uppercase tracking-widest text-white leading-none">
                        Visual Presets
                      </h2>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-white/30 mt-3">
                        Select a professional aesthetic to jumpstart your
                        creation.
                      </p>
                    </div>

                    <VisualStylePicker
                      activeStyleId={activeStyleId}
                      onSelect={(style) => {
                        const hasExistingSettings =
                          activeModifiers.length > 0 || coreSubject.trim() !== "";
                        if (hasExistingSettings) {
                          setPendingStyle(style);
                          setShowStyleMergeModal(true);
                        } else {
                          applyStyleData(style, "replace");
                        }
                      }}
                    />
                  </div>
                )}

                {leftTab === "vault" && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">
                          {userLevel === "novice"
                            ? "Your Visual Journey"
                            : "Neural Vault"}
                        </h3>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-white/30 mt-1">
                          {userLevel === "novice"
                            ? "A gallery of your previous creative milestones."
                            : "Accessing your personal generation archives."}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/gallery")}
                        className="h-8 px-3 text-[9px] font-black uppercase tracking-widest text-primary hover:text-white"
                      >
                        Full Gallery{" "}
                        <Icons.arrowRight size={10} className="ml-2" />
                      </Button>
                    </div>

                    {loadingHistory ? (
                      <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <Icons.spinner
                          size={32}
                          className="text-primary animate-spin"
                        />
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
                          Syncing with Archives...
                        </p>
                      </div>
                    ) : historyImages.length === 0 ? (
                      <div className="py-20 flex flex-col items-center justify-center gap-6 border-2 border-dashed border-white/5 rounded-[32px] bg-white/[0.02]">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white/10">
                          <Icons.history size={32} />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-black uppercase tracking-widest text-white mb-2">
                            Vault is Empty
                          </p>
                          <p className="text-[10px] uppercase font-bold tracking-widest text-white/20">
                            Your journey begins with the first generation.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {historyImages.map((img) => {
                          const isVideo = !!(
                            img.settings?.modality === "video" ||
                            img.videoUrl ||
                            /\.(mp4|webm|mov)(\?|$)/i.test(img.imageUrl)
                          );
                          const imgIsVideo = /\.(mp4|webm|mov)(\?|$)/i.test(
                            img.imageUrl,
                          );
                          const hasThumbnail = isVideo && !imgIsVideo;
                          const videoSrc = img.videoUrl || img.imageUrl;
                          const videoSrcWithTime = videoSrc?.includes("#t=")
                            ? videoSrc
                            : `${videoSrc}#t=0.1`;

                          return (
                            <div
                              key={img.id}
                              onClick={() => handleRemix(img)}
                              className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-black/40 cursor-pointer hover:border-primary/50 transition-all duration-500 shadow-lg hover:shadow-primary/20 group/media"
                            >
                              {isVideo ? (
                                <>
                                  {hasThumbnail ? (
                                    <img
                                      src={img.imageUrl}
                                      alt=""
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 group-hover/media:opacity-0"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-black/40 flex items-center justify-center">
                                      <Icons.video
                                        size={24}
                                        className="text-white/20"
                                      />
                                    </div>
                                  )}
                                  <video
                                    src={videoSrcWithTime}
                                    className={cn(
                                      "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
                                      hasThumbnail
                                        ? "opacity-0 group-hover/media:opacity-100"
                                        : "opacity-100",
                                    )}
                                    loop
                                    muted
                                    playsInline
                                    preload="metadata"
                                    onMouseEnter={(e) => {
                                      e.currentTarget.play().catch(() => { });
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.pause();
                                      e.currentTarget.currentTime = 0.1;
                                    }}
                                  />
                                  <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-md p-1.5 rounded-lg border border-white/10 shadow-lg">
                                    <Icons.video
                                      size={10}
                                      className="text-white"
                                    />
                                  </div>
                                </>
                              ) : (
                                <img
                                  src={img.imageUrl}
                                  alt=""
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                <p className="text-[9px] text-white/90 line-clamp-2 font-medium italic">
                                  &quot;{img.prompt}&quot;
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="px-1.5 py-0.5 rounded-md bg-primary text-white text-[8px] font-black uppercase">
                                    Load
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {leftTab === "exemplars" && (
                  <section>
                    <div className="flex items-end justify-between mb-8">
                      <div>
                        <h2 className="text-2xl font-black uppercase tracking-widest text-white leading-none">
                          {userLevel === "novice"
                            ? "STYLE GUIDES (select one)"
                            : "1. Source Reference"}
                        </h2>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-white/30 mt-3">
                          {userLevel === "novice"
                            ? "Pick a visual direction to start your journey."
                            : "Select a masterpiece as your creative anchor."}
                        </p>
                      </div>
                      <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 shadow-inner backdrop-blur-sm">
                        {[
                          { id: "grid-sm", label: "S" },
                          { id: "grid-md", label: "M" },
                          { id: "grid-lg", label: "L" },
                          { id: "list", label: "LIST" },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() =>
                              setPresentationMode(tab.id as PresentationMode)
                            }
                            className={`px-3 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest transition-all duration-300 ${presentationMode === tab.id ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white"}`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* "Start From Scratch" Button (Journeyman/Master) */}
                    {canStartFromScratch && (
                      <div className="mb-4 flex justify-end">
                        <Button
                          variant={
                            activeExemplarId === null ? "primary" : "outline"
                          }
                          size="sm"
                          className="text-xs"
                          onClick={handleClearExemplar}
                        >
                          <Icons.plus size={14} className="mr-2" /> Start from
                          Scratch
                        </Button>
                      </div>
                    )}

                    {/* Merge Personal Exemplars */}
                    {(() => {
                      const combinedExemplars = [
                        ...personalExemplars,
                        ...exemplars,
                      ];
                      if (combinedExemplars.length === 0 && !loadingExemplars) {
                        return (
                          <div className="italic text-[10px] text-foreground-muted opacity-50 p-4">
                            No templates found in this view.
                          </div>
                        );
                      }

                      return (
                        <>
                          {/* Grid Modes (SM, MD, LG) */}
                          {presentationMode.startsWith("grid-") && (
                            <div
                              className={`grid gap-4 ${presentationMode === "grid-sm"
                                ? "grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
                                : presentationMode === "grid-md"
                                  ? "grid-cols-3 md:grid-cols-4"
                                  : "grid-cols-2 md:grid-cols-3"
                                }`}
                            >
                              {loadingExemplars
                                ? Array.from({ length: 6 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="rounded-xl aspect-square bg-white/5 animate-pulse"
                                  />
                                ))
                                : combinedExemplars.map((ex, idx) => {
                                  const isVideo = !!(
                                    ex.videoUrl ||
                                    /\.(mp4|webm|mov)(\?|$)/i.test(
                                      ex.thumbnailUrl,
                                    )
                                  );
                                  const isPersonal = personalExemplars.some(
                                    (p) => p.id === ex.id,
                                  );
                                  const hasValidImageThumbnail =
                                    !!ex.thumbnailUrl &&
                                    !/\.(mp4|webm|mov)(\?|$)/i.test(
                                      ex.thumbnailUrl,
                                    );
                                  const videoSrc =
                                    ex.videoUrl || ex.thumbnailUrl;
                                  const videoSrcWithTime = videoSrc?.includes(
                                    "#t=",
                                  )
                                    ? videoSrc
                                    : `${videoSrc}#t=0.1`;

                                  return (
                                    <div
                                      key={ex.id}
                                      id={
                                        idx === 1
                                          ? "tour-exemplar-2"
                                          : undefined
                                      }
                                      onClick={() => handleSelectExemplar(ex)}
                                      className={`relative rounded-xl overflow-hidden cursor-pointer group border-2 transition-all aspect-square ${activeExemplarId === ex.id ? "border-primary shadow-xl shadow-primary/20 z-10" : "border-transparent hover:border-white/20"}`}
                                    >
                                      <div className="w-full h-full relative group/media bg-black">
                                        {isVideo ? (
                                          <>
                                            {hasValidImageThumbnail && (
                                              <img
                                                src={ex.thumbnailUrl}
                                                alt={ex.title}
                                                className="w-full h-full object-cover group-hover/media:opacity-0 transition-opacity duration-500"
                                                onError={(e) => {
                                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80';
                                                }}
                                              />
                                            )}
                                            <video
                                              src={videoSrcWithTime}
                                              className={`absolute inset-0 w-full h-full object-cover ${hasValidImageThumbnail ? "opacity-0 group-hover/media:opacity-100 transition-opacity duration-300" : ""}`}
                                              loop
                                              muted
                                              playsInline
                                              preload="metadata"
                                              onMouseEnter={(e) => {
                                                e.currentTarget
                                                  .play()
                                                  .catch(() => { });
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.pause();
                                                e.currentTarget.currentTime = 0.1;
                                              }}
                                            />
                                            <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-sm p-1 rounded-lg text-white z-20 pointer-events-none">
                                              <Icons.video
                                                size={8}
                                                className="text-white"
                                              />
                                            </div>
                                          </>
                                        ) : ex.thumbnailUrl ? (
                                          <img
                                            src={ex.thumbnailUrl}
                                            alt={ex.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80';
                                            }}
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/10 uppercase font-black text-[10px] tracking-widest">
                                            No Data
                                          </div>
                                        )}

                                        {presentationMode !== "grid-sm" && (
                                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 pb-2 z-10">
                                            <p className="font-bold text-[10px] md:text-sm text-white truncate">
                                              {userLevel === "novice" &&
                                                ex.title.includes("Selection")
                                                ? "Featured Creation"
                                                : ex.title}
                                            </p>
                                            {presentationMode ===
                                              "grid-lg" && (
                                                <p className="text-[10px] text-white/50 truncate uppercase tracking-widest">
                                                  {ex.modifiers.length}{" "}
                                                  modifiers
                                                </p>
                                              )}
                                          </div>
                                        )}

                                        {activeExemplarId === ex.id && (
                                          <div className="absolute top-2 left-2 bg-primary text-white rounded-full p-1 z-20 shadow-lg scale-75 md:scale-100">
                                            <Icons.check size={14} />
                                          </div>
                                        )}

                                        {isPersonal && (
                                          <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-0.5 rounded-full z-20 shadow-lg text-[8px] font-black uppercase tracking-tighter">
                                            Personal
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}

                          {/* List Mode */}
                          {presentationMode === "list" && (
                            <div className="space-y-3">
                              {loadingExemplars
                                ? Array.from({ length: 4 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="h-20 rounded-xl bg-white/5 animate-pulse"
                                  />
                                ))
                                : combinedExemplars.map((ex, idx) => {
                                  const isVideo = !!(
                                    ex.videoUrl ||
                                    /\.(mp4|webm|mov)(\?|$)/i.test(
                                      ex.thumbnailUrl,
                                    )
                                  );
                                  const isPersonal = personalExemplars.some(
                                    (p) => p.id === ex.id,
                                  );
                                  const hasValidImageThumbnail =
                                    !!ex.thumbnailUrl &&
                                    !/\.(mp4|webm|mov)(\?|$)/i.test(
                                      ex.thumbnailUrl,
                                    );
                                  const videoSrc =
                                    ex.videoUrl || ex.thumbnailUrl;
                                  const videoSrcWithTime = videoSrc?.includes(
                                    "#t=",
                                  )
                                    ? videoSrc
                                    : `${videoSrc}#t=0.1`;

                                  return (
                                    <div
                                      key={ex.id}
                                      id={
                                        idx === 1
                                          ? "tour-exemplar-2-list"
                                          : undefined
                                      }
                                      onClick={() => handleSelectExemplar(ex)}
                                      className={`flex items-center gap-4 p-3 rounded-xl border-2 transition-all cursor-pointer ${activeExemplarId === ex.id ? "border-primary bg-primary/5 shadow-lg shadow-primary/5" : "border-border bg-background-secondary hover:border-primary/40"}`}
                                    >
                                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-black relative group/media">
                                        {isVideo ? (
                                          <>
                                            {hasValidImageThumbnail && (
                                              <img
                                                src={ex.thumbnailUrl}
                                                alt=""
                                                className="w-full h-full object-cover group-hover/media:opacity-0 transition-opacity duration-500"
                                              />
                                            )}
                                            <video
                                              src={videoSrcWithTime}
                                              className={`absolute inset-0 w-full h-full object-cover ${hasValidImageThumbnail ? "opacity-0 group-hover/media:opacity-100 transition-opacity duration-300" : ""}`}
                                              muted
                                              playsInline
                                              preload="metadata"
                                              onMouseEnter={(e) => {
                                                e.currentTarget
                                                  .play()
                                                  .catch(() => { });
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.pause();
                                                e.currentTarget.currentTime = 0.1;
                                              }}
                                            />
                                            <div className="absolute top-1 right-1 z-10">
                                              <Icons.video
                                                size={10}
                                                className="text-white"
                                              />
                                            </div>
                                          </>
                                        ) : (
                                          <img
                                            src={ex.thumbnailUrl}
                                            alt=""
                                            className="w-full h-full object-cover"
                                          />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center">
                                          <h3 className="font-bold text-sm mb-0.5">
                                            {userLevel === "novice" &&
                                              ex.title.includes("Selection")
                                              ? "Featured Creation"
                                              : ex.title}
                                          </h3>
                                          {isPersonal && (
                                            <Badge className="ml-2 bg-purple-600/20 text-purple-400 border-purple-500/20 text-[8px]">
                                              Personal
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-xs text-foreground-muted truncate mb-2">
                                          {ex.description}
                                        </p>
                                        <div className="flex gap-1">
                                          {ex.modifiers
                                            .slice(0, 3)
                                            .map((m) => (
                                              <span
                                                key={m.id}
                                                className="text-[8px] uppercase tracking-tighter bg-white/5 px-1.5 py-0.5 rounded-sm border border-white/5"
                                              >
                                                {m.value}
                                              </span>
                                            ))}
                                        </div>
                                      </div>
                                      {activeExemplarId === ex.id && (
                                        <div className="bg-primary text-white rounded-full p-1 h-8 w-8 flex items-center justify-center shadow-lg">
                                          <Icons.check size={16} />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </section>
                )}

                {leftTab === "variables" && (
                  <VariableVault />
                )}

                {leftTab === "current" && (
                  <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                        <Icons.wand size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black uppercase tracking-widest text-white leading-none">
                          {userLevel === "novice"
                            ? "Creation Workspace"
                            : "Studio Configuration"}
                        </h2>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-white/30 mt-3">
                          {userLevel === "novice"
                            ? "Refine your prompt and add modifiers."
                            : "Synthesizing architectural DNA for your masterpiece."}
                        </p>
                      </div>
                      <div className="ml-auto flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleBack}
                          className="h-10 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] group gap-2"
                        >
                          <Icons.arrowLeft size={12} className="text-white/60 group-hover:text-white transition-colors" />
                          Back
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveDraft(true)}
                          disabled={isSavingDraft || !hasInputContent}
                          className="h-10 px-4 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary rounded-xl text-[9px] font-black uppercase tracking-[0.2em] group gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Icons.save size={12} className={cn("text-primary/60 group-hover:text-primary transition-colors", isSavingDraft && "animate-pulse")} />
                          {isSavingDraft ? "Saving..." : "Save Progress"}
                        </Button>
                        {(coreSubject ||
                          activeModifiers.length > 0 ||
                          remixImage ||
                          activeExemplarId) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleResetWorkspace}
                              className="h-10 px-4 bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 text-red-400 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] group gap-2"
                            >
                              <Icons.trash
                                size={12}
                                className="text-red-400/60 group-hover:text-red-400 transition-colors"
                              />
                              Reset Workspace
                            </Button>
                          )}
                      </div>
                    </div>

                    {(() => {
                      const activeExemplar = [
                        ...personalExemplars,
                        ...exemplars,
                      ].find((ex) => ex.id === activeExemplarId);
                      const displayImage = remixImage || activeExemplar;

                      const originalPromptStr = remixImage
                        ? (remixImage.settings?.coreSubject || remixImage.prompt)
                        : activeExemplar
                          ? `${activeExemplar.subjectBase}${activeExemplar.modifiers.length > 0 ? ', ' : ''}${activeExemplar.modifiers.map(m => m.value).join(", ")}`
                          : "No original prompt available. You are starting from scratch.";

                      if (!displayImage) {
                        return (
                          <div className="flex flex-col items-center justify-center py-16 text-center border border-white/10 rounded-3xl bg-white/5 backdrop-blur-sm relative overflow-hidden group">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05),transparent_70%)] pointer-events-none" />
                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:border-primary/30 transition-all duration-500">
                              <Icons.plus
                                size={32}
                                className="text-white/20 group-hover:text-primary transition-colors duration-500"
                              />
                            </div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-white mb-2">
                              Workspace Initialized
                            </h3>
                            <p className="text-[10px] uppercase font-bold tracking-widest text-white/30 max-w-xs mb-8 leading-relaxed">
                              Awaiting architectural input. Select an anchor
                              reference or begin a manual synthesis.
                            </p>
                            <div className="flex items-center gap-4 mb-8">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setGalleryModalMode("personal");
                                  setIsGalleryModalOpen(true);
                                }}
                                className="mb-0 rounded-xl text-[10px] font-black uppercase tracking-widest h-10 px-6 border-white/10 hover:border-primary/30 transition-all"
                              >
                                Browse Gallery
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setGalleryModalMode("community");
                                  setIsGalleryModalOpen(true);
                                }}
                                className="mb-0 rounded-xl text-[10px] font-black uppercase tracking-widest h-10 px-6 border-white/10 hover:border-primary/30 transition-all shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                              >
                                Browse Community
                              </Button>
                            </div>

                            <div className="w-full max-w-2xl px-6 mt-6">
                              <div
                                className={`p-8 rounded-2xl transition-all duration-500 backdrop-blur-md border ${promptEditMode === "full" ? "border-purple-500/30 bg-purple-500/10 shadow-[0_0_40px_rgba(168,85,247,0.15)]" : "border-white/10 bg-white/5 shadow-2xl"}`}
                              >
                                <div className="flex items-center justify-between mb-6">
                                  <div className="flex items-center gap-2">
                                    <label
                                      className={`text-[10px] font-black uppercase tracking-widest transition-colors ${promptEditMode === "full" ? "text-purple-400" : "text-primary"}`}
                                    >
                                      {promptEditMode === "subject"
                                        ? userLevel === "novice"
                                          ? "Artistic Subject"
                                          : "Active DNA"
                                        : userLevel === "novice"
                                          ? "Advanced Prompt"
                                          : "Woven DNA"}
                                    </label>
                                    {promptEditMode === "full" && (
                                      <span className="text-[8px] font-black uppercase tracking-widest text-purple-500/50 bg-purple-500/10 px-2 py-0.5 rounded">
                                        MOD_FULL
                                      </span>
                                    )}
                                    <Tooltip content="Improve and edit woven prompt via AI assistance">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setImprovePromptText(compiledPrompt || rawPromptPreview);
                                          setShowImprovePromptModal(true);
                                        }}
                                        disabled={!(compiledPrompt || rawPromptPreview)}
                                        className="p-1.5 rounded-lg hover:bg-white/5 text-foreground-muted hover:text-primary transition-colors disabled:opacity-30 ml-1"
                                      >
                                        <Icons.sparkles size={14} />
                                      </button>
                                    </Tooltip>
                                  </div>
                                  {userLevel !== "novice" && (
                                    <div className="flex items-center gap-3">
                                      <Tooltip
                                        content="DNA SYNTHESIS: Combines your 'Active DNA' and 'Engineering Core' into a high-fidelity 'Woven DNA' prompt. (10 per minute)"
                                        position="left"
                                      >
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={handleCompilePrompt}
                                          disabled={
                                            isCompiling || !hasInputContent
                                          }
                                          className="h-9 text-[10px] font-black uppercase tracking-widest text-primary hover:text-white hover:bg-primary/20 border border-primary/20 rounded-xl px-4 relative"
                                        >
                                          {isCompiling ? (
                                            <>
                                              <Icons.spinner className="w-3 h-3 mr-2 animate-spin" />{" "}
                                              Weaving
                                            </>
                                          ) : (
                                            <>
                                              <Icons.wand className="w-3 h-3 mr-2" />{" "}
                                              Weave
                                            </>
                                          )}
                                          {remainingCompiles !== null && (
                                            <span
                                              className={cn(
                                                "absolute -top-1 -right-1 z-20 px-1.5 py-0.5 rounded-full text-[8px] font-bold border shadow-sm",
                                                remainingCompiles > 0
                                                  ? "bg-primary text-black border-primary/20"
                                                  : "bg-red-500 text-white border-red-500/20",
                                              )}
                                            >
                                              {remainingCompiles}
                                            </span>
                                          )}
                                        </Button>
                                      </Tooltip>
                                      <div className="flex bg-black/40 p-1 rounded-[14px] border border-white/5 mx-2">
                                        <button
                                          onClick={() => {
                                            // Sync variables from full prompt back to coreSubject before switching
                                            if (promptEditMode === "full" && compiledPrompt) {
                                              const varPattern = /(?<!')\[[A-Z_]+(?::[^\]]+)?\](?!')/g;
                                              const fullVars: string[] = compiledPrompt.match(varPattern) || [];
                                              const subjectVars: string[] = coreSubject.match(varPattern) || [];
                                              const newVars = fullVars.filter(v => !subjectVars.includes(v));
                                              if (newVars.length > 0) {
                                                setCoreSubject(prev => prev + (prev.endsWith(' ') ? '' : ' ') + newVars.join(' '));
                                              }
                                            }
                                            setPromptEditMode("subject");
                                          }}
                                          className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${promptEditMode === "subject" ? "bg-primary/20 text-primary shadow-sm" : "text-white/40 hover:text-white"}`}
                                        >
                                          Partial
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (
                                              promptEditMode === "subject" &&
                                              !compiledPrompt
                                            ) {
                                              setCompiledPrompt(
                                                rawPromptPreview,
                                              );
                                            }
                                            setPromptEditMode("full");
                                          }}
                                          className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${promptEditMode === "full" ? "bg-purple-600/20 text-purple-400 shadow-sm" : "text-white/40 hover:text-white"}`}
                                        >
                                          Full
                                        </button>
                                      </div>
                                      <Tooltip content="Copy full prompt to buffer">
                                        <button
                                          onClick={handleCopyPrompt}
                                          disabled={!displayPrompt}
                                          className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-primary hover:border-primary/40 transition-all flex items-center justify-center disabled:opacity-20 disabled:pointer-events-none"
                                        >
                                          <Icons.copy size={14} />
                                        </button>
                                      </Tooltip>
                                      <button
                                        onClick={() => setIsInteractiveDNA(!isInteractiveDNA)}
                                        className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg border transition-all ${isInteractiveDNA ? "bg-primary/20 border-primary/40 text-primary" : "border-white/5 text-white/20 hover:text-white"}`}
                                      >
                                        {isInteractiveDNA ? "ON: Interactive" : "OFF: Interactive"}
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {isInteractiveDNA ? (
                                  <div className="relative">
                                    <div className="w-full px-5 py-4 pr-12 rounded-xl bg-black/40 border border-primary/20 min-h-[54px] flex items-center shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]">
                                      <VariableInteractiveEditor text={promptEditMode === "subject" ? coreSubject : (compiledPrompt || rawPromptPreview)} />
                                    </div>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                      <VariableInjector onInject={(name) => {
                                        if (promptEditMode === "subject") {
                                          const { newText } = insertVariableAtPosition(coreSubject, name, coreSubject.length, coreSubject.length);
                                          setCoreSubject(newText);
                                        } else {
                                          const currentText = compiledPrompt || rawPromptPreview;
                                          const { newText } = insertVariableAtPosition(currentText, name, currentText.length, currentText.length);
                                          setCompiledPrompt(newText);
                                        }
                                      }} />
                                    </div>
                                  </div>
                                ) : promptEditMode === "subject" ? (
                                  <div className="relative">
                                    <input
                                      id="prompt-subject-input"
                                      type="text"
                                      value={coreSubject}
                                      onChange={(e) =>
                                        setCoreSubject(e.target.value)
                                      }
                                      onKeyUp={(e) => setInputCursorPos({ start: e.currentTarget.selectionStart || 0, end: e.currentTarget.selectionEnd || 0 })}
                                      onClick={(e) => setInputCursorPos({ start: e.currentTarget.selectionStart || 0, end: e.currentTarget.selectionEnd || 0 })}
                                      onBlur={(e) => setInputCursorPos({ start: e.currentTarget.selectionStart || 0, end: e.currentTarget.selectionEnd || 0 })}
                                      placeholder="Define your mental image..."
                                      className="w-full px-5 py-4 pr-12 rounded-xl bg-black/40 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all text-sm font-medium placeholder:text-white/10"
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                      <VariableInjector onInject={(name) => {
                                        const input = document.getElementById('prompt-subject-input') as HTMLInputElement;
                                        const start = inputCursorPos?.start ?? coreSubject.length;
                                        const end = inputCursorPos?.end ?? coreSubject.length;
                                        const { newText, cursorPos } = insertVariableAtPosition(coreSubject, name, start, end);
                                        if (input) input.focus();
                                        setCoreSubject(newText);
                                        if (input) {
                                          setTimeout(() => {
                                            input.setSelectionRange(cursorPos, cursorPos);
                                          }, 0);
                                        }
                                      }} />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-6">
                                    <div className="group/name relative">
                                      <div className="flex items-center gap-2 mb-2 ml-1">
                                        <Icons.tag size={10} className="text-purple-500/50 group-focus-within/name:text-purple-400 transition-colors" />
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 group-focus-within/name:text-purple-400/70 transition-colors">
                                          Prompt Set Name
                                        </label>
                                      </div>
                                      <input
                                        type="text"
                                        value={genState.promptSetName || ""}
                                        onChange={(e) => setGenState({ ...genState, promptSetName: e.target.value })}
                                        placeholder="Untitled Architectural Sequence..."
                                        className="w-full bg-purple-500/5 border border-purple-500/20 rounded-2xl px-6 py-4 text-sm font-bold text-purple-100 placeholder:text-purple-500/20 outline-none focus:border-purple-500/40 focus:bg-purple-500/10 transition-all shadow-inner"
                                      />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                      <div className="group/attribution-name relative">
                                        <div className="flex items-center justify-between mb-2 ml-1">
                                          <div className="flex items-center gap-2">
                                            <Icons.user size={10} className="text-purple-500/50 group-focus-within/attribution-name:text-purple-400 transition-colors" />
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 group-focus-within/attribution-name:text-purple-400/70 transition-colors">
                                              Attribution Name
                                            </label>
                                          </div>
                                          {(profile?.displayName || profile?.username) && (
                                            <button
                                              type="button"
                                              onClick={() => setGenState({ ...genState, attributionName: profile?.displayName || profile?.username || "" })}
                                              className="text-[8px] font-black uppercase tracking-widest text-purple-500/50 hover:text-purple-400 transition-colors mr-1"
                                            >
                                              Use Profile Name
                                            </button>
                                          )}
                                        </div>
                                        <input
                                          type="text"
                                          value={genState.attributionName || ""}
                                          onChange={(e) => setGenState({ ...genState, attributionName: e.target.value })}
                                          placeholder="Original Creator..."
                                          className="w-full bg-purple-500/5 border border-purple-500/20 rounded-2xl px-6 py-4 text-sm font-bold text-purple-100 placeholder:text-purple-500/20 outline-none focus:border-purple-500/40 focus:bg-purple-500/10 transition-all shadow-inner"
                                        />
                                      </div>
                                      <div className="group/attribution-url relative">
                                        <div className="flex items-center justify-between mb-2 ml-1">
                                          <div className="flex items-center gap-2">
                                            <Icons.external size={10} className="text-purple-500/50 group-focus-within/attribution-url:text-purple-400 transition-colors" />
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 group-focus-within/attribution-url:text-purple-400/70 transition-colors">
                                              Attribution Link
                                            </label>
                                          </div>
                                          {profile?.socialLinks?.website && (
                                            <button
                                              type="button"
                                              onClick={() => setGenState({ ...genState, attributionUrl: profile.socialLinks?.website || "" })}
                                              className="text-[8px] font-black uppercase tracking-widest text-purple-500/50 hover:text-purple-400 transition-colors mr-1"
                                            >
                                              Use Profile Link
                                            </button>
                                          )}
                                        </div>
                                        <input
                                          type="url"
                                          value={genState.attributionUrl || ""}
                                          onChange={(e) => setGenState({ ...genState, attributionUrl: e.target.value })}
                                          placeholder="https://..."
                                          className="w-full bg-purple-500/5 border border-purple-500/20 rounded-2xl px-6 py-4 text-sm font-bold text-purple-100 placeholder:text-purple-500/20 outline-none focus:border-purple-500/40 focus:bg-purple-500/10 transition-all shadow-inner"
                                        />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                      <div className="group/originator-name relative">
                                        <div className="flex items-center justify-between mb-2 ml-1">
                                          <div className="flex items-center gap-2">
                                            <Icons.user size={10} className="text-purple-500/50 group-focus-within/originator-name:text-purple-400 transition-colors" />
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 group-focus-within/originator-name:text-purple-400/70 transition-colors">
                                              Originator Name
                                            </label>
                                          </div>
                                          {(profile?.displayName || profile?.username) && (
                                            <button
                                              type="button"
                                              onClick={() => setGenState({ ...genState, originatorName: profile?.displayName || profile?.username || "" })}
                                              className="text-[8px] font-black uppercase tracking-widest text-purple-500/50 hover:text-purple-400 transition-colors mr-1"
                                            >
                                              Use Profile Name
                                            </button>
                                          )}
                                        </div>
                                        <input
                                          type="text"
                                          value={genState.originatorName || ""}
                                          onChange={(e) => setGenState({ ...genState, originatorName: e.target.value })}
                                          placeholder="Genesis Creator..."
                                          className="w-full bg-purple-500/5 border border-purple-500/20 rounded-2xl px-6 py-4 text-sm font-bold text-purple-100 placeholder:text-purple-500/20 outline-none focus:border-purple-500/40 focus:bg-purple-500/10 transition-all shadow-inner"
                                        />
                                      </div>
                                      <div className="group/originator-url relative">
                                        <div className="flex items-center justify-between mb-2 ml-1">
                                          <div className="flex items-center gap-2">
                                            <Icons.external size={10} className="text-purple-500/50 group-focus-within/originator-url:text-purple-400 transition-colors" />
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 group-focus-within/originator-url:text-purple-400/70 transition-colors">
                                              Originator Link
                                            </label>
                                          </div>
                                          {profile?.socialLinks?.website && (
                                            <button
                                              type="button"
                                              onClick={() => setGenState({ ...genState, originatorUrl: profile.socialLinks?.website || "" })}
                                              className="text-[8px] font-black uppercase tracking-widest text-purple-500/50 hover:text-purple-400 transition-colors mr-1"
                                            >
                                              Use Profile Link
                                            </button>
                                          )}
                                        </div>
                                        <input
                                          type="url"
                                          value={genState.originatorUrl || ""}
                                          onChange={(e) => setGenState({ ...genState, originatorUrl: e.target.value })}
                                          placeholder="https://..."
                                          className="w-full bg-purple-500/5 border border-purple-500/20 rounded-2xl px-6 py-4 text-sm font-bold text-purple-100 placeholder:text-purple-500/20 outline-none focus:border-purple-500/40 focus:bg-purple-500/10 transition-all shadow-inner"
                                        />
                                      </div>
                                    </div>
                                    <div className="relative">
                                      <textarea
                                        id="prompt-full-textarea"
                                        ref={(el) => {
                                          if (el) {
                                            el.style.height = "auto";
                                            el.style.height =
                                              Math.min(el.scrollHeight, 400) + "px";
                                          }
                                        }}
                                        value={compiledPrompt || rawPromptPreview}
                                        onChange={(e) => {
                                          const newText = e.target.value;
                                          setCompiledPrompt(newText);
                                          setActiveModifiers(prev => getActiveModifiersFromText(newText, prev as any) as any);
                                          const el = e.target;
                                          el.style.height = "auto";
                                          el.style.height =
                                            Math.min(el.scrollHeight, 400) + "px";
                                        }}
                                        onKeyUp={(e) => setInputCursorPos({ start: e.currentTarget.selectionStart || 0, end: e.currentTarget.selectionEnd || 0 })}
                                        onClick={(e) => setInputCursorPos({ start: e.currentTarget.selectionStart || 0, end: e.currentTarget.selectionEnd || 0 })}
                                        onBlur={(e) => setInputCursorPos({ start: e.currentTarget.selectionStart || 0, end: e.currentTarget.selectionEnd || 0 })}
                                        placeholder="Refining the synthesized output..."
                                        rows={2}
                                        style={{ maxHeight: "400px" }}
                                        className="w-full px-5 py-4 pr-12 rounded-xl bg-black/40 border border-purple-500/30 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 outline-none transition-all text-sm font-medium italic resize-none custom-scrollbar overflow-y-auto placeholder:text-purple-500/20"
                                      />
                                      <div className="absolute right-2 top-4">
                                        <VariableInjector onInject={(name) => {
                                          const input = document.getElementById('prompt-full-textarea') as HTMLTextAreaElement;
                                          const currentText = compiledPrompt || rawPromptPreview;
                                          const start = inputCursorPos?.start ?? currentText.length;
                                          const end = inputCursorPos?.end ?? currentText.length;
                                          const { newText, cursorPos } = insertVariableAtPosition(currentText, name, start, end);
                                          if (input) input.focus();
                                          setCompiledPrompt(newText);
                                          if (input) {
                                            setTimeout(() => {
                                              input.setSelectionRange(cursorPos, cursorPos);
                                            }, 0);
                                          }
                                        }} />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {promptEditMode === "full" && (
                                  <div className="mt-4 flex items-center justify-between text-[10px] text-purple-400/40 font-bold uppercase tracking-widest">
                                    <div className="flex items-center gap-2">
                                      <Icons.info size={10} />
                                      Local Synthesis Cache (Temporary Override)
                                    </div>
                                    <span className="font-mono not-italic bg-purple-500/10 px-2 py-0.5 rounded">
                                      {(compiledPrompt || rawPromptPreview).length} CHARS
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="mt-4 mb-6">
                                <ActiveVariablesPanel />
                              </div>
                            </div>

                            <div className="w-full max-w-2xl px-6">
                              <Card
                                id="tour-modifiers-empty"
                                className="border-border bg-background p-0 overflow-visible"
                              >
                                <DNAStrip
                                  activeModifiers={activeModifiers}
                                  coreSubject={coreSubject}
                                  onRemoveModifier={handleToggleModifier}
                                  userLevel={userLevel}
                                  isOpen={isModifiersOpen}
                                  onToggle={() =>
                                    setIsModifiersOpen(true)
                                  }
                                  synthesisRequired={synthesisRequired}
                                  isDnaModified={isInputDiverged || isOutputDiverged}
                                  onClearAll={handleClearDNA}
                                  onReset={handleResetToOriginal}
                                  onOpenStyles={() => setLeftTab("styles")}
                                  canReset={!!remixImage || !!activeExemplarId}
                                />
                              </Card>

                              {userLevel !== "novice" && (
                                <div className="mt-8 space-y-8 w-full text-left">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[10px] uppercase font-black tracking-widest text-primary block leading-none">
                                        {userLevel === "master"
                                          ? "DNA Structure (Original Prompt)"
                                          : "Synthesized Prompt"}
                                      </label>
                                      <div className="flex items-center gap-3">
                                        <Tooltip content="Copy full prompt to buffer">
                                          <button
                                            onClick={handleCopyPrompt}
                                            className="p-1 rounded-md bg-white/5 border border-white/10 text-white/60 hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center shrink-0"
                                          >
                                            <Icons.copy size={14} />
                                          </button>
                                        </Tooltip>
                                        <span className="text-[10px] font-mono text-foreground-muted/40 px-2 border-l border-white/10">
                                          {originalPromptStr.length} chars
                                        </span>
                                      </div>
                                    </div>
                                    <div
                                      className={`p-6 rounded-xl text-sm font-medium italic max-h-[400px] overflow-y-auto w-full custom-scrollbar leading-relaxed transition-colors border-purple-500/10 text-purple-200/90 bg-purple-500/5`}
                                    >
                                      <span className="block whitespace-pre-wrap">
                                        {originalPromptStr}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Determine if it's an exemplar or a generated image
                      const isExemplar = !!activeExemplar;
                      const title = isExemplar
                        ? (activeExemplar as Exemplar).title
                        : ((remixImage as GeneratedImage)?.promptSetName || "Remix Target");
                      const description = isExemplar
                        ? (activeExemplar as Exemplar).description
                        : "You are currently iterating on a previous generation.";

                      // Handle media
                      const mediaUrl = isExemplar
                        ? (activeExemplar as Exemplar).thumbnailUrl
                        : (remixImage as GeneratedImage).imageUrl;
                      const videoUrl = isExemplar
                        ? (activeExemplar as Exemplar).videoUrl
                        : (remixImage as GeneratedImage).videoUrl;
                      const isVideo = !!(
                        videoUrl || /\.(mp4|webm|mov)(\?|$)/i.test(mediaUrl)
                      );

                      return (
                        <div className="space-y-8">
                          {/* Media Insight */}
                          <div className="overflow-hidden border border-white/10 bg-white/5 shadow-2xl rounded-3xl backdrop-blur-md">
                            <div className="aspect-video relative bg-black group/current">
                              {isVideo ? (
                                <>
                                  {/(\.(mp4|webm|mov)(\?|$))/i.test(
                                    mediaUrl || "",
                                  ) ? (
                                    <video
                                      src={`${mediaUrl}#t=0.1`}
                                      className="w-full h-full object-contain"
                                      preload="metadata"
                                      muted
                                      playsInline
                                    />
                                  ) : (
                                    <img
                                      src={mediaUrl}
                                      alt={title}
                                      className="w-full h-full object-contain"
                                    />
                                  )}
                                  <video
                                    src={videoUrl || mediaUrl}
                                    className="absolute inset-0 w-full h-full object-contain z-20 opacity-0 group-hover/current:opacity-100 transition-opacity duration-300"
                                    loop
                                    muted
                                    playsInline
                                    preload="metadata"
                                    onMouseEnter={(e) => {
                                      if (e.currentTarget.paused)
                                        e.currentTarget.play().catch(() => { });
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.pause();
                                      e.currentTarget.currentTime = 0;
                                    }}
                                  />
                                </>
                              ) : (
                                <img
                                  src={mediaUrl}
                                  alt={title}
                                  className="w-full h-full object-contain"
                                />
                              )}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="text-2xl font-black text-white leading-none">
                                      {userLevel === "novice" &&
                                        title.includes("Selection")
                                        ? "Featured Creation"
                                        : title}
                                    </h3>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mt-3 font-mono">
                                      {userLevel === "novice"
                                        ? "REFERENCE PATTERN"
                                        : "DNA_REF"}
                                      :{" "}
                                      {activeExemplarId ||
                                        (remixImage as GeneratedImage).id}
                                    </p>
                                  </div>
                                  {isExemplar ? (
                                    personalExemplars.some(
                                      (p) => p.id === activeExemplarId,
                                    ) && (
                                      <Badge className="bg-purple-600/20 text-purple-400 border-purple-400/20 rounded-lg text-[10px] items-center px-3 py-1 uppercase tracking-widest">
                                        Personal Masterpiece
                                      </Badge>
                                    )
                                  ) : (
                                    <Badge className="bg-primary/20 text-primary border-primary/20 rounded-lg text-[10px] items-center px-3 py-1 uppercase tracking-widest">
                                      Remix History
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="p-10">
                              <p className="text-[13px] text-white/50 leading-relaxed font-medium uppercase tracking-widest mb-10">
                                {description}
                              </p>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                                <div className="group/attribution-name relative">
                                  <div className="flex items-center justify-between mb-2 ml-1">
                                    <div className="flex items-center gap-2">
                                      <Icons.user size={10} className="text-purple-500/50 group-focus-within/attribution-name:text-purple-400 transition-colors" />
                                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 group-focus-within/attribution-name:text-purple-400/70 transition-colors">
                                        Attribution Name
                                      </label>
                                    </div>
                                    {(profile?.displayName || profile?.username) && (
                                      <button
                                        type="button"
                                        onClick={() => setGenState({ ...genState, attributionName: profile?.displayName || profile?.username || "" })}
                                        className="text-[8px] font-black uppercase tracking-widest text-purple-500/50 hover:text-purple-400 transition-colors mr-1"
                                      >
                                        Use Profile Name
                                      </button>
                                    )}
                                  </div>
                                  <input
                                    type="text"
                                    value={genState.attributionName || ""}
                                    onChange={(e) => setGenState({ ...genState, attributionName: e.target.value })}
                                    placeholder="Original Creator..."
                                    className="w-full bg-purple-500/5 border border-purple-500/20 rounded-2xl px-6 py-4 text-sm font-bold text-purple-100 placeholder:text-purple-500/20 outline-none focus:border-purple-500/40 focus:bg-purple-500/10 transition-all shadow-inner"
                                  />
                                </div>
                                <div className="group/attribution-url relative">
                                  <div className="flex items-center justify-between mb-2 ml-1">
                                    <div className="flex items-center gap-2">
                                      <Icons.external size={10} className="text-purple-500/50 group-focus-within/attribution-url:text-purple-400 transition-colors" />
                                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 group-focus-within/attribution-url:text-purple-400/70 transition-colors">
                                        Attribution Link
                                      </label>
                                    </div>
                                    {profile?.socialLinks?.website && (
                                      <button
                                        type="button"
                                        onClick={() => setGenState({ ...genState, attributionUrl: profile.socialLinks?.website || "" })}
                                        className="text-[8px] font-black uppercase tracking-widest text-purple-500/50 hover:text-purple-400 transition-colors mr-1"
                                      >
                                        Use Profile Link
                                      </button>
                                    )}
                                  </div>
                                  <input
                                    type="url"
                                    value={genState.attributionUrl || ""}
                                    onChange={(e) => setGenState({ ...genState, attributionUrl: e.target.value })}
                                    placeholder="https://..."
                                    className="w-full bg-purple-500/5 border border-purple-500/20 rounded-2xl px-6 py-4 text-sm font-bold text-purple-100 placeholder:text-purple-500/20 outline-none focus:border-purple-500/40 focus:bg-purple-500/10 transition-all shadow-inner"
                                  />
                                </div>
                              </div>

                              <div className="mb-12">
                                <div
                                  className={`p-8 rounded-3xl transition-all duration-500 backdrop-blur-md border relative z-40 ${promptEditMode === "full" ? "border-purple-500/30 bg-purple-500/10 shadow-[0_0_40px_rgba(168,85,247,0.15)]" : "border-white/10 bg-white/10 shadow-inner"}`}
                                >
                                  <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                      <label
                                        className={`text-[10px] font-black uppercase tracking-widest transition-colors ${promptEditMode === "full" ? "text-purple-400" : "text-primary"}`}
                                      >
                                        {userLevel === "novice"
                                          ? promptEditMode === "subject"
                                            ? "Creative Subject"
                                            : "Advanced Composition"
                                          : promptEditMode === "subject"
                                            ? "Active DNA"
                                            : "Woven DNA"}
                                      </label>
                                      {promptEditMode === "full" && (
                                        <span className="text-[8px] font-black uppercase tracking-widest text-purple-500/50 bg-purple-500/10 px-2 py-0.5 rounded">
                                          DNA_FULL
                                        </span>
                                      )}
                                      <Tooltip content="Improve and edit woven prompt via AI assistance">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setImprovePromptText(compiledPrompt || rawPromptPreview);
                                            setShowImprovePromptModal(true);
                                          }}
                                          disabled={!(compiledPrompt || rawPromptPreview)}
                                          className="p-1.5 rounded-lg hover:bg-white/5 text-foreground-muted hover:text-primary transition-colors disabled:opacity-30 ml-1"
                                        >
                                          <Icons.sparkles size={14} />
                                        </button>
                                      </Tooltip>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <Tooltip
                                        content="DNA SYNTHESIS: Combines your 'Active DNA' and 'Engineering Core' into a high-fidelity 'Woven DNA' prompt. (10 per minute)"
                                        position="left"
                                      >
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={handleCompilePrompt}
                                          disabled={
                                            isCompiling || !hasInputContent
                                          }
                                          className="h-9 text-[10px] font-black uppercase tracking-widest text-primary hover:text-white hover:bg-primary/20 border border-primary/20 rounded-xl px-4 relative"
                                        >
                                          {isCompiling ? (
                                            <>
                                              <Icons.spinner className="w-3 h-3 mr-2 animate-spin" />{" "}
                                              Weaving
                                            </>
                                          ) : (
                                            <>
                                              <Icons.wand className="w-3 h-3 mr-2" />{" "}
                                              Weave
                                            </>
                                          )}
                                          {remainingCompiles !== null && (
                                            <span
                                              className={cn(
                                                "absolute -top-1 -right-1 z-20 px-1.5 py-0.5 rounded-full text-[8px] font-bold border shadow-sm",
                                                remainingCompiles > 0
                                                  ? "bg-primary text-black border-primary/20"
                                                  : "bg-red-500 text-white border-red-500/20",
                                              )}
                                            >
                                              {remainingCompiles}
                                            </span>
                                          )}
                                        </Button>
                                      </Tooltip>
                                      <div className="flex bg-black/40 p-1 rounded-[14px] border border-white/5 mx-2">
                                        <button
                                          onClick={() => {
                                            // Sync variables from full prompt back to coreSubject before switching
                                            if (promptEditMode === "full" && compiledPrompt) {
                                              const varPattern = /(?<!')\[[A-Z_]+(?::[^\]]+)?\](?!')/g;
                                              const fullVars: string[] = compiledPrompt.match(varPattern) || [];
                                              const subjectVars: string[] = coreSubject.match(varPattern) || [];
                                              const newVars = fullVars.filter(v => !subjectVars.includes(v));
                                              if (newVars.length > 0) {
                                                setCoreSubject(prev => prev + (prev.endsWith(' ') ? '' : ' ') + newVars.join(' '));
                                              }
                                            }
                                            setPromptEditMode("subject");
                                          }}
                                          className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${promptEditMode === "subject" ? "bg-primary/20 text-primary shadow-sm" : "text-white/40 hover:text-white"}`}
                                        >
                                          Partial
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (
                                              promptEditMode === "subject" &&
                                              !compiledPrompt
                                            ) {
                                              setCompiledPrompt(
                                                rawPromptPreview,
                                              );
                                            }
                                            setPromptEditMode("full");
                                          }}
                                          className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${promptEditMode === "full" ? "bg-purple-600/20 text-purple-400 shadow-sm" : "text-white/40 hover:text-white"}`}
                                        >
                                          Full
                                        </button>
                                      </div>
                                      <Tooltip content="Copy full prompt to buffer">
                                        <button
                                          onClick={handleCopyPrompt}
                                          disabled={!displayPrompt}
                                          className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-primary hover:border-primary/40 transition-all flex items-center justify-center disabled:opacity-20 disabled:pointer-events-none"
                                        >
                                          <Icons.copy size={14} />
                                        </button>
                                      </Tooltip>
                                      <button
                                        onClick={() => setIsInteractiveDNA(!isInteractiveDNA)}
                                        className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg border transition-all ${isInteractiveDNA ? "bg-primary/20 border-primary/40 text-primary" : "border-white/5 text-white/20 hover:text-white"}`}
                                      >
                                        {isInteractiveDNA ? "ON: Interactive" : "OFF: Interactive"}
                                      </button>
                                    </div>
                                  </div>

                                  {isInteractiveDNA ? (
                                    <div className="relative">
                                      <div className="w-full px-5 py-4 pr-12 rounded-xl bg-black/40 border border-primary/20 min-h-[54px] flex items-center shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]">
                                        <VariableInteractiveEditor text={promptEditMode === "subject" ? coreSubject : (compiledPrompt || rawPromptPreview)} />
                                      </div>
                                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                        <VariableInjector onInject={(name) => {
                                          if (promptEditMode === "subject") {
                                            const { newText } = insertVariableAtPosition(coreSubject, name, coreSubject.length, coreSubject.length);
                                            setCoreSubject(newText);
                                          } else {
                                            const currentText = compiledPrompt || rawPromptPreview;
                                            const { newText } = insertVariableAtPosition(currentText, name, currentText.length, currentText.length);
                                            setCompiledPrompt(newText);
                                          }
                                        }} />
                                      </div>
                                    </div>
                                  ) : promptEditMode === "subject" ? (
                                    <div className="relative">
                                      <input
                                        id="prompt-remix-subject-input"
                                        type="text"
                                        value={coreSubject}
                                        onChange={(e) =>
                                          setCoreSubject(e.target.value)
                                        }
                                        onKeyUp={(e) => setInputCursorPos({ start: e.currentTarget.selectionStart || 0, end: e.currentTarget.selectionEnd || 0 })}
                                        onClick={(e) => setInputCursorPos({ start: e.currentTarget.selectionStart || 0, end: e.currentTarget.selectionEnd || 0 })}
                                        onBlur={(e) => setInputCursorPos({ start: e.currentTarget.selectionStart || 0, end: e.currentTarget.selectionEnd || 0 })}
                                        placeholder="Define your mental image..."
                                        className="w-full px-5 py-4 pr-12 rounded-xl bg-black/40 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all text-sm font-medium placeholder:text-white/10"
                                      />
                                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                        <VariableInjector onInject={(name) => {
                                          const input = document.getElementById('prompt-remix-subject-input') as HTMLInputElement;
                                          const start = inputCursorPos?.start ?? coreSubject.length;
                                          const end = inputCursorPos?.end ?? coreSubject.length;
                                          const { newText, cursorPos } = insertVariableAtPosition(coreSubject, name, start, end);
                                          if (input) input.focus();
                                          setCoreSubject(newText);
                                          if (input) {
                                            setTimeout(() => {
                                              input.setSelectionRange(cursorPos, cursorPos);
                                            }, 0);
                                          }
                                        }} />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="relative">
                                      <textarea
                                        id="prompt-remix-full-textarea"
                                        ref={(el) => {
                                          if (el) {
                                            el.style.height = "auto";
                                            el.style.height =
                                              Math.min(el.scrollHeight, 400) +
                                              "px";
                                          }
                                        }}
                                        value={compiledPrompt || rawPromptPreview}
                                        onChange={(e) => {
                                          const newText = e.target.value;
                                          setCompiledPrompt(newText);
                                          setActiveModifiers(prev => getActiveModifiersFromText(newText, prev as any) as any);
                                          const el = e.target;
                                          el.style.height = "auto";
                                          el.style.height =
                                            Math.min(el.scrollHeight, 400) + "px";
                                        }}
                                        onKeyUp={(e) => setInputCursorPos({ start: e.currentTarget.selectionStart || 0, end: e.currentTarget.selectionEnd || 0 })}
                                        onClick={(e) => setInputCursorPos({ start: e.currentTarget.selectionStart || 0, end: e.currentTarget.selectionEnd || 0 })}
                                        onBlur={(e) => setInputCursorPos({ start: e.currentTarget.selectionStart || 0, end: e.currentTarget.selectionEnd || 0 })}
                                        placeholder="Refining the synthesized output..."
                                        rows={2}
                                        style={{ maxHeight: "400px" }}
                                        className="w-full px-5 py-4 pr-12 rounded-xl bg-black/40 border border-purple-500/30 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 outline-none transition-all text-sm font-medium italic resize-none custom-scrollbar overflow-y-auto placeholder:text-purple-500/20"
                                      />
                                      <div className="absolute right-2 top-4">
                                        <VariableInjector onInject={(name) => {
                                          const input = document.getElementById('prompt-remix-full-textarea') as HTMLTextAreaElement;
                                          const currentText = compiledPrompt || rawPromptPreview;
                                          const start = inputCursorPos?.start ?? currentText.length;
                                          const end = inputCursorPos?.end ?? currentText.length;
                                          const { newText, cursorPos } = insertVariableAtPosition(currentText, name, start, end);
                                          if (input) input.focus();
                                          setCompiledPrompt(newText);
                                          if (input) {
                                            setTimeout(() => {
                                              input.setSelectionRange(cursorPos, cursorPos);
                                            }, 0);
                                          }
                                        }} />
                                      </div>
                                    </div>
                                  )}

                                  {promptEditMode === "full" && (
                                    <div className="mt-4 flex items-center justify-between text-[10px] text-purple-400/40 font-bold uppercase tracking-widest">
                                      <div className="flex items-center gap-2">
                                        <Icons.info size={10} />
                                        Local Synthesis Cache (Temporary
                                        Override)
                                      </div>
                                      <span className="font-mono not-italic bg-purple-500/10 px-2 py-0.5 rounded">
                                        {
                                          (compiledPrompt || rawPromptPreview)
                                            .length
                                        }{" "}
                                        CHARS
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="mt-6">
                                  <ActiveVariablesPanel />
                                </div>
                              </div>

                              <div className="mb-12">
                                <div
                                  id="tour-modifiers"
                                  className="border border-white/10 bg-white/5 rounded-3xl overflow-visible backdrop-blur-md"
                                >
                                  <DNAStrip
                                    activeModifiers={activeModifiers}
                                    coreSubject={coreSubject}
                                    onRemoveModifier={handleToggleModifier}
                                    userLevel={userLevel}
                                    isOpen={isModifiersOpen}
                                    onToggle={() =>
                                      setIsModifiersOpen(true)
                                    }
                                    synthesisRequired={synthesisRequired}
                                    isDnaModified={isInputDiverged || isOutputDiverged}
                                    onClearAll={handleClearDNA}
                                    onReset={handleResetToOriginal}
                                    onOpenStyles={() => setLeftTab("styles")}
                                    canReset={!!remixImage || !!activeExemplarId}
                                  />
                                </div>
                              </div>

                              {userLevel !== "novice" && (
                                <div className="space-y-8">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[10px] uppercase font-black tracking-widest text-primary block leading-none">
                                        {userLevel === "master"
                                          ? "DNA Structure (Original Prompt)"
                                          : "Synthesized Prompt"}
                                      </label>
                                      <div className="flex items-center gap-3">
                                        <Tooltip content="Copy full prompt to buffer">
                                          <button
                                            onClick={handleCopyPrompt}
                                            className="p-1 rounded-md bg-white/5 border border-white/10 text-white/60 hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center shrink-0"
                                          >
                                            <Icons.copy size={14} />
                                          </button>
                                        </Tooltip>
                                        <span className="text-[10px] font-mono text-foreground-muted/40 px-2 border-l border-white/10">
                                          {originalPromptStr.length} chars
                                        </span>
                                      </div>
                                    </div>
                                    <div
                                      className={`p-6 rounded-xl text-sm font-medium italic max-h-[400px] overflow-y-auto w-full custom-scrollbar leading-relaxed transition-colors border-purple-500/10 text-purple-200/90 bg-purple-500/5`}
                                    >
                                      <span className="block whitespace-pre-wrap">
                                        {originalPromptStr}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {!isExemplar && (
                                <div className="mt-8 pt-6 border-t border-white/5">
                                  <label className="text-[10px] uppercase font-black tracking-widest text-primary block mb-4">
                                    Original Generation DNA
                                  </label>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                      <span className="text-[8px] uppercase tracking-widest text-foreground-muted block">
                                        Seed
                                      </span>
                                      <span className="text-xs font-mono text-white">
                                        {(remixImage as GeneratedImage).settings
                                          ?.seed || "Auto"}
                                      </span>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[8px] uppercase tracking-widest text-foreground-muted block">
                                        Guidance
                                      </span>
                                      <span className="text-xs font-mono text-white">
                                        {(remixImage as GeneratedImage).settings
                                          ?.guidanceScale || 7.5}
                                      </span>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[8px] uppercase tracking-widest text-foreground-muted block">
                                        Quality
                                      </span>
                                      <span className="text-xs font-mono text-white capitalize">
                                        {(remixImage as GeneratedImage).settings
                                          ?.quality || "Standard"}
                                      </span>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[8px] uppercase tracking-widest text-foreground-muted block">
                                        Ratio
                                      </span>
                                      <span className="text-xs font-mono text-white">
                                        {(remixImage as GeneratedImage).settings
                                          ?.aspectRatio || "1:1"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {userLevel !== "novice" && (
                            <div className="flex justify-between items-center p-6 rounded-2xl bg-background-secondary border border-border">
                              <div className="flex items-center gap-3">
                                <Icons.circle
                                  size={12}
                                  className="text-green-500 fill-green-500 animate-pulse"
                                />
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                                  Currently Syncing Across Inputs
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-[10px]"
                                onClick={handleClearExemplar}
                              >
                                <Icons.trash size={12} className="mr-2" />{" "}
                                Unload Target
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </section>
                )
                }
              </div>
            </div>

            {/* RIGHT PANE: OUTPUT & PRO SETTINGS */}
            <div className="w-full md:w-1/2 lg:w-2/5 md:h-screen md:overflow-y-auto bg-black border-l border-white/5 flex flex-col relative z-10">
              <div className="flex-1 w-full p-6 md:p-8 pb-32 flex flex-col">
                {/* DYNAMIC LOGIC SIDEBAR (Always show if Pro) */}
                {showProSettings && (
                  <div className="mb-6 space-y-4">
                    <ActiveVariablesPanel collapsible defaultCollapsed />
                  </div>
                )}

                {/* THE PRO SETTINGS SIDEBAR (Journeyman & Master) */}
                {showProSettings && (
                  <div
                    id="settings-panel"
                    className="mb-12 p-8 rounded-3xl border border-purple-500/20 bg-purple-500/5 relative overflow-hidden backdrop-blur-md"
                  >
                    <div className="absolute top-0 right-0 p-3 bg-purple-500/20 rounded-bl-3xl text-purple-400">
                      <Icons.settings
                        size={16}
                        className="animate-[spin_8s_linear_infinite]"
                      />
                    </div>
                    <button
                      onClick={() =>
                        setIsEngineeringCoreOpen(!isEngineeringCoreOpen)
                      }
                      className="w-full flex items-center gap-3 mb-4 group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 leading-none group-hover:text-purple-300 transition-colors">
                          DNA Helix Architecture
                        </h3>
                        {isInputDiverged || isOutputDiverged ? (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[7px] font-black uppercase border border-purple-500/20 animate-pulse">
                            Stale DNA Detected
                          </span>
                        ) : (
                          synthesisRequired && (
                            <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/40 text-[7px] font-black uppercase border border-white/5">
                              Pending DNA Sync
                            </span>
                          )
                        )}
                      </div>

                      <div className="h-px flex-1 bg-purple-500/20 group-hover:bg-purple-500/40 transition-colors" />
                      <Icons.chevronDown
                        size={14}
                        className={`text-purple-500/40 group-hover:text-purple-400 transition-all duration-300 ${isEngineeringCoreOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isEngineeringCoreOpen ? (
                      <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="grid grid-cols-2 gap-6">
                          {/* Modality Selection */}
                          <div id="tour-modality">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-3">
                              Modality
                            </label>
                            <div className="flex bg-black/40 border border-white/5 rounded-xl overflow-hidden p-1 shadow-inner">
                              {(["image", "video"] as MediaType[]).map((m) => (
                                <button
                                  key={m}
                                  onClick={() => {
                                    if (
                                      m === "video" &&
                                      genState.aspectRatio === "1:1"
                                    ) {
                                      setGenState({
                                        ...genState,
                                        mediaType: m,
                                        aspectRatio: "16:9",
                                      });
                                    } else {
                                      setGenState({
                                        ...genState,
                                        mediaType: m,
                                      });
                                    }
                                  }}
                                  className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${genState.mediaType === m ? "bg-primary/20 text-primary shadow-sm" : "text-white/30 hover:text-white"}`}
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Aspect Ratio */}
                          <div id="tour-aspect-ratio">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-3">
                              Aspect Ratio
                            </label>
                            <div className="relative group">
                              <select
                                value={genState.aspectRatio}
                                onChange={(e) =>
                                  setGenState({
                                    ...genState,
                                    aspectRatio: e.target.value,
                                  })
                                }
                                className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer"
                              >
                                <option
                                  value="1:1"
                                  disabled={genState.mediaType === "video"}
                                  className="bg-[#050508]"
                                >
                                  1:1 Square{" "}
                                  {genState.mediaType === "video"
                                    ? "(Images only)"
                                    : ""}
                                </option>
                                <option value="16:9" className="bg-[#050508]">
                                  16:9 Landscape
                                </option>
                                <option value="9:16" className="bg-[#050508]">
                                  9:16 Portrait
                                </option>
                              </select>
                              <Icons.chevronDown
                                size={12}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none group-hover:text-white/40 transition-colors"
                              />
                            </div>
                          </div>

                          {/* Quality tier conversion logic is maintained for accuracy */}
                          <div id="tour-quality">
                            <div className="flex justify-between items-center mb-3">
                              <label className="text-[10px] font-black uppercase tracking-widest text-white/30">
                                Quality
                              </label>
                              <span className="text-[8px] font-black uppercase tracking-widest text-amber-500/60 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
                                {(() => {
                                  const perImage = getGenerationCost(
                                    genState.mediaType as any,
                                    genState.quality as any,
                                    genState.modelType as any
                                  );
                                  const totalCost =
                                    perImage * genState.batchSize;
                                  return `Cost: ${totalCost}c`;
                                })()}
                              </span>
                            </div>
                            <div className="relative group">
                              <select
                                value={
                                  genState.mediaType === "video"
                                    ? "video"
                                    : genState.quality
                                }
                                onChange={(e) =>
                                  setGenState({
                                    ...genState,
                                    quality: e.target.value as any,
                                  })
                                }
                                disabled={genState.mediaType === "video"}
                                className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer"
                              >
                                {genState.mediaType === "video" ? (
                                  <option
                                    value="video"
                                    className="bg-[#050508]"
                                  >
                                    Cinematic Video (10c)
                                  </option>
                                ) : (
                                  <>
                                    <option
                                      value="standard"
                                      className="bg-[#050508]"
                                    >
                                      Standard ({getGenerationCost('image', 'standard', genState.modelType as any)}c)
                                    </option>
                                    <option
                                      value="high"
                                      className="bg-[#050508]"
                                    >
                                      HD ({getGenerationCost('image', 'high', genState.modelType as any)}c)
                                    </option>
                                    <option
                                      value="ultra"
                                      className="bg-[#050508]"
                                    >
                                      Ultra-HD ({getGenerationCost('image', 'ultra', genState.modelType as any)}c)
                                    </option>
                                  </>
                                )}
                              </select>
                              <Icons.chevronDown
                                size={12}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none group-hover:text-white/40 transition-colors"
                              />
                            </div>
                          </div>

                          {/* Batch Size */}
                          <div id="tour-batch-size">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-3">
                              Batch Size
                            </label>
                            <div className="flex bg-black/40 border border-white/5 rounded-xl overflow-hidden items-center p-1 shadow-inner h-[46px]">
                              <button
                                onClick={() =>
                                  setGenState((prev) => ({
                                    ...prev,
                                    batchSize: Math.max(1, prev.batchSize - 1),
                                  }))
                                }
                                className="px-3 h-full text-white/20 hover:text-white transition-colors"
                              >
                                <Icons.minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={genState.batchSize || ""}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  setGenState((prev) => ({
                                    ...prev,
                                    batchSize: isNaN(val) || val < 1 ? 1 : val,
                                  }));
                                }}
                                className="w-full bg-transparent text-center text-[10px] font-black tracking-widest outline-none py-1 text-purple-400 font-mono"
                              />
                              <button
                                onClick={() =>
                                  setGenState((prev) => ({
                                    ...prev,
                                    batchSize: prev.batchSize + 1,
                                  }))
                                }
                                className="px-3 h-full text-white/20 hover:text-white transition-colors"
                              >
                                <Icons.plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Prompt Set Name */}
                          <div>
                            <label className="text-[10px] uppercase tracking-widest text-foreground-muted block mb-2">
                              Prompt Set Name
                            </label>
                            <input
                              type="text"
                              value={genState.promptSetName || ""}
                              onChange={(e) =>
                                setGenState({ ...genState, promptSetName: e.target.value })
                              }
                              placeholder="Auto-generated if left blank"
                              maxLength={100}
                              className="w-full bg-black/50 border border-white/5 rounded-lg p-1.5 text-xs text-foreground font-medium outline-none focus:border-purple-500/50 mb-3"
                            />
                          </div>

                          {/* Prompt Set ID */}
                          <div>
                            <label className="text-[10px] uppercase tracking-widest text-foreground-muted block mb-2 flex justify-between">
                              Set ID
                              <button
                                onClick={() =>
                                  setGenState({
                                    ...genState,
                                    promptSetId: Date.now().toString(36),
                                  })
                                }
                                className="text-purple-400 hover:text-purple-300"
                              >
                                <Icons.history size={10} />
                              </button>
                            </label>
                            <input
                              type="text"
                              disabled
                              value={genState.promptSetId}
                              className="w-full bg-black/50 border border-white/5 rounded-lg p-1.5 text-xs text-foreground-muted font-mono"
                            />
                          </div>

                          {/* Core Model Selection */}
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-3">
                              Core Model
                            </label>
                            <div className="flex bg-black/40 border border-white/5 rounded-xl overflow-hidden p-1 shadow-inner">
                              {(["standard", "pro"] as const).map((m) => (
                                <button
                                  key={m}
                                  onClick={() =>
                                    setGenState({ ...genState, modelType: m })
                                  }
                                  className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${genState.modelType === m ? "bg-primary/20 text-primary shadow-sm" : "text-white/30 hover:text-white"}`}
                                >
                                  {m === "standard" ? "Flash" : "Pro"}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Safety Threshold */}
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-3">
                              Safety
                            </label>
                            <div className="relative group">
                              <select
                                value={genState.safetyThreshold}
                                onChange={(e) =>
                                  setGenState({
                                    ...genState,
                                    safetyThreshold: e.target.value as any,
                                  })
                                }
                                className="w-full bg-black/40 border border-white/5 rounded-xl p-2 text-[9px] font-black uppercase tracking-widest text-white outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer"
                              >
                                <option value="strict" className="bg-[#050508]">
                                  Strict
                                </option>
                                <option value="medium" className="bg-[#050508]">
                                  Medium
                                </option>
                                <option
                                  value="permissive"
                                  className="bg-[#050508]"
                                >
                                  Permissive
                                </option>
                              </select>
                              <Icons.chevronDown
                                size={10}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none"
                              />
                            </div>
                          </div>
                          {/* Advanced Controls */}
                          <div className="col-span-2 space-y-4 pt-4 border-t border-purple-500/10">
                            <div>
                              <div className="flex justify-between mb-2">
                                <label className="text-[10px] uppercase tracking-widest text-foreground-muted">
                                  Guidance Scale
                                </label>
                                <span className="text-[10px] font-mono text-purple-400">
                                  {genState.guidanceScale || 7.5}
                                </span>
                              </div>
                              <input
                                type="range"
                                min="1"
                                max="30"
                                step="0.5"
                                value={genState.guidanceScale || 7.5}
                                onChange={(e) =>
                                  setGenState({
                                    ...genState,
                                    guidanceScale: parseFloat(e.target.value),
                                  })
                                }
                                className="w-full accent-primary h-1 bg-white/5 rounded-full appearance-none cursor-pointer"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between mb-2">
                                <label className="text-[10px] uppercase tracking-widest text-foreground-muted">
                                  Custom Seed
                                </label>
                                <button
                                  onClick={() =>
                                    setGenState({
                                      ...genState,
                                      seed: Math.floor(Math.random() * 1000000),
                                    })
                                  }
                                  className="text-[9px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                                >
                                  <Icons.refresh size={10} /> Random
                                </button>
                              </div>
                              <input
                                type="number"
                                placeholder="Random Seed (Empty)"
                                value={genState.seed || ""}
                                onChange={(e) =>
                                  setGenState({
                                    ...genState,
                                    seed: parseInt(e.target.value) || undefined,
                                  })
                                }
                                className="w-full bg-background border border-white/10 rounded-lg p-2 text-[10px] font-mono text-foreground outline-none focus:border-purple-500/50"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] uppercase tracking-widest text-foreground-muted block mb-2">
                                Negative Prompt
                              </label>
                              <textarea
                                placeholder="What to exclude... (low quality, blurry, etc)"
                                value={genState.negativePrompt || ""}
                                onChange={(e) =>
                                  setGenState({
                                    ...genState,
                                    negativePrompt: e.target.value,
                                  })
                                }
                                className="w-full bg-background border border-white/10 rounded-lg p-3 text-[10px] text-foreground outline-none focus:border-purple-500/50 h-20 resize-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-8 gap-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-purple-500/50">
                            Modality
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-white capitalize">
                            {genState.mediaType}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-purple-500/50">
                            Ratio
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">
                            {genState.aspectRatio}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-purple-500/50">
                            Quality
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-white capitalize">
                            {genState.quality}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-purple-500/50">
                            Batch
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">
                            {genState.batchSize} Units
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}


                <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-black uppercase tracking-widest text-foreground-muted">
                      {userLevel === "novice"
                        ? "Final Composition"
                        : "Woven DNA Prompt"}
                    </h2>
                    <Tooltip content="Save this setup as your own template">
                      <button
                        onClick={handleSaveTemplate}
                        disabled={!coreSubject.trim()}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-foreground-muted hover:text-primary transition-colors disabled:opacity-30"
                      >
                        <Icons.save size={14} />
                      </button>
                    </Tooltip>
                    <Tooltip content="Copy woven prompt to buffer">
                      <button
                        onClick={() => {
                          if (resolvedWovenPrompt) {
                            navigator.clipboard.writeText(resolvedWovenPrompt);
                            showToast("Woven DNA copied to clipboard", "success");
                          }
                        }}
                        disabled={!resolvedWovenPrompt}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-primary hover:border-primary/40 transition-all flex items-center justify-center disabled:opacity-20 disabled:pointer-events-none"
                      >
                        <Icons.copy size={14} />
                      </button>
                    </Tooltip>
                    {resolvedWovenPrompt && (
                      <span className="text-[10px] font-mono text-foreground-muted/40 ml-1">
                        {resolvedWovenPrompt.length} chars
                      </span>
                    )}
                  </div>
                  <Tooltip
                    content="DNA SYNTHESIS: Combines your 'Active DNA' and 'Engineering Core' into a high-fidelity 'Woven DNA' prompt. (10 per minute)"
                    position="left"
                  >
                    <Button
                      id="magic-enhance"
                      size="sm"
                      variant="outline"
                      className="text-[10px] h-6 px-2 border-primary/20 text-primary hover:bg-primary/10 transition-colors relative"
                      disabled={isCompiling || !hasInputContent}
                      onClick={handleCompilePrompt}
                    >
                      {isCompiling ? (
                        <>
                          <Icons.spinner className="w-3 h-3 animate-spin mr-1" />{" "}
                          {userLevel === "novice"
                            ? "Processing..."
                            : "Weaving..."}
                        </>
                      ) : (
                        <>
                          <Icons.wand className="w-3 h-3 mr-1" />{" "}
                          {userLevel === "novice"
                            ? "Enhance Prompt"
                            : "Weave"}
                        </>
                      )}
                      {remainingCompiles !== null && (
                        <span
                          className={cn(
                            "absolute -top-1 -right-1 z-20 px-1.5 py-0.5 rounded-full text-[8px] font-bold border shadow-sm",
                            remainingCompiles > 0
                              ? "bg-primary text-black border-primary/20"
                              : "bg-red-500 text-white border-red-500/20",
                          )}
                        >
                          {remainingCompiles}
                        </span>
                      )}
                    </Button>
                  </Tooltip>
                </div>

                <div
                  className="border p-4 rounded-xl text-sm leading-relaxed mb-6 relative transition-all bg-purple-500/5 border-purple-500/10 text-purple-200/90 max-h-[400px] overflow-y-auto"
                >
                  {isCompiling && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-xl z-10">
                      <div className="text-primary flex items-center gap-2 font-bold uppercase tracking-widest text-xs animate-pulse">
                        <Icons.wand className="w-4 h-4" /> AI Weaving...
                      </div>
                    </div>
                  )}
                  {resolvedWovenPrompt ? (
                    <div className="space-y-2">
                      <span className="block whitespace-pre-wrap">
                        {resolvedWovenPrompt}
                      </span>
                    </div>
                  ) : (
                    <span className="text-foreground-muted italic opacity-50">
                      {userLevel === "novice"
                        ? "No composition synthesized yet. Hit \"Enhance Prompt\" to finalize."
                        : "No woven prompt yet. Hit \"Weave\" to compile your synthesis."}
                    </span>
                  )}
                </div>

                <div className="w-full mb-8 flex gap-3">
                  <Button
                    id="tour-generate-button"
                    className={`flex-1 h-16 rounded-[20px] font-black uppercase tracking-[0.3em] overflow-hidden relative group transition-all duration-500 shadow-[0_0_40px_rgba(99,102,241,0.1)] hover:shadow-[0_0_60px_rgba(99,102,241,0.25)] border-0 ${isGenerating
                      ? "bg-red-500/10 text-red-500 border border-red-500/20"
                      : "bg-primary text-white hover:scale-[1.01] active:scale-[0.98]"
                      }`}
                    disabled={!isGenerating && !hasInputContent}
                    onClick={
                      isGenerating
                        ? handleCancelGeneration
                        : () => handleGenerate()
                    }
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      {isGenerating ? (
                        <>
                          <Icons.close size={20} /> Cancel Synthesis
                        </>
                      ) : (
                        <>
                          <Icons.sparkles size={20} /> Generate Units (
                          {genState.batchSize})
                        </>
                      )}
                    </span>
                  </Button>

                  {!isGenerating && hasUnsavedChanges && (
                    <Tooltip content="Safe this variation configuration as a draft">
                      <Button
                        variant="outline"
                        onClick={() => handleSaveDraft(true)}
                        disabled={isSavingDraft || !hasInputContent}
                        className="h-16 px-6 bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-[20px]"
                      >
                        {isSavingDraft ? <Icons.loader className="w-5 h-5 animate-spin" /> : <Icons.save className="w-5 h-5" />}
                      </Button>
                    </Tooltip>
                  )}
                </div>



                <div className={cn(
                  "w-full flex-1 min-h-[500px] rounded-[32px] border border-white/5 bg-white/[0.02] flex flex-col relative group backdrop-blur-sm transition-all duration-500",
                  (!isGenerating && generatedImages) ? "p-4" : "items-center justify-center p-12 text-center text-white/20 overflow-hidden"
                )}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.03),transparent_70%)] pointer-events-none" />
                  {!isGenerating && !generatedImages && (
                    <>
                      <div className="w-24 h-24 rounded-[32px] bg-white/5 flex items-center justify-center mb-8 border border-white/5 group-hover:border-primary/20 transition-all duration-700 group-hover:bg-primary/5">
                        <Icons.image className="w-10 h-10 opacity-20 group-hover:opacity-100 group-hover:text-primary transition-all duration-700 group-hover:scale-110" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10 group-hover:text-white/30 transition-colors duration-700">
                        Awaiting Neural Synthesis
                      </p>
                    </>
                  )}
                  {isGenerating && (
                    <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-sm h-full py-12">
                      <div className="relative">
                        <Icons.wand className="w-16 h-16 text-primary animate-[spin_4s_linear_infinite]" />
                        <div className="absolute inset-0 bg-primary/20 blur-2xl animate-pulse rounded-full" />
                      </div>

                      <div className="space-y-2 w-full">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary-light">
                          <span>{generationMessage}</span>
                          <span>{Math.round(generationProgress)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <motion.div
                            className="h-full bg-gradient-to-r from-primary via-purple-500 to-primary-light"
                            initial={{ width: 0 }}
                            animate={{ width: `${generationProgress}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      </div>

                      <p className="text-[10px] text-foreground-muted uppercase tracking-[0.2em] animate-pulse">
                        {genState.mediaType === "video"
                          ? "Deep learning in progress • Do not refresh"
                          : "Weaving pixels..."}
                      </p>
                    </div>
                  )}
                  {!isGenerating && generatedImages && (
                    <div className="w-full flex flex-col gap-4">
                      <div
                        className={cn(
                          "w-full flex-1 grid gap-4",
                          generatedImages.length === 1 && "grid-cols-1",
                          generatedImages.length === 2 && "grid-cols-2",
                          generatedImages.length >= 3 && "grid-cols-2 lg:grid-cols-3",
                          // Avoid fixed rows to allow natural expansion
                        )}
                      >
                        {generatedImages.map((img, i) => (
                          <div
                            key={i}
                            onClick={() => setFocusedImage(img)}
                            className={cn(
                              "relative rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-black/50 animate-in fade-in zoom-in duration-500 cursor-zoom-in group/result",
                              genState.aspectRatio === "1:1" && "aspect-square",
                              genState.aspectRatio === "16:9" && "aspect-video",
                              genState.aspectRatio === "9:16" && "aspect-[9/16]",
                              !["1:1", "16:9", "9:16"].includes(genState.aspectRatio) && "min-h-[300px]"
                            )}
                          >
                            <MediaPreview image={img} />
                            <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover/result:opacity-100 transition-opacity pointer-events-none" />
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const currentSid =
                            generatedImages[0]?.promptSetID ||
                            generatedImages[0]?.settings?.promptSetID ||
                            genState.promptSetId;

                          const historyMatches = historyImages.filter(
                            (img) =>
                              currentSid &&
                              (img.promptSetID === currentSid ||
                                img.settings?.promptSetID === currentSid),
                          );

                          const combined = [...generatedImages];
                          const existingIds = new Set(
                            combined.map((img) => img.id),
                          );

                          for (const img of historyMatches) {
                            if (!existingIds.has(img.id)) {
                              combined.push(img);
                            }
                          }

                          setViewingVariationsGroup(
                            combined.length > 0 ? combined : generatedImages,
                          );
                        }}
                        className="w-full border-white/10 hover:bg-white/5 font-black tracking-widest uppercase text-[10px] h-12 shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300"
                      >
                        <Icons.image size={16} className="mr-2" /> View in
                        Gallery (Image Variations)
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        images={historyImages}
        loading={loadingHistory}
        onRemix={handleRemix}
      />

      {/* --- REVIEW CANVAS OVERLAY --- */}
      <AnimatePresence>
        {focusedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
          >
            <button
              onClick={() => setFocusedImage(null)}
              className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white z-[1010]"
            >
              <Icons.close size={24} />
            </button>

            <div
              className="bg-black/50 border border-white/5 rounded-3xl w-full h-full flex flex-col overflow-hidden relative max-w-7xl mx-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col lg:flex-row min-h-0 flex-1">
                {/* Main Display */}
                <div className="flex-[2] flex flex-col relative bg-black/20">
                  <div className="flex-1 flex items-center justify-center overflow-hidden relative group p-8">
                    {(() => {
                      const imgIsVideo = /\.(mp4|webm|mov)(\?|$)/i.test(
                        focusedImage.imageUrl || "",
                      );
                      const videoSrc =
                        focusedImage.videoUrl ||
                        (imgIsVideo ? focusedImage.imageUrl : null);

                      return (
                        <>
                          {!imgIsVideo && (
                            <img
                              src={focusedImage.imageUrl}
                              alt=""
                              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-500"
                            />
                          )}
                          {videoSrc && (
                            <video
                              src={videoSrc}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="max-w-full max-h-full object-contain bg-black cursor-pointer shadow-2xl rounded-lg"
                              onClick={(e) => {
                                const video = e.currentTarget;
                                if (video.paused) {
                                  video.play().catch(() => { });
                                } else {
                                  video.pause();
                                }
                              }}
                            />
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Action Bar below media */}
                  <div className="flex flex-wrap items-center justify-center gap-3 p-6 border-t border-white/5 bg-black/20">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        handleRemix(focusedImage);
                        setFocusedImage(null);
                      }}
                      className="flex-1 text-[10px] font-black uppercase tracking-widest py-2 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border-white/5 whitespace-nowrap h-auto"
                    >
                      <span className="text-sm">✏️</span> Edit Image
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-[1.5] py-2 text-[10px] uppercase font-black tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap bg-white/5 hover:bg-white/10 text-white border border-white/5 h-auto"
                    >
                      <span className="text-sm">🏆</span> Publish
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        handleDownloadMedia(focusedImage);
                      }}
                      className="flex-[1.5] text-[10px] font-black uppercase tracking-widest py-2 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border-white/5 whitespace-nowrap h-auto"
                    >
                      <Icons.download size={14} /> Download
                    </Button>
                    <Button
                      variant="danger"
                      className="flex-1 text-[10px] font-black uppercase tracking-widest py-2 flex items-center justify-center gap-2 opacity-80 hover:opacity-100 whitespace-nowrap h-auto"
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Info Side */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar border-t lg:border-t-0 lg:border-l border-white/5 bg-transparent min-h-0 min-w-[320px] max-w-sm flex flex-col gap-6 text-white pb-12">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-[10px] uppercase tracking-widest text-primary font-black">
                        Image Details
                      </h2>
                    </div>

                    <div className="mb-6">
                      <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase block">
                        Prompt Set Name
                      </label>
                      <p className="text-sm mt-1 text-white/90 font-bold truncate">
                        {focusedImage.promptSetName || "Untitled Set"}
                      </p>
                    </div>

                    <div className="group/prompt relative bg-white/5 border border-white/10 rounded-2xl p-6">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[8px] uppercase tracking-widest text-foreground-muted">
                          Prompt
                        </label>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(focusedImage.prompt);
                            showToast("Prompt copied to clipboard", "success");
                          }}
                          className="text-[10px] font-black uppercase tracking-widest text-primary opacity-0 group-hover/prompt:opacity-100 transition-opacity hover:text-primary/80"
                        >
                          Copy Prompt
                        </button>
                      </div>
                      <div
                        className={cn(
                          "text-sm leading-relaxed text-white/90 font-medium italic",
                          isPromptExpanded
                            ? "max-h-[300px] overflow-y-auto custom-scrollbar pr-2"
                            : "",
                        )}
                      >
                        &quot;
                        {isPromptExpanded ||
                          focusedImage.prompt.length <= CHARACTER_LIMIT
                          ? focusedImage.prompt
                          : `${focusedImage.prompt.slice(0, CHARACTER_LIMIT)}...`}
                        &quot;
                      </div>
                      {focusedImage.prompt.length > CHARACTER_LIMIT && (
                        <button
                          onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                          className="text-[10px] text-primary hover:text-primary/80 uppercase tracking-widest font-black mt-2 transition-colors"
                        >
                          {isPromptExpanded ? "Show Less" : "Read More"}
                        </button>
                      )}

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          handleRemix(focusedImage);
                          setFocusedImage(null);
                        }}
                        className="w-full mt-4 text-[10px] uppercase font-black tracking-widest h-9"
                      >
                        <Icons.wand size={14} className="mr-2" />
                        New Variation
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 flex-1">
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                      <div>
                        <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase block">
                          Quality
                        </label>
                        <p className="text-sm mt-1 capitalize text-white/90 font-bold">
                          {focusedImage.settings?.quality || "standard"}
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase block">
                          Aspect
                        </label>
                        <p className="text-sm mt-1 text-white/90 font-bold">
                          {focusedImage.settings?.aspectRatio || "1:1"}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase block">
                        ID
                      </label>
                      <div className="flex items-center justify-between">
                        <p className="text-sm mt-1 text-white/90 font-bold font-mono">
                          {focusedImage.id.substring(0, 16)}...
                        </p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(focusedImage.id);
                            showToast("ID copied to clipboard", "success");
                          }}
                          className="text-[8px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors"
                        >
                          Copy Full ID
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase block">
                        Created
                      </label>
                      <p className="text-sm mt-1 text-white/90 font-bold">
                        {formatDate(focusedImage.createdAt)}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <button
                        onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                        className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors py-2"
                      >
                        <span className="flex items-center gap-2">
                          <Icons.settings size={12} className="text-primary/50" />
                          Generation Details
                        </span>
                        <Icons.chevronDown
                          size={14}
                          className={cn("transition-transform duration-200", isDetailsExpanded ? "rotate-180" : "")}
                        />
                      </button>

                      {isDetailsExpanded && (
                        <div className="mt-4 space-y-6 animate-in slide-in-from-top-2 duration-200">
                          <div>
                            <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase block">
                              Prompt Set ID
                            </label>
                            <p className="text-sm mt-1 text-white/90 font-bold font-mono truncate">
                              {focusedImage.promptSetID || focusedImage.settings?.promptSetID || "No Set ID"}
                            </p>
                          </div>

                          {focusedImage.attributionName ? (
                            <div>
                              <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase block">
                                Attribution
                              </label>
                              {focusedImage.attributionUrl ? (
                                <a
                                  href={focusedImage.attributionUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-bold text-primary hover:text-primary-hover hover:underline transition-colors block truncate"
                                >
                                  {focusedImage.attributionName}
                                </a>
                              ) : (
                                <p className="text-sm text-white/90 font-bold">
                                  {focusedImage.attributionName}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-[10px] text-white/30 italic">No attribution set</p>
                          )}

                          {focusedImage.originatorName ? (
                            <div>
                              <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase block">
                                Originator
                              </label>
                              {focusedImage.originatorUrl ? (
                                <a
                                  href={focusedImage.originatorUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-bold text-primary hover:text-primary-hover hover:underline transition-colors block truncate"
                                >
                                  {focusedImage.originatorName}
                                </a>
                              ) : (
                                <p className="text-sm text-white/90 font-bold">
                                  {focusedImage.originatorName}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-[10px] text-white/30 italic">No originator info</p>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <div className="group/seed relative">
                              <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase flex justify-between items-center">
                                Seed
                                {focusedImage.settings?.seed && (
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        String(focusedImage.settings.seed),
                                      );
                                      showToast(
                                        "Seed copied to clipboard",
                                        "success",
                                      );
                                    }}
                                    className="text-[8px] font-black uppercase tracking-widest text-primary opacity-0 group-hover/seed:opacity-100 transition-opacity hover:text-primary/80"
                                  >
                                    Copy
                                  </button>
                                )}
                              </label>
                              <p className="text-sm mt-1 text-white/90 font-bold pr-2 truncate">
                                {focusedImage.settings?.seed || "Auto"}
                              </p>
                            </div>
                            <div>
                              <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase block">
                                Guidance
                              </label>
                              <p className="text-sm mt-1 text-white/90 font-bold">
                                {focusedImage.settings?.guidanceScale || 7.5}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  <div className="mt-auto">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const currentSid =
                          focusedImage.promptSetID ||
                          focusedImage.settings?.promptSetID;
                        const combined = [];

                        if (currentSid) {
                          const genMatches =
                            generatedImages?.filter(
                              (img) =>
                                img.promptSetID === currentSid ||
                                img.settings?.promptSetID === currentSid,
                            ) || [];
                          combined.push(...genMatches);

                          const historyMatches =
                            historyImages?.filter(
                              (img) =>
                                img.promptSetID === currentSid ||
                                img.settings?.promptSetID === currentSid,
                            ) || [];
                          const existingIds = new Set(
                            combined.map((img) => img.id),
                          );

                          for (const img of historyMatches) {
                            if (!existingIds.has(img.id)) {
                              combined.push(img);
                            }
                          }
                        }

                        if (combined.length === 0) combined.push(focusedImage);

                        setViewingVariationsGroup(combined);
                        setFocusedImage(null);
                      }}
                      className="w-full bg-primary/20 hover:bg-primary/30 text-primary border-primary/20 font-black tracking-widest uppercase text-[10px] h-14 rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.2)]"
                    >
                      <Icons.image size={18} className="mr-3" /> View Sequence
                      Variations
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingVariationsGroup && (
          <ImageGroupModal
            selectedGroup={viewingVariationsGroup}
            onClose={() => setViewingVariationsGroup(null)}
            onImageSelect={(img) => {
              setViewingVariationsGroup(null);
              setFocusedImage(img);
            }}
            collections={[]}
            onBatchToggleCollection={() => { }}
            showCreateCollection={false}
            setShowCreateCollection={() => { }}
            newCollectionName=""
            setNewCollectionName={() => { }}
            onCreateCollection={() => { }}
            creatingCollection={false}
            collectionError=""
            setCollectionError={() => { }}
            onUpdatePromptSetName={async (newName) => {
              if (!user || !viewingVariationsGroup) return;
              try {
                const { writeBatch, doc, deleteField } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase');
                const batch = writeBatch(db);
                const cleanName = newName.trim() || undefined;

                viewingVariationsGroup.forEach(img => {
                  const imgRef = doc(db, 'users', user.uid, 'images', img.id);
                  if (cleanName) {
                    batch.update(imgRef, { promptSetName: cleanName });
                  } else {
                    batch.update(imgRef, { promptSetName: deleteField() });
                  }
                });

                await batch.commit();

                // update local state
                const ids = viewingVariationsGroup.map(i => i.id);
                setHistoryImages(prev => prev.map(img => ids.includes(img.id) ? { ...img, promptSetName: cleanName } : img));
                setGeneratedImages(prev => prev ? prev.map(img => ids.includes(img.id) ? { ...img, promptSetName: cleanName } : img) : null);
                setViewingVariationsGroup(prev => prev ? prev.map(img => ids.includes(img.id) ? { ...img, promptSetName: cleanName } : img) : null);
                showToast('Prompt set name updated', 'success');
              } catch (error) {
                console.error("Failed to update prompt set name", error);
                showToast('Failed to update prompt set name', 'error');
              }
            }}
            onDeleteImages={async (ids) => {
              if (!user) return;
              try {
                const { deleteDoc, doc } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase');
                await Promise.all(ids.map(id => deleteDoc(doc(db, 'users', user.uid, 'images', id))));
                setHistoryImages(prev => prev.filter(img => !ids.includes(img.id)));
                setGeneratedImages(prev => prev ? prev.filter(img => !ids.includes(img.id)) : null);
                setViewingVariationsGroup(prev => {
                  if (!prev) return null;
                  const filtered = prev.filter(img => !ids.includes(img.id));
                  return filtered.length > 0 ? filtered : null;
                });
                showToast('Variations deleted successfully', 'success');
              } catch (e) {
                console.error(e);
                showToast('Failed to delete variations', 'error');
              }
            }}
          />
        )}
      </AnimatePresence>

      <GallerySelectionModal
        isOpen={isGalleryModalOpen}
        onClose={() => setIsGalleryModalOpen(false)}
        onSelect={(img) => handleRemix(img)}
        mode={galleryModalMode}
      />

      {/* Style Conflict Modal */}
      <ConfirmationModal
        isOpen={showStyleMergeModal}
        title="Apply Visual Preset?"
        message={`Your DNA Helix already contains active settings. How would you like to apply '${pendingStyle?.name}'?`}
        confirmLabel="Merge (Add to Settings)"
        cancelLabel="Discard Selection"
        onConfirm={() => pendingStyle && applyStyleData(pendingStyle, "add")}
        onCancel={() => {
          setShowStyleMergeModal(false);
          setPendingStyle(null);
        }}
      >
        <div className="mt-6 flex flex-col gap-3">
          <Button
            variant="outline"
            className="w-full border-primary/50 hover:bg-primary/10 text-white"
            onClick={() =>
              pendingStyle && applyStyleData(pendingStyle, "replace")
            }
          >
            Clear Total DNA & Replace
          </Button>
          <p className="text-[9px] text-white/30 uppercase text-center tracking-widest font-black">
            Total DNA Replacement is permanent for this session.
          </p>
        </div>
      </ConfirmationModal>

      <RefillModal
        isOpen={showRefillModal}
        onClose={() => setShowRefillModal(false)}
        requiredAmount={requiredCredits}
      />

      <ConfirmationModal
        isOpen={showSubstitutionConfirm}
        title="Overwrite Workspace?"
        message="You have a target already loaded but haven't generated any units from it yet. Substituting will clear your current Designer configuration. Proceed?"
        confirmLabel="Overwrite"
        cancelLabel="Keep Current"
        onConfirm={() =>
          pendingSubstitution && applySubstitution(pendingSubstitution)
        }
        onCancel={() => {
          setShowSubstitutionConfirm(false);
          setPendingSubstitution(null);
          setLeftTab("current");
        }}
      />

      <AnimatePresence>
        {serviceError && (
          <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-[#0a0a0f] border border-white/10 rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)]"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-red-500/5">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-red-500 leading-none">
                    {serviceError.title}
                  </h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-white/30 mt-2">
                    System Disruption Detected
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                  <Icons.alertCircle size={18} />
                </div>
              </div>

              <div className="p-10 space-y-8 text-center md:text-left">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/20 block">
                    Layman Interpretation
                  </label>
                  <p className="text-sm leading-relaxed text-white/80 font-medium">
                    {serviceError.layman}
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/20 block">
                    Recommended Action
                  </label>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-xs text-primary-light/90 italic leading-relaxed">
                    {serviceError.action}
                  </div>
                </div>

                <div className="pt-4 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px flex-1 bg-white/5" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/20">
                      Technical Report ({serviceError.code})
                    </span>
                    <div className="h-px flex-1 bg-white/5" />
                  </div>
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-[9px] text-white/30 break-all overflow-hidden line-clamp-2 hover:line-clamp-none transition-all cursor-help">
                    {serviceError.message}
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full h-14 rounded-2xl font-black uppercase tracking-widest"
                  onClick={() => setServiceError(null)}
                >
                  Dismiss & Acknowledge
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <DNAModifierModal
        isOpen={isModifiersOpen}
        onClose={() => setIsModifiersOpen(false)}
        activeModifiers={activeModifiers}
        onToggleModifier={handleToggleModifier}
        onClearAll={handleClearDNA}
        userLevel={userLevel}
        rawPromptPreview={rawPromptPreview}
        displayPrompt={displayPrompt}
        handleCopyPrompt={handleCopyPrompt}
        dnaViewMode={dnaViewMode}
        setDnaViewMode={setDnaViewMode}
      />

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <div
            data-testid="review-modal"
            className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-6"
            onClick={() => setShowReviewModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-2xl bg-[#050508] border border-white/10 rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white leading-none">
                    {userLevel === "novice"
                      ? "Final Review"
                      : "Neural Architecture Audit"}
                  </h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-white/30 mt-2">
                    {userLevel === "novice"
                      ? "Confirm your setup before creating."
                      : isWeaveFailed
                        ? "Synthesis engine offline. Review raw constituents."
                        : synthesisRequired
                          ? "Validate DNA Helix and Active DNA before synthesis."
                          : "Neural synthesis verified. Ready for cloud rendering."}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Icons.wand size={18} />
                </div>
              </div>
              <div className="p-10 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      isWeaveFailed ? "text-red-400" : "text-primary/60"
                    )}>
                      {isWeaveFailed ? "Raw DNA Constituents (Synthesis Failed)" : isOutputDiverged ? "Manual DNA Refinement" : synthesisRequired ? "DNA Constituent Preview" : "Woven DNA Output"}
                    </label>
                    <Tooltip
                      content="NEURAL WEAVE: Collapses your Subject and Modifiers into a high-fidelity woven prompt using the NanoBanana AI engine."
                      position="bottom"
                    >
                      <button
                        onClick={handleEnhancePrompt}
                        disabled={
                          isEnhancing ||
                          (!coreSubject.trim() && !compiledPrompt)
                        }
                        className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 transition-all flex items-center gap-2 disabled:opacity-50 relative group/btn"
                      >
                        {isEnhancing ? (
                          <Icons.spinner className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <Icons.sparkles className="w-2.5 h-2.5" />
                        )}
                        Sync Enhancement
                        {remainingEnhances !== null && (
                          <span
                            className={cn(
                              "absolute -top-1 -right-1 z-20 px-1.5 py-0.5 rounded-full text-[8px] font-bold border shadow-sm",
                              remainingEnhances > 0
                                ? "bg-primary text-black border-primary/20"
                                : "bg-red-500 text-white border-red-500/20",
                            )}
                          >
                            {remainingEnhances}
                          </span>
                        )}
                      </button>
                    </Tooltip>
                  </div>
                  <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 text-[13px] italic leading-relaxed text-white/70 font-medium">
                    {displayPrompt || (
                      <span className="text-white/20">
                        Awaiting prompt synthesis...
                      </span>
                    )}
                  </div>
                  {isWeaveFailed && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3">
                      <Icons.alertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-red-100/70 leading-relaxed font-bold uppercase tracking-wider">
                        The neural weaving engine failed to process your request. You can attempt to &quot;Proceed Anyway&quot; using your raw constituents, or &quot;Abort&quot; to refine your DNA.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                    Active DNA Constituents
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {activeModifiers.length > 0 ? (
                      activeModifiers.map((m) => {
                        const varName = m.category.toUpperCase();
                        const varValue = `[${m.category.toLowerCase()}:${m.value.toLowerCase()}]`;
                        return (
                          <span
                            key={m.id}
                            className="px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary/80 flex items-center"
                          >
                            <span className="text-primary">{varValue}</span>
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[10px] text-white/20 italic uppercase tracking-widest">
                        No structural modifiers active
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/20">
                      Model
                    </label>
                    <p className="text-[11px] font-black uppercase tracking-widest text-white">
                      {genState.modelType === "standard" ? "Flash" : "Pro"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/20">
                      Quality
                    </label>
                    <p className="text-[11px] font-black uppercase tracking-widest text-white">
                      {genState.quality}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/20">
                      Ratio
                    </label>
                    <p className="text-[11px] font-black uppercase tracking-widest text-white">
                      {genState.aspectRatio}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Tooltip content="VOLUME: The number of unique variations generated in this batch. Standard tier users generate 1-4 per set.">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/20">
                        Batch
                      </label>
                      <p className="text-[11px] font-black uppercase tracking-widest text-white">
                        {genState.batchSize} Units
                      </p>
                    </Tooltip>
                  </div>
                  <div className="space-y-2">
                    <Tooltip content="MEDIUM: Switch between static architectural frames or 5-second neural video loops. Video requires Pro tier.">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/20">
                        Modality
                      </label>
                      <p className="text-[11px] font-black uppercase tracking-widest text-white capitalize">
                        {genState.mediaType}
                      </p>
                    </Tooltip>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                      Total Cost
                    </label>
                    <p className="text-[11px] font-black uppercase tracking-widest text-primary">
                      {getGenerationCost(
                        genState.mediaType as any,
                        genState.quality as any,
                        genState.modelType as any
                      ) * genState.batchSize} Credits
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-8 border-t border-white/5 flex items-center justify-between bg-white/[0.02]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/20 hover:text-red-400 font-black uppercase tracking-widest text-[10px]"
                  onClick={() => {
                    setShowReviewModal(false);
                    setCoreSubject("");
                    setCompiledPrompt("");
                  }}
                >
                  <Icons.trash size={14} className="mr-2" /> Abort
                </Button>
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 text-white/40 hover:text-white rounded-xl px-6 font-black uppercase tracking-widest text-[10px]"
                    onClick={() => setShowReviewModal(false)}
                  >
                    Return
                  </Button>
                  <Tooltip content="EXECUTE: Commit all DNA constituents to the cloud for final rendering. Consumes energy units.">
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-white rounded-xl px-8 font-black uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                      onClick={() => {
                        setShowReviewModal(false);
                        handleGenerate();
                      }}
                    >
                      <Icons.sparkles size={14} className="mr-2" />{" "}
                      {isWeaveFailed ? "Proceed Anyway" : synthesisRequired ? "Weave Masterpiece" : "Execute Generation"}
                    </Button>
                  </Tooltip>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Improve Prompt Modal */}
      <AnimatePresence>
        {showImprovePromptModal && (
          <div className="fixed inset-0 z-[1100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-xl bg-[#0a0a0f] border border-primary/30 rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(99,102,241,0.2)]"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-primary/5">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary-light leading-none">
                    Evolutionary Feedback
                  </h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-white/30 mt-2">
                    Refine & Augment Woven DNA
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Icons.sparkles size={18} />
                </div>
              </div>

              <div className="p-10 space-y-6">
                <div className="space-y-4">
                  <label className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                    Target Synthesis
                  </label>
                  <textarea
                    value={improvePromptText}
                    onChange={(e) => setImprovePromptText(e.target.value)}
                    placeholder="Enter details to improve..."
                    className="w-full h-48 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white/80 focus:ring-1 focus:ring-primary/40 focus:border-primary/40 outline-none transition-all resize-none font-medium italic leading-relaxed"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest border-white/10 text-white/40 hover:text-white"
                      onClick={() => setShowImprovePromptModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      className="flex-[2] h-12 rounded-2xl font-black uppercase tracking-widest shadow-[0_0_30px_rgba(99,102,241,0.3)]"
                      onClick={() => {
                        setCompiledPrompt(improvePromptText);
                        setPromptEditMode("full");
                        setShowImprovePromptModal(false);
                        showToast("Refinement applied to working prompt. Weave to update output.", "info");
                      }}
                    >
                      COMMIT REFINEMENT
                    </Button>
                  </div>

                  <button
                    disabled={isEnhancing}
                    onClick={async () => {
                      handleEnhancePrompt(improvePromptText);
                    }}
                    className="w-full py-2 text-[9px] font-black uppercase tracking-[0.2em] text-primary hover:text-white transition-colors disabled:opacity-50"
                  >
                    {isEnhancing ? (
                      <Icons.spinner className="w-3 h-3 animate-spin mx-auto" />
                    ) : (
                      "Auto-Optimize DNA via AI"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Variable Required Modal */}
      <AnimatePresence>
        {
          showVariableRequiredModal && (
            <div className="fixed inset-0 z-[1100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-lg bg-[#0a0a0f] border border-primary/30 rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(99,102,241,0.2)]"
              >
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-primary/5">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary-light leading-none">
                      Unassigned DNA Sequence
                    </h3>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-white/30 mt-2">
                      Variable Definitions Required
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Icons.wand size={18} />
                  </div>
                </div>

                <div className="p-10 space-y-6">
                  <p className="text-sm text-white/60 leading-relaxed">
                    Your prompt contains architectural variables that have not been defined. Please provide values for these components to stabilize the synthesis.
                  </p>

                  <div className="space-y-4 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                    {missingVars.map((name) => (
                      <div key={name} className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                            [{name}]
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const val = variables[name]?.currentValue;
                              if (val) {
                                registerVariable({ name, defaultValue: val });
                                showToast(`[${name}] assigned as permanent default`, 'success');
                              }
                            }}
                            className="text-[7px] font-black uppercase tracking-widest text-white/20 hover:text-primary transition-colors"
                          >
                            Assign as default
                          </button>
                        </div>
                        <Input
                          autoFocus={missingVars.indexOf(name) === 0}
                          placeholder={`Definitive value for ${name}...`}
                          value={variables[name]?.currentValue || ""}
                          onChange={(e) => updateVariableValue(name, e.target.value)}
                          className="h-12 bg-white/5 border-white/10 text-sm rounded-xl focus:border-primary/40"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 flex gap-4">
                    <Button
                      variant="outline"
                      className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest border-white/10 text-white/40 hover:text-white"
                      onClick={() => setShowVariableRequiredModal(false)}
                    >
                      Abort
                    </Button>
                    <Button
                      variant="primary"
                      className="flex-[2] h-14 rounded-2xl font-black uppercase tracking-widest shadow-[0_0_30px_rgba(99,102,241,0.3)]"
                      disabled={missingVars.some(name => !variables[name]?.currentValue?.trim())}
                      onClick={() => {
                        const action = pendingAction;
                        setPendingAction(null);
                        setShowVariableRequiredModal(false);
                        if (action === "compile") handleCompilePrompt();
                        else handleGenerate();
                      }}
                    >
                      {pendingAction === "compile" ? "Synchronize Weave" : "Initialize Weave"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )
        }
      </AnimatePresence >

      {/* Attribution Required Modal */}
      <AnimatePresence>
        {
          showAttributionRequiredModal && (
            <div className="fixed inset-0 z-[1100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-lg bg-[#0a0a0f] border border-primary/30 rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(99,102,241,0.2)]"
              >
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-primary/5">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary-light leading-none">
                      Creator Attribution
                    </h3>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-white/30 mt-2">
                      Required for Generation
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Icons.user size={18} />
                  </div>
                </div>

                <div className="p-10 space-y-6">
                  <p className="text-sm text-white/60 leading-relaxed">
                    Prior to weaving, you must declare credit intent. Please define a name for this prompt set, along with your creator attribution name and reference link for this prompt architecture.
                  </p>

                  <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                          Prompt Set Name
                        </label>
                      </div>
                      <Input
                        id="attr-prompt-set-name"
                        placeholder="e.g. Neon Cyberpunk Concept..."
                        value={genState.promptSetName || ""}
                        onChange={(e) => setGenState({ ...genState, promptSetName: e.target.value })}
                        className="h-12 bg-white/5 border-white/10 text-sm rounded-xl focus:border-primary/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                          Attribution Name
                        </label>
                      </div>
                      <Input
                        id="attr-attribution-name"
                        placeholder="Creator Name..."
                        value={genState.attributionName || ""}
                        onChange={(e) => setGenState({ ...genState, attributionName: e.target.value })}
                        className="h-12 bg-white/5 border-white/10 text-sm rounded-xl focus:border-primary/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                          Attribution Link
                        </label>
                        <span className="text-[7px] font-bold tracking-wider text-white/20 uppercase">
                          defaults to portfolio website
                        </span>
                      </div>
                      <Input
                        id="attr-attribution-url"
                        type="url"
                        placeholder="https://..."
                        value={genState.attributionUrl || ""}
                        onChange={(e) => setGenState({ ...genState, attributionUrl: e.target.value })}
                        className="h-12 bg-white/5 border-white/10 text-sm rounded-xl focus:border-primary/40"
                      />
                      <div className="flex items-center gap-2 mt-1 px-1">
                        <input
                          type="checkbox"
                          id="save-attr-default"
                          checked={saveAttributionAsDefault}
                          onChange={(e) => setSaveAttributionAsDefault(e.target.checked)}
                          className="w-3 h-3 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/20"
                        />
                        <label htmlFor="save-attr-default" className="text-[9px] font-black uppercase tracking-widest text-white/40 cursor-pointer hover:text-white/60 transition-colors">
                          Assign as defaults
                        </label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                          Originator Name
                        </label>
                        {(profile?.displayName || profile?.username) && (
                          <button
                            type="button"
                            onClick={() => setGenState({ ...genState, originatorName: profile?.displayName || profile?.username || "" })}
                            className="text-[7px] font-bold tracking-wider text-white/20 uppercase hover:text-primary transition-colors"
                          >
                            Use Profile Name
                          </button>
                        )}
                      </div>
                      <Input
                        id="attr-originator-name"
                        placeholder="Genesis Creator..."
                        value={genState.originatorName || ""}
                        onChange={(e) => setGenState({ ...genState, originatorName: e.target.value })}
                        className="h-12 bg-white/5 border-white/10 text-sm rounded-xl focus:border-primary/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                          Originator Link
                        </label>
                        {profile?.socialLinks?.website && (
                          <button
                            type="button"
                            onClick={() => setGenState({ ...genState, originatorUrl: profile.socialLinks?.website || "" })}
                            className="text-[7px] font-bold tracking-wider text-white/20 uppercase hover:text-primary transition-colors"
                          >
                            Use Profile Link
                          </button>
                        )}
                      </div>
                      <Input
                        id="attr-originator-url"
                        type="url"
                        placeholder="https://..."
                        value={genState.originatorUrl || ""}
                        onChange={(e) => setGenState({ ...genState, originatorUrl: e.target.value })}
                        className="h-12 bg-white/5 border-white/10 text-sm rounded-xl focus:border-primary/40"
                      />
                      <div className="flex items-center gap-2 mt-1 px-1">
                        <input
                          type="checkbox"
                          id="save-orig-default"
                          checked={saveOriginatorAsDefault}
                          onChange={(e) => setSaveOriginatorAsDefault(e.target.checked)}
                          className="w-3 h-3 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/20"
                        />
                        <label htmlFor="save-orig-default" className="text-[9px] font-black uppercase tracking-widest text-white/40 cursor-pointer hover:text-white/60 transition-colors">
                          Assign as defaults
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <Button
                      variant="outline"
                      className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest border-white/10 text-white/40 hover:text-white"
                      onClick={() => setShowAttributionRequiredModal(false)}
                    >
                      Abort
                    </Button>
                    <Button
                      variant="primary"
                      className="flex-[2] h-14 rounded-2xl font-black uppercase tracking-widest shadow-[0_0_30px_rgba(99,102,241,0.3)]"
                      disabled={!genState.promptSetName?.trim() || !genState.attributionName?.trim()}
                      onClick={() => {
                        if (saveAttributionAsDefault) {
                          setAttributionNameDefault(genState.attributionName || "");
                          setAttributionUrlDefault(genState.attributionUrl || "");
                        }
                        if (saveOriginatorAsDefault) {
                          setOriginatorNameDefault(genState.originatorName || "");
                          setOriginatorUrlDefault(genState.originatorUrl || "");
                        }
                        setShowAttributionRequiredModal(false);
                        handleGenerate();
                      }}
                    >
                      Confirm & Weave
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )
        }
      </AnimatePresence>

      <ConfirmationModal
        isOpen={showBackConfirmModal}
        title="Unsaved Variation Sequence"
        message="You have active structural changes in your DNA Matrix that haven't been synthesized. Would you like to save this configuration as a draft before leaving?"
        confirmLabel="Save Draft & Leave"
        cancelLabel="Discard & Leave"
        onConfirm={async () => {
          await handleSaveDraft();
          setShowBackConfirmModal(false);
          executeBack();
        }}
        onCancel={() => {
          setShowBackConfirmModal(false);
          executeBack();
        }}
      />

      <ConfirmationModal
        isOpen={showSaveChoiceModal}
        title="Configuration Synthesized"
        message="Success. Your current workspace DNA has been archived. Would you like to return to the gallery or continue refining your prompt?"
        confirmLabel="Back to Gallery"
        cancelLabel="Continue Refining"
        onConfirm={() => {
          setShowSaveChoiceModal(false);
          executeBack();
        }}
        onCancel={() => {
          setShowSaveChoiceModal(false);
        }}
      />
    </div >
  );
}

export default function GeneratePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground-muted">
          Loading Generator...
        </div>
      }
    >
      <VariableProvider>
        <GeneratePageContent />
      </VariableProvider>
    </Suspense>
  );
}
