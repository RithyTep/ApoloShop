"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Sparkles, ArrowRight, ArrowLeft, Check, Ruler, User, Scale } from "lucide-react"
import { translations } from "@/lib/i18n"

interface FitFinderProps {
  productId?: string
  sizeChartId?: string
  language: "EN" | "KH"
  onComplete?: (recommendedSize: string) => void
  customerId?: string
  guestId?: string
}

interface QuizAnswers {
  height?: number
  weight?: number
  bodyType?: "slim" | "athletic" | "average" | "curvy" | "plus"
  fitPreference?: "SLIM" | "REGULAR" | "RELAXED" | "OVERSIZED"
  gender?: "MALE" | "FEMALE" | "UNISEX"
  age?: number
  chest?: number
  waist?: number
  hips?: number
}

type Step = "intro" | "basics" | "bodyType" | "measurements" | "preference" | "result"

// Translations for the quiz
const quizText = {
  en: {
    title: "Find Your Perfect Fit",
    subtitle: "Answer a few questions to get your size recommendation",
    start: "Start Quiz",
    next: "Next",
    back: "Back",
    skip: "Skip",
    submit: "Get My Size",
    height: "Height (cm)",
    weight: "Weight (kg)",
    age: "Age",
    gender: "Gender",
    male: "Male",
    female: "Female",
    other: "Other/Prefer not to say",
    bodyType: "Body Type",
    slim: "Slim",
    slimDesc: "Narrow shoulders and hips",
    athletic: "Athletic",
    athleticDesc: "Broad shoulders, defined muscles",
    average: "Average",
    averageDesc: "Balanced proportions",
    curvy: "Curvy",
    curvyDesc: "Defined waist, fuller hips",
    plus: "Plus Size",
    plusDesc: "Fuller figure overall",
    fitPreference: "How do you like your clothes to fit?",
    slimFit: "Slim Fit",
    slimFitDesc: "Close to body, fitted look",
    regularFit: "Regular Fit",
    regularFitDesc: "Standard, comfortable fit",
    relaxedFit: "Relaxed Fit",
    relaxedFitDesc: "Loose, casual fit",
    oversized: "Oversized",
    oversizedDesc: "Very loose, trendy fit",
    measurements: "Your Measurements (optional)",
    measurementsSubtitle: "For more accurate results, enter your measurements",
    chest: "Chest (cm)",
    waist: "Waist (cm)",
    hips: "Hips (cm)",
    yourSize: "Your Recommended Size",
    basedOn: "Based on your answers",
    selectSize: "Select This Size",
    tryAgain: "Try Again",
    saveProfile: "Save to My Profile",
    step: "Step",
    of: "of",
  },
  kh: {
    title: "ស្វែងរកទំហំល្អឥតខ្ជោះ",
    subtitle: "ឆ្លើយសំណួរមួយចំនួនដើម្បីទទួលបានអនុសាសន៍ទំហំរបស់អ្នក",
    start: "ចាប់ផ្តើមសំណួរ",
    next: "បន្ទាប់",
    back: "ថយក្រោយ",
    skip: "រំលង",
    submit: "ទទួលបានទំហំរបស់ខ្ញុំ",
    height: "កម្ពស់ (cm)",
    weight: "ទម្ងន់ (kg)",
    age: "អាយុ",
    gender: "ភេទ",
    male: "ប្រុស",
    female: "ស្រី",
    other: "ផ្សេងៗ/មិនចង់បញ្ជាក់",
    bodyType: "ប្រភេទរាងកាយ",
    slim: "ស្គមស្គាំង",
    slimDesc: "ស្មាតូច និងត្រគាក",
    athletic: "កីឡា",
    athleticDesc: "ស្មាធំ សាច់ដុំច្បាស់",
    average: "មធ្យម",
    averageDesc: "សមាមាត្រស្មើ",
    curvy: "រាងកោង",
    curvyDesc: "ចង្កេះច្បាស់ ត្រគាកធំ",
    plus: "ទំហំធំ",
    plusDesc: "រាងកាយពេញលេញ",
    fitPreference: "តើអ្នកចូលចិត្តសម្លៀកបំពាក់សមទំហំយ៉ាងម៉េច?",
    slimFit: "សម្បុរតឹង",
    slimFitDesc: "ជិតរាងកាយ រូបរាងសម",
    regularFit: "សម្បុរធម្មតា",
    regularFitDesc: "ស្តង់ដារ ផាសុកភាព",
    relaxedFit: "សម្បុរធូរធារ",
    relaxedFitDesc: "ធូរ រាក់ទាក់",
    oversized: "ធំជាង",
    oversizedDesc: "ធូរខ្លាំង ទាន់សម័យ",
    measurements: "រង្វាស់របស់អ្នក (ជម្រើស)",
    measurementsSubtitle: "សម្រាប់លទ្ធផលត្រឹមត្រូវជាង សូមបញ្ចូលរង្វាស់របស់អ្នក",
    chest: "ទ្រូង (cm)",
    waist: "ចង្កេះ (cm)",
    hips: "សាច់ដុំ (cm)",
    yourSize: "ទំហំដែលណែនាំ",
    basedOn: "ផ្អែកលើចម្លើយរបស់អ្នក",
    selectSize: "ជ្រើសរើសទំហំនេះ",
    tryAgain: "សាកល្បងម្តងទៀត",
    saveProfile: "រក្សាទុកក្នុងប្រវត្តិរូប",
    step: "ជំហាន",
    of: "នៃ",
  },
}

