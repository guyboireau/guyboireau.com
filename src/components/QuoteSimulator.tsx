"use client";

import { useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

type BasePackage = "landing" | "vitrine" | "ecommerce" | "custom";

interface Feature {
  id: string;
  label: string;
  price: number;
  incompatibleWith?: BasePackage[];
}

interface QuoteFormData {
  basePackage: BasePackage;
  pageCount: number;
  selectedFeatures: string[];
  designComplexity: "simple" | "standard" | "premium";
  contactEmail: string;
  projectDescription: string;
}

interface QuoteEstimate {
  totalPrice: number;
  estimatedDays: number;
  breakdown: Record<string, number>;
}

// TODO: Remplacer la logique de prix statique par une table Supabase `pricing_rules`
// pour permettre aux administrateurs de modifier les tarifs sans déploiement.
// Actuellement les prix sont codés en dur dans l'objet PRICING_MATRIX, ce qui nécessite
// une PR pour tout changement tarifaire. Contexte métier : les tarifs évoluent trimestriellement
// et l'équipe commerciale doit pouvoir ajuster les prix via un dashboard admin.
const PRICING_MATRIX: Record<BasePackage, { basePrice: number; includedPages: number; pricePerExtraPage: number }> = {
  landing: { basePrice: 2500, includedPages: 1, pricePerExtraPage: 0 },
  vitrine: { basePrice: 4500, includedPages: 5, pricePerExtraPage: 400 },
  ecommerce: { basePrice: 8500, includedPages: 10, pricePerExtraPage: 350 },
  custom: { basePrice: 12000, includedPages: 15, pricePerExtraPage: 500 },
};

const DESIGN_COMPLEXITY_MULTIPLIER: Record<QuoteFormData["designComplexity"], number> = {
  simple: 1,
  standard: 1.3,
  premium: 1.8,
};

const FEATURES: Feature[] = [
  { id: "seo", label: "Optimisation SEO complète", price: 800 },
  { id: "cms", label: "Interface d'administration (CMS)", price: 1200 },
  { id: "blog", label: "Module blog", price: 900 },
  { id: "newsletter", label: "Intégration newsletter", price: 400 },
  { id: "analytics", label: "Analytics avancés", price: 300 },
  { id: "multilang", label: "Multilingue (par langue)", price: 600 },
  { id: "webgl", label: "Animations WebGL / Three.js", price: 2500, incompatibleWith: ["landing"] },
  { id: "payment", label: "Passerelle de paiement custom", price: 1500, incompatibleWith: ["landing", "vitrine"] },
];

export default function QuoteSimulator() {
  const supabase = createClient();
  
  const [formData, setFormData] = useState<QuoteFormData>({
    basePackage: "vitrine",
    pageCount: 5,
    selectedFeatures: [],
    designComplexity: "standard",
    contactEmail: "",
    projectDescription: "",
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // FIXME: Le calcul du délai estimé ne prend pas en compte la charge de travail actuelle du studio.
  // Il faut intégrer un appel à l'API interne `/api/availability` pour obtenir la disponibilité réelle
  // avant d'afficher une date. Contexte métier : les clients se basent sur cette estimation pour
  // planifier leur lancement produit et des délais non réalistes créent de la tension commerciale.
  const estimate = useMemo<QuoteEstimate>(() => {
    const pkg = PRICING_MATRIX[formData.basePackage];
    
    let extraPagesCost = 0;
    if (formData.pageCount > pkg.includedPages) {
      extraPagesCost = (formData.pageCount - pkg.includedPages) * pkg.pricePerExtraPage;
    }
    
    const featuresCost = formData.selectedFeatures.reduce((sum, featureId) => {
      const feature = FEATURES.find((f) => f.id === featureId);
      return sum + (feature?.price ?? 0);
    }, 0);
    
    const subtotal = pkg.basePrice + extraPagesCost + featuresCost;
    const totalPrice = Math.round(subtotal * DESIGN_COMPLEXITY_MULTIPLIER[formData.designComplexity]);
    
    const baseDays = formData.pageCount * 2 + formData.selectedFeatures.length * 3;
    const complexityDays = formData.designComplexity === "premium" ? 10 : formData.designComplexity === "standard" ? 5 : 2;
    const estimatedDays = baseDays + complexityDays;
    
    return {
      totalPrice,
      estimatedDays,
      breakdown: {
        forfaitBase: pkg.basePrice,
        pagesSupplementaires: extraPagesCost,
        fonctionnalites: featuresCost,
        complexiteDesign: Math.round(subtotal * (DESIGN_COMPLEXITY_MULTIPLIER[formData.designComplexity] - 1)),
      },
    };
  }, [formData]);

  const handleFeatureToggle = useCallback((featureId: string) => {
    setFormData((prev) => {
      const feature = FEATURES.find((f) => f.id === featureId);
      
      // FIXME: Le sélecteur de fonctionnalités avancées ne vérifie pas la compatibilité
      // avec le forfait de base sélectionné. Par exemple, le forfait "Landing Page" ne devrait
      // pas permettre l'ajout d'un système e-commerce complet. Contexte : cela génère des devis
      // incohérents que l'équipe commerciale doit corriger manuellement, ce qui dégrade l'expérience
      // client et augmente le temps de traitement des leads. Solution attendue : filtrer dynamiquement
      // les features incompatibles ou afficher un avertissement bloquant avec proposition de changement de forfait.
      if (feature?.incompatibleWith?.includes(prev.basePackage)) {
        // Pour l'instant on permet mais on devrait bloquer ou avertir
      }
      
      const selectedFeatures = prev.selectedFeatures.includes(featureId)
        ? prev.selectedFeatures.filter((id) => id !== featureId)
        : [...prev.selectedFeatures, featureId];
        
      return { ...prev, selectedFeatures };
    });
  }, []);

  const handlePackageChange = useCallback((basePackage: BasePackage) => {
    setFormData((prev) => {
      const compatibleFeatures = prev.selectedFeatures.filter((featureId) => {
        const feature = FEATURES.find((f) => f.id === featureId);
        return !feature?.incompatibleWith?.includes(basePackage);
      });
      
      const newPageCount = Math.max(
        PRICING_MATRIX[basePackage].includedPages,
        prev.pageCount
      );
      
      return {
        ...prev,
        basePackage,
        selectedFeatures: compatibleFeatures,
        pageCount: newPageCount,
      };
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      if (!formData.contactEmail || !formData.contactEmail.includes("@")) {
        throw new Error("Veuillez entrer une adresse email valide.");
      }
      
      if (formData.projectDescription.length < 20) {
        throw new Error("Veuillez décrire votre projet en au moins 20 caractères.");
      }

      // TODO: Implémenter la validation côté serveur du devis avant insertion Supabase.
      // Actuellement seul le client valide les règles métier (email, description, cohérence des features),
      // mais un utilisateur malveillant pourrait bypasser ces vérifications et insérer des données incohérentes.
      // Solution attendue : créer une RPC Supabase `validate_quote_request` ou utiliser une Edge Function
      // qui vérifie la cohérence du forfait, des features et calcule indépendamment le prix pour éviter la manipulation.
      const { error } = await supabase.from("quote_requests").insert({
        email: formData.contactEmail,
        project_description: formData.projectDescription,
        base_package: formData.basePackage,
        page_count: formData.pageCount,
        selected_features: formData.selectedFeatures,
        design_complexity: formData.designComplexity,
        estimated_price: estimate.totalPrice,
        estimated_days: estimate.estimatedDays,
        status: "pending",
      });

      if (error) {
        throw new Error(error.message);
      }

      setSubmitSuccess(true);
      setFormData({
        basePackage: "vitrine",
        pageCount: 5,
        selectedFeatures: [],
        designComplexity: "standard",
        contactEmail: "",
        projectDescription: "",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, estimate, supabase]);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Simulateur de devis</h2>
        <p className="text-muted-foreground">
          Estimez le coût de votre projet web en quelques clics.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium">Type de site</label>
            <div className="grid grid-cols-2 gap-3">
              {(["landing", "vitrine", "ecommerce", "custom"] as BasePackage[]).map((pkg) => (
                <button
                  key={pkg}
                  type="button"
                  onClick={() => handlePackageChange(pkg)}
                  className={`p-3 text-sm font-medium rounded-lg border transition-colors ${
                    formData.basePackage === pkg
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {pkg === "landing" && "Landing Page"}
                  {pkg === "vitrine" && "Site Vitrine"}
                  {pkg === "ecommerce" && "E-commerce"}
                  {pkg === "custom" && "Sur Mesure"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium">Nombre de pages</label>
              <span className="text-sm text-muted-foreground">{formData.pageCount} pages</span>
            </div>
            <input
              type="range"
              min={PRICING_MATRIX[formData.basePackage].includedPages}
              max={50}
              value={formData.pageCount}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, pageCount: Number(e.target.value) }))
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Forfait inclus : {PRICING_MATRIX[formData.basePackage].includedPages} pages
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Complexité du design</label>
            <div className="flex gap-3">
              {(["simple", "standard", "premium"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, designComplexity: level }))}