import { useState, useEffect } from "react"
import { Brain, Target, Eye, Calendar, Phone, Mail, User, DollarSign, Hash } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

interface ExtractionResult {
  field: string
  value: string
  confidence: number
  type: 'text' | 'number' | 'date' | 'email' | 'phone'
  position?: { start: number; end: number }
  context?: string
}

interface Entity {
  text: string
  label: string
  confidence: number
  start: number
  end: number
}

interface InformationExtractorProps {
  content: string
  category: string
  extractionFields?: Array<{
    id: string
    name: string
    type: 'text' | 'number' | 'date' | 'email' | 'phone'
    required: boolean
    pattern?: string
  }>
  isPremium: boolean
}

export function InformationExtractor({ content, category, extractionFields = [], isPremium }: InformationExtractorProps) {
  const [extractedData, setExtractedData] = useState<ExtractionResult[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  // NER patterns for different entity types
  const nerPatterns = {
    PERSON: [
      /\b[A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+\s+[A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+\b/g,
      /(?:Dr\.|Doktor|Mr\.|Mrs\.|Ms\.)\s+[A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+\s+[A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+/g
    ],
    ORGANIZATION: [
      /\b[A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+\s+(Ltd|A\.Ş\.|Inc|Corp|Company|Şirketi|Hastanesi|Kliniği)\b/g,
      /\b[A-ZÇĞIİÖŞÜ][A-ZÇĞIİÖŞÜ\s]+(?:Ltd|A\.Ş\.|Inc|Corp|Company|Şirketi|Hastanesi|Kliniği)\b/g
    ],
    DATE: [
      /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g,
      /\b\d{1,2}\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi
    ],
    MONEY: [
      /\b\d{1,3}(?:\.\d{3})*(?:,\d{2})?\s*(?:TL|₺|USD|\$|EUR|€)\b/g,
      /\b(?:TL|₺|USD|\$|EUR|€)\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?\b/g
    ],
    EMAIL: [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    ],
    PHONE: [
      /\b(?:\+90\s?)?(?:\(\d{3}\)\s?)?\d{3}\s?\d{3}\s?\d{2}\s?\d{2}\b/g,
      /\b0\d{3}\s?\d{3}\s?\d{2}\s?\d{2}\b/g
    ],
    ID_NUMBER: [
      /\b\d{11}\b/g, // TC Kimlik No
      /\b[A-Z]\d{8}\b/g // Passport
    ],
    MEDICAL_CODE: [
      /\b[A-Z]\d{2}(?:\.\d{1,2})?\b/g, // ICD-10 codes
      /\b\d{5}-\d{4}-\d{1}\b/g // Medical procedure codes
    ]
  }

  // Enhanced extraction patterns based on document category
  const categorySpecificPatterns = {
    'invoice': {
      'Fatura No': [/(?:fatura\s*no|invoice\s*no|invoice\s*number)[:\s]*([A-Z0-9\-]+)/gi],
      'Toplam Tutar': [/(?:toplam|total|amount)[:\s]*([0-9,.]+\s*(?:TL|₺|USD|\$|EUR|€))/gi],
      'Vergi No': [/(?:vergi\s*no|tax\s*no)[:\s]*(\d+)/gi],
      'Tarih': [/(?:tarih|date)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/gi]
    },
    'medical': {
      'Hasta Adı': [/(?:hasta\s*adı|patient\s*name)[:\s]*([A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+\s+[A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+)/gi],
      'TC No': [/(?:tc\s*no|kimlik\s*no)[:\s]*(\d{11})/gi],
      'Tanı': [/(?:tanı|diagnosis)[:\s]*([A-Z]\d{2}(?:\.\d{1,2})?)/gi],
      'Doktor': [/(?:dr\.|doktor)[:\s]*([A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+\s+[A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+)/gi],
      'Test Sonucu': [/(?:sonuç|result)[:\s]*([0-9,.]+)/gi]
    },
    'contract': {
      'Taraflar': [/(?:taraflar|parties)[:\s]*([A-ZÇĞIİÖŞÜ][a-zçğıiöşü\s]+)/gi],
      'Sözleşme No': [/(?:sözleşme\s*no|contract\s*no)[:\s]*([A-Z0-9\-]+)/gi],
      'Geçerlilik': [/(?:geçerli|valid)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/gi],
      'Değer': [/(?:değer|value|amount)[:\s]*([0-9,.]+\s*(?:TL|₺|USD|\$|EUR|€))/gi]
    }
  }

  const extractEntities = (text: string): Entity[] => {
    const entities: Entity[] = []
    
    Object.entries(nerPatterns).forEach(([label, patterns]) => {
      patterns.forEach(pattern => {
        let match
        while ((match = pattern.exec(text)) !== null) {
          entities.push({
            text: match[0],
            label,
            confidence: 0.85 + Math.random() * 0.1, // Simulate confidence
            start: match.index,
            end: match.index + match[0].length
          })
        }
      })
    })
    
    return entities.sort((a, b) => b.confidence - a.confidence)
  }

  const extractFieldData = (text: string, category: string): ExtractionResult[] => {
    const results: ExtractionResult[] = []
    const categoryPatterns = categorySpecificPatterns[category.toLowerCase() as keyof typeof categorySpecificPatterns]
    
    if (categoryPatterns) {
      Object.entries(categoryPatterns).forEach(([fieldName, patterns]) => {
        patterns.forEach(pattern => {
          const match = pattern.exec(text)
          if (match && match[1]) {
            const fieldType = getFieldType(fieldName)
            results.push({
              field: fieldName,
              value: match[1].trim(),
              confidence: 0.8 + Math.random() * 0.15,
              type: fieldType,
              position: { start: match.index, end: match.index + match[0].length },
              context: text.substring(Math.max(0, match.index - 50), match.index + match[0].length + 50)
            })
          }
        })
      })
    }
    
    // Also extract from custom extraction fields if provided
    extractionFields.forEach(field => {
      const value = extractFieldValue(text, field.name, field.type)
      if (value) {
        results.push({
          field: field.name,
          value,
          confidence: 0.75 + Math.random() * 0.15,
          type: field.type,
          context: `Extracted from custom field: ${field.name}`
        })
      }
    })
    
    return results
  }

  const getFieldType = (fieldName: string): 'text' | 'number' | 'date' | 'email' | 'phone' => {
    if (fieldName.toLowerCase().includes('email') || fieldName.toLowerCase().includes('e-mail')) return 'email'
    if (fieldName.toLowerCase().includes('telefon') || fieldName.toLowerCase().includes('phone')) return 'phone'
    if (fieldName.toLowerCase().includes('tarih') || fieldName.toLowerCase().includes('date')) return 'date'
    if (fieldName.toLowerCase().includes('tutar') || fieldName.toLowerCase().includes('amount') || fieldName.toLowerCase().includes('değer')) return 'number'
    return 'text'
  }

  const extractFieldValue = (text: string, fieldName: string, type: string): string | null => {
    // Simple extraction based on field type and name
    const patterns: Record<string, RegExp[]> = {
      email: [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g],
      phone: [/\b(?:\+90\s?)?(?:\(\d{3}\)\s?)?\d{3}\s?\d{3}\s?\d{2}\s?\d{2}\b/g],
      date: [/\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g],
      number: [/\b\d{1,3}(?:\.\d{3})*(?:,\d{2})?\b/g]
    }
    
    const typePatterns = patterns[type] || []
    for (const pattern of typePatterns) {
      const match = pattern.exec(text)
      if (match) return match[0]
    }
    
    return null
  }

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />
      case 'phone': return <Phone className="w-4 h-4" />
      case 'date': return <Calendar className="w-4 h-4" />
      case 'number': return <Hash className="w-4 h-4" />
      default: return <Target className="w-4 h-4" />
    }
  }

  const getEntityColor = (label: string) => {
    const colors: Record<string, string> = {
      PERSON: 'bg-blue-100 text-blue-700 border-blue-200',
      ORGANIZATION: 'bg-green-100 text-green-700 border-green-200',
      DATE: 'bg-purple-100 text-purple-700 border-purple-200',
      MONEY: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      EMAIL: 'bg-red-100 text-red-700 border-red-200',
      PHONE: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      ID_NUMBER: 'bg-gray-100 text-gray-700 border-gray-200',
      MEDICAL_CODE: 'bg-pink-100 text-pink-700 border-pink-200'
    }
    return colors[label] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  useEffect(() => {
    if (!content || !isPremium) return
    
    setIsProcessing(true)
    setProgress(0)
    
    const processData = async () => {
      // Simulate processing steps
      const steps = [
        'Metin ön işleme...',
        'Varlık tanıma (NER)...',
        'Alan tespiti...',
        'Güven puanları hesaplanıyor...',
        'Sonuçlar hazırlanıyor...'
      ]
      
      for (let i = 0; i < steps.length; i++) {
        setProgress((i + 1) * 20)
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      // Extract entities and structured data
      const extractedEntities = extractEntities(content)
      const extractedFields = extractFieldData(content, category)
      
      setEntities(extractedEntities.slice(0, 10)) // Top 10 entities
      setExtractedData(extractedFields)
      
      setProgress(100)
      setTimeout(() => setIsProcessing(false), 500)
    }
    
    processData()
  }, [content, category, isPremium])

  if (!isPremium) {
    return (
      <Card className="p-4">
        <div className="text-center space-y-2">
          <Brain className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Bilgi çıkarımı Premium özelliğidir
          </p>
        </div>
      </Card>
    )
  }

  if (isProcessing) {
    return (
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary animate-pulse" />
            <span className="font-medium">Bilgi çıkarımı yapılıyor...</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Extracted Structured Data */}
      {extractedData.length > 0 && (
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <h4 className="font-medium">Çıkarılan Bilgiler</h4>
            </div>
            
            <div className="grid gap-3">
              {extractedData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getFieldIcon(item.type)}
                    <div>
                      <div className="font-medium text-sm">{item.field}</div>
                      <div className="text-xs text-muted-foreground">{item.type}</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-mono text-sm">{item.value}</div>
                    <div className="text-xs text-muted-foreground">
                      %{(item.confidence * 100).toFixed(0)} güven
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
      
      {/* Named Entity Recognition Results */}
      {entities.length > 0 && (
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              <h4 className="font-medium">Tespit Edilen Varlıklar (NER)</h4>
            </div>
            
            <div className="space-y-2">
              {entities.map((entity, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${getEntityColor(entity.label)}`}>
                      {entity.label}
                    </Badge>
                    <span className="font-mono text-sm">{entity.text}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    %{(entity.confidence * 100).toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
      
      {extractedData.length === 0 && entities.length === 0 && (
        <Card className="p-4">
          <div className="text-center space-y-2">
            <Target className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Bu belgeden yapılandırılmış bilgi çıkarılamadı
            </p>
            <p className="text-xs text-muted-foreground">
              Daha fazla kategori-özel alan tanımı eklenebilir
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}