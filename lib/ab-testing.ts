/**
 * A/B Testing Statistical Utilities
 *
 * Implements statistical significance testing for conversion rate experiments
 * using z-test for proportions (two-sample test).
 */

export interface VariantMetrics {
  visitors: number
  conversions: number
}

export interface SignificanceResult {
  zScore: number
  pValue: number
  confidence: number // as percentage (e.g., 95.2)
  isSignificant: boolean
  treatmentBetter: boolean
  controlRate: number
  treatmentRate: number
  relativeImprovement: number // percentage improvement/decline
  standardError: number
  marginOfError: number
}

/**
 * Calculate statistical significance using z-test for proportions
 *
 * This uses a two-proportion z-test to determine if the difference
 * between control and treatment conversion rates is statistically significant.
 *
 * @param control - Control variant metrics
 * @param treatment - Treatment variant metrics
 * @param confidenceLevel - Desired confidence level (90, 95, or 99)
 * @returns Significance test results
 */
export function calculateSignificance(
  control: VariantMetrics,
  treatment: VariantMetrics,
  confidenceLevel: number = 95
): SignificanceResult {
  const { visitors: n1, conversions: x1 } = control
  const { visitors: n2, conversions: x2 } = treatment

  // Calculate conversion rates
  const p1 = n1 > 0 ? x1 / n1 : 0 // Control rate
  const p2 = n2 > 0 ? x2 / n2 : 0 // Treatment rate

  // Pooled proportion
  const pPooled = (n1 + n2) > 0 ? (x1 + x2) / (n1 + n2) : 0

  // Standard error of the difference
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / Math.max(n1, 1) + 1 / Math.max(n2, 1)))

  // Z-score
  const zScore = se > 0 ? (p2 - p1) / se : 0

  // P-value (two-tailed test)
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)))

  // Confidence level achieved
  const confidence = (1 - pValue) * 100

  // Critical z-values for different confidence levels
  const criticalValues: Record<number, number> = {
    90: 1.645,
    95: 1.96,
    99: 2.576,
  }
  const criticalZ = criticalValues[confidenceLevel] || 1.96

  // Is the result statistically significant?
  const isSignificant = Math.abs(zScore) > criticalZ

  // Is treatment better than control?
  const treatmentBetter = p2 > p1

  // Relative improvement (percentage)
  const relativeImprovement = p1 > 0 ? ((p2 - p1) / p1) * 100 : 0

  // Margin of error for the difference
  const marginOfError = criticalZ * se

  return {
    zScore,
    pValue,
    confidence,
    isSignificant,
    treatmentBetter,
    controlRate: p1,
    treatmentRate: p2,
    relativeImprovement,
    standardError: se,
    marginOfError,
  }
}

/**
 * Cumulative distribution function for standard normal distribution
 * Uses the approximation from Abramowitz and Stegun (1964)
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  // Save the sign of x
  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.sqrt(2)

  // Approximation
  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

  return 0.5 * (1.0 + sign * y)
}

/**
 * Determine if an experiment should auto-end based on significance
 *
 * @param result - Significance test result
 * @param targetConfidence - Target confidence level (90, 95, or 99)
 * @returns true if experiment should end
 */
export function shouldAutoEnd(result: SignificanceResult, targetConfidence: number): boolean {
  // End if we have reached statistical significance at the target confidence level
  return result.isSignificant && result.confidence >= targetConfidence
}

/**
 * Calculate the minimum sample size needed per variant
 * for detecting a given effect size with specified power and significance
 *
 * @param baselineRate - Expected control conversion rate (0-1)
 * @param minimumDetectableEffect - Minimum relative effect to detect (e.g., 0.1 for 10%)
 * @param power - Statistical power (default 0.8)
 * @param alpha - Significance level (default 0.05)
 * @returns Required sample size per variant
 */
export function calculateRequiredSampleSize(
  baselineRate: number,
  minimumDetectableEffect: number,
  power: number = 0.8,
  alpha: number = 0.05
): number {
  const p1 = baselineRate
  const p2 = baselineRate * (1 + minimumDetectableEffect)

  // Z-values for given alpha and power
  const zAlpha = getZValue(1 - alpha / 2) // two-tailed
  const zBeta = getZValue(power)

  // Pooled standard deviation
  const pooledP = (p1 + p2) / 2
  const pooledVariance = pooledP * (1 - pooledP)

  // Variance for each group
  const v1 = p1 * (1 - p1)
  const v2 = p2 * (1 - p2)

  // Sample size formula
  const numerator = Math.pow(zAlpha * Math.sqrt(2 * pooledVariance) + zBeta * Math.sqrt(v1 + v2), 2)
  const denominator = Math.pow(p2 - p1, 2)

  return Math.ceil(numerator / denominator)
}

/**
 * Get z-value for a given probability
 */
function getZValue(p: number): number {
  // Approximation using inverse normal CDF
  // Using rational approximation from Peter J. Acklam
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0,
  ]
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ]
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
    -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0,
  ]
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
    3.754408661907416e0,
  ]

  const pLow = 0.02425
  const pHigh = 1 - pLow

  let q: number
  let r: number
  let x: number

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p))
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  } else if (p <= pHigh) {
    q = p - 0.5
    r = q * q
    x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p))
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
         ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }

  return x
}

/**
 * Format significance result for display
 */
export function formatSignificanceResult(result: SignificanceResult): {
  summary: string
  controlRate: string
  treatmentRate: string
  improvement: string
  confidence: string
  recommendation: string
} {
  const formatPercent = (n: number) => `${(n * 100).toFixed(2)}%`
  const formatImprovement = (n: number) => {
    const sign = n >= 0 ? "+" : ""
    return `${sign}${n.toFixed(2)}%`
  }

  let summary: string
  let recommendation: string

  if (!result.isSignificant) {
    summary = "Results are not statistically significant yet"
    recommendation = "Continue the experiment to gather more data"
  } else if (result.treatmentBetter) {
    summary = `Treatment is winning with ${result.confidence.toFixed(1)}% confidence`
    recommendation = "Consider implementing the treatment variant"
  } else {
    summary = `Control is winning with ${result.confidence.toFixed(1)}% confidence`
    recommendation = "The control variant performs better - consider keeping it"
  }

  return {
    summary,
    controlRate: formatPercent(result.controlRate),
    treatmentRate: formatPercent(result.treatmentRate),
    improvement: formatImprovement(result.relativeImprovement),
    confidence: `${result.confidence.toFixed(1)}%`,
    recommendation,
  }
}