export function FitFinder({
  productId,
  sizeChartId,
  language,
  onComplete,
  customerId,
  guestId,
}: FitFinderProps) {
  const [step, setStep] = useState<Step>("intro")
  const [answers, setAnswers] = useState<QuizAnswers>({})
  const [recommendedSize, setRecommendedSize] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const t = quizText[language === "EN" ? "en" : "kh"]

  const steps: Step[] = ["intro", "basics", "bodyType", "measurements", "preference", "result"]
  const currentStepIndex = steps.indexOf(step)
  const progress = ((currentStepIndex) / (steps.length - 1)) * 100

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex])
    }
  }

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setStep(steps[prevIndex])
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/fit-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          guestId: guestId || `guest_${Date.now()}`,
          productId,
          sizeChartId,
          answers,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get size recommendation")
      }

      const data = await response.json()
      setRecommendedSize(data.recommendedSize)
      setStep("result")
    } catch {
      setError(language === "EN" ? "Something went wrong. Please try again." : "មានបញ្ហា។ សូមព្យាយាមម្តងទៀត។")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleComplete = () => {
    if (recommendedSize && onComplete) {
      onComplete(recommendedSize)
    }
  }

  const handleReset = () => {
    setStep("intro")
    setAnswers({})
    setRecommendedSize(null)
    setError(null)
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      {step !== "intro" && step !== "result" && (
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>{t.step} {currentStepIndex} {t.of} {steps.length - 2}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {step === "intro" && (
        <>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t.title}</CardTitle>
            <CardDescription>{t.subtitle}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => setStep("basics")}>
              {t.start}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </>
      )}

      {step === "basics" && (
        <>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t.gender}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={answers.gender}
              onValueChange={(value) => setAnswers({ ...answers, gender: value as QuizAnswers["gender"] })}
            >
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted cursor-pointer">
                <RadioGroupItem value="MALE" id="male" />
                <Label htmlFor="male" className="flex-1 cursor-pointer">{t.male}</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted cursor-pointer">
                <RadioGroupItem value="FEMALE" id="female" />
                <Label htmlFor="female" className="flex-1 cursor-pointer">{t.female}</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted cursor-pointer">
                <RadioGroupItem value="UNISEX" id="unisex" />
                <Label htmlFor="unisex" className="flex-1 cursor-pointer">{t.other}</Label>
              </div>
            </RadioGroup>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="height">{t.height}</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="170"
                  value={answers.height || ""}
                  onChange={(e) => setAnswers({ ...answers, height: Number(e.target.value) || undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">{t.weight}</Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="65"
                  value={answers.weight || ""}
                  onChange={(e) => setAnswers({ ...answers, weight: Number(e.target.value) || undefined })}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.back}
            </Button>
            <Button onClick={handleNext}>
              {t.next}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </>
      )}

      {step === "bodyType" && (
        <>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              {t.bodyType}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={answers.bodyType}
              onValueChange={(value) => setAnswers({ ...answers, bodyType: value as QuizAnswers["bodyType"] })}
              className="space-y-2"
            >
              {[
                { value: "slim", label: t.slim, desc: t.slimDesc },
                { value: "athletic", label: t.athletic, desc: t.athleticDesc },
                { value: "average", label: t.average, desc: t.averageDesc },
                { value: "curvy", label: t.curvy, desc: t.curvyDesc },
                { value: "plus", label: t.plus, desc: t.plusDesc },
              ].map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted cursor-pointer"
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-muted-foreground">{option.desc}</div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.back}
            </Button>
            <Button onClick={handleNext}>
              {t.next}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </>
      )}

      {step === "measurements" && (
        <>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5" />
              {t.measurements}
            </CardTitle>
            <CardDescription>{t.measurementsSubtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chest">{t.chest}</Label>
              <Input
                id="chest"
                type="number"
                placeholder="90"
                value={answers.chest || ""}
                onChange={(e) => setAnswers({ ...answers, chest: Number(e.target.value) || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waist">{t.waist}</Label>
              <Input
                id="waist"
                type="number"
                placeholder="70"
                value={answers.waist || ""}
                onChange={(e) => setAnswers({ ...answers, waist: Number(e.target.value) || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hips">{t.hips}</Label>
              <Input
                id="hips"
                type="number"
                placeholder="95"
                value={answers.hips || ""}
                onChange={(e) => setAnswers({ ...answers, hips: Number(e.target.value) || undefined })}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.back}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleNext}>
                {t.skip}
              </Button>
              <Button onClick={handleNext}>
                {t.next}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardFooter>
        </>
      )}

      {step === "preference" && (
        <>
          <CardHeader>
            <CardTitle>{t.fitPreference}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={answers.fitPreference}
              onValueChange={(value) => setAnswers({ ...answers, fitPreference: value as QuizAnswers["fitPreference"] })}
              className="space-y-2"
            >
              {[
                { value: "SLIM", label: t.slimFit, desc: t.slimFitDesc },
                { value: "REGULAR", label: t.regularFit, desc: t.regularFitDesc },
                { value: "RELAXED", label: t.relaxedFit, desc: t.relaxedFitDesc },
                { value: "OVERSIZED", label: t.oversized, desc: t.oversizedDesc },
              ].map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted cursor-pointer"
                >
                  <RadioGroupItem value={option.value} id={`fit-${option.value}`} />
                  <Label htmlFor={`fit-${option.value}`} className="flex-1 cursor-pointer">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-muted-foreground">{option.desc}</div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.back}
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⏳</span>
                  {language === "EN" ? "Processing..." : "កំពុងដំណើរការ..."}
                </span>
              ) : (
                <>
                  {t.submit}
                  <Sparkles className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </CardFooter>
        </>
      )}

      {step === "result" && recommendedSize && (
        <>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit">
              <Check className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t.yourSize}</CardTitle>
            <CardDescription>{t.basedOn}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Badge className="text-4xl px-8 py-4 font-bold">
              {recommendedSize}
            </Badge>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button className="w-full" onClick={handleComplete}>
              {t.selectSize}
            </Button>
            <Button variant="outline" className="w-full" onClick={handleReset}>
              {t.tryAgain}
            </Button>
          </CardFooter>
        </>
      )}

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive text-center text-sm">
          {error}
        </div>
      )}
    </Card>
  )
}

// Fit Finder Dialog (modal version)
export function FitFinderDialog({
  productId,
  sizeChartId,
  language,
  onComplete,
  customerId,
  guestId,
  trigger,
}: FitFinderProps & {
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  const handleComplete = (size: string) => {
    onComplete?.(size)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Sparkles className="h-4 w-4" />
            {language === "EN" ? "Find My Size" : "ស្វែងរកទំហំខ្ញុំ"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg p-0">
        <FitFinder
          productId={productId}
          sizeChartId={sizeChartId}
          language={language}
          onComplete={handleComplete}
          customerId={customerId}
          guestId={guestId}
        />
      </DialogContent>
    </Dialog>
  )
}
