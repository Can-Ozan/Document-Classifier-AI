// Utility functions for enhanced document classification

interface CustomCategory {
  id: string
  name: string
  description: string
  keywords: string[]
  extractionFields: Array<{
    id: string
    name: string
    type: 'text' | 'number' | 'date' | 'email' | 'phone'
    required: boolean
    pattern?: string
  }>
  confidenceThreshold: number
  isCustom: boolean
  createdAt: Date
  trainingExamples: number
}

// Zero-shot learning: Calculate category match score
export function calculateCategoryMatch(content: string, category: CustomCategory): number {
  const contentLower = content.toLowerCase()
  const words = contentLower.split(/\s+/)
  
  let matchScore = 0
  let totalKeywords = category.keywords.length
  
  if (totalKeywords === 0) return 0
  
  // Keyword matching with TF-IDF inspired weighting
  category.keywords.forEach(keyword => {
    const keywordLower = keyword.toLowerCase()
    
    // Exact phrase matching (higher weight)
    if (contentLower.includes(keywordLower)) {
      matchScore += 0.8
    }
    
    // Individual word matching (lower weight)
    const keywordWords = keywordLower.split(/\s+/)
    keywordWords.forEach(word => {
      if (words.includes(word)) {
        matchScore += 0.3 / keywordWords.length
      }
    })
  })
  
  // Normalize score
  const normalizedScore = Math.min(matchScore / totalKeywords, 1.0)
  
  // Add semantic similarity bonus (simplified)
  const semanticBonus = calculateSemanticSimilarity(content, category.description)
  
  return Math.min(normalizedScore + semanticBonus * 0.2, 1.0)
}

// Simple semantic similarity based on word overlap
function calculateSemanticSimilarity(content: string, description: string): number {
  const contentWords = new Set(content.toLowerCase().split(/\s+/))
  const descWords = new Set(description.toLowerCase().split(/\s+/))
  
  const intersection = new Set([...contentWords].filter(x => descWords.has(x)))
  const union = new Set([...contentWords, ...descWords])
  
  return intersection.size / union.size
}

// Extract structured data based on category fields
export function extractStructuredData(content: string, category: CustomCategory): Record<string, any> {
  const extractedData: Record<string, any> = {}
  
  category.extractionFields.forEach(field => {
    const value = extractFieldValue(content, field)
    if (value) {
      extractedData[field.name] = value
    }
  })
  
  return extractedData
}

// Extract specific field value based on type and patterns
function extractFieldValue(content: string, field: any): string | null {
  const patterns: Record<string, RegExp[]> = {
    email: [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    ],
    phone: [
      /\b(?:\+90\s?)?(?:\(\d{3}\)\s?)?\d{3}\s?\d{3}\s?\d{2}\s?\d{2}\b/g,
      /\b0\d{3}\s?\d{3}\s?\d{2}\s?\d{2}\b/g
    ],
    date: [
      /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g,
      /\b\d{1,2}\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+\d{4}\b/gi
    ],
    number: [
      /\b\d{1,3}(?:\.\d{3})*(?:,\d{2})?\b/g
    ]
  }
  
  // Use custom pattern if provided
  if (field.pattern) {
    try {
      const customPattern = new RegExp(field.pattern, 'gi')
      const match = customPattern.exec(content)
      if (match) return match[0]
    } catch (e) {
      console.warn('Invalid custom pattern:', field.pattern)
    }
  }
  
  // Use type-based patterns
  const typePatterns = patterns[field.type] || []
  for (const pattern of typePatterns) {
    const match = pattern.exec(content)
    if (match) return match[0]
  }
  
  // Fallback: search for field name followed by value
  const fieldNamePattern = new RegExp(`${field.name}[:\\s]*([A-Za-z0-9\\s\\.\\-@]+)`, 'gi')
  const match = fieldNamePattern.exec(content)
  if (match && match[1]) {
    return match[1].trim()
  }
  
  return null
}

// Detect document anomalies
export function detectDocumentAnomalies(content: string, category: CustomCategory): string[] {
  const anomalies: string[] = []
  
  // Check for missing required fields
  const requiredFields = category.extractionFields.filter(f => f.required)
  requiredFields.forEach(field => {
    const value = extractFieldValue(content, field)
    if (!value) {
      anomalies.push(`Zorunlu alan eksik: ${field.name}`)
    }
  })
  
  // Check content length anomaly
  const expectedLength = category.trainingExamples > 0 ? 500 : 300 // Rough estimate
  if (content.length < expectedLength * 0.3) {
    anomalies.push('Belge çok kısa - eksik bilgi olabilir')
  } else if (content.length > expectedLength * 3) {
    anomalies.push('Belge çok uzun - beklenen formattan farklı')
  }
  
  // Check for suspicious patterns
  if (content.includes('lorem ipsum')) {
    anomalies.push('Test metni tespit edildi')
  }
  
  // Check encoding issues
  if (content.includes('�') || content.includes('??')) {
    anomalies.push('Karakter kodlama problemi tespit edildi')
  }
  
  return anomalies
}

// Active learning feedback integration
export function incorporateFeedback(
  category: CustomCategory, 
  document: string, 
  correctLabel: string, 
  userFeedback: 'correct' | 'incorrect'
): CustomCategory {
  const updatedCategory = { ...category }
  
  if (userFeedback === 'correct') {
    updatedCategory.trainingExamples += 1
    
    // Extract new keywords from correctly classified document
    const newKeywords = extractPotentialKeywords(document)
    newKeywords.forEach(keyword => {
      if (!updatedCategory.keywords.includes(keyword)) {
        updatedCategory.keywords.push(keyword)
      }
    })
  } else {
    // Lower confidence threshold slightly for false positives
    updatedCategory.confidenceThreshold = Math.min(
      updatedCategory.confidenceThreshold + 0.05, 
      0.95
    )
  }
  
  return updatedCategory
}

// Extract potential keywords from document
function extractPotentialKeywords(content: string): string[] {
  const words = content.toLowerCase()
    .replace(/[^\w\sçğıiöşü]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
  
  // Simple frequency analysis
  const frequency: Record<string, number> = {}
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1
  })
  
  // Return top frequent words
  return Object.entries(frequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word)
}