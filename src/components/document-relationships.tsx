import { useState, useMemo } from "react"
import { Network, AlertTriangle, TrendingUp, Users, FileText, Calendar, Link2, Eye } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

interface DocumentMetadata {
  id: string
  name: string
  category: string
  uploadDate: Date
  size: number
  extractedData: Record<string, any>
  content: string
  similarity?: number
}

interface DocumentGroup {
  id: string
  name: string
  documents: DocumentMetadata[]
  commonFields: string[]
  relationshipType: 'project' | 'entity' | 'temporal' | 'content'
  confidence: number
}

interface Anomaly {
  id: string
  documentId: string
  type: 'format' | 'content' | 'value' | 'frequency'
  severity: 'low' | 'medium' | 'high'
  description: string
  suggestion: string
  confidence: number
}

interface DocumentRelationshipsProps {
  documents: DocumentMetadata[]
  isPremium: boolean
}

export function DocumentRelationships({ documents, isPremium }: DocumentRelationshipsProps) {
  const [selectedGroup, setSelectedGroup] = useState<DocumentGroup | null>(null)
  const [showAnomalies, setShowAnomalies] = useState(false)

  // Analyze document relationships
  const documentGroups = useMemo(() => {
    if (!isPremium || documents.length < 2) return []
    
    const groups: DocumentGroup[] = []
    
    // Group by entity (e.g., same person, organization)
    const entityGroups = groupByEntity(documents)
    groups.push(...entityGroups)
    
    // Group by temporal proximity
    const temporalGroups = groupByTime(documents)
    groups.push(...temporalGroups)
    
    // Group by content similarity
    const contentGroups = groupByContent(documents)
    groups.push(...contentGroups)
    
    return groups
  }, [documents, isPremium])

  // Detect anomalies
  const anomalies = useMemo(() => {
    if (!isPremium) return []
    
    const detectedAnomalies: Anomaly[] = []
    
    documents.forEach(doc => {
      // Format anomalies
      if (doc.category === 'invoice' && !hasExpectedInvoiceFields(doc)) {
        detectedAnomalies.push({
          id: `format-${doc.id}`,
          documentId: doc.id,
          type: 'format',
          severity: 'medium',
          description: 'Fatura için beklenen alanlar eksik',
          suggestion: 'Fatura numarası, tutar ve tarih alanlarını kontrol edin',
          confidence: 0.85
        })
      }
      
      // Content anomalies
      if (isContentUnusual(doc, documents)) {
        detectedAnomalies.push({
          id: `content-${doc.id}`,
          documentId: doc.id,
          type: 'content',
          severity: 'high',
          description: 'Kategori için olağandışı içerik',
          suggestion: 'Manuel inceleme önerilir - sahte belge olabilir',
          confidence: 0.78
        })
      }
      
      // Value anomalies
      const valueAnomaly = detectValueAnomalies(doc, documents)
      if (valueAnomaly) {
        detectedAnomalies.push(valueAnomaly)
      }
    })
    
    return detectedAnomalies.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
  }, [documents, isPremium])

  const groupByEntity = (docs: DocumentMetadata[]): DocumentGroup[] => {
    const groups: DocumentGroup[] = []
    const entityMap = new Map<string, DocumentMetadata[]>()
    
    docs.forEach(doc => {
      const entities = extractEntities(doc.content)
      entities.forEach(entity => {
        if (!entityMap.has(entity)) {
          entityMap.set(entity, [])
        }
        entityMap.get(entity)!.push(doc)
      })
    })
    
    entityMap.forEach((documents, entity) => {
      if (documents.length > 1) {
        groups.push({
          id: `entity-${entity}`,
          name: `${entity} ile ilgili belgeler`,
          documents,
          commonFields: ['entity'],
          relationshipType: 'entity',
          confidence: 0.9
        })
      }
    })
    
    return groups
  }

  const groupByTime = (docs: DocumentMetadata[]): DocumentGroup[] => {
    const groups: DocumentGroup[] = []
    const timeGroups = new Map<string, DocumentMetadata[]>()
    
    docs.forEach(doc => {
      const monthKey = doc.uploadDate.toISOString().substring(0, 7) // YYYY-MM
      if (!timeGroups.has(monthKey)) {
        timeGroups.set(monthKey, [])
      }
      timeGroups.get(monthKey)!.push(doc)
    })
    
    timeGroups.forEach((documents, monthKey) => {
      if (documents.length > 2) {
        const [year, month] = monthKey.split('-')
        const monthNames = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                           'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
        
        groups.push({
          id: `time-${monthKey}`,
          name: `${monthNames[parseInt(month)]} ${year} belgeleri`,
          documents,
          commonFields: ['uploadDate'],
          relationshipType: 'temporal',
          confidence: 0.7
        })
      }
    })
    
    return groups
  }

  const groupByContent = (docs: DocumentMetadata[]): DocumentGroup[] => {
    const groups: DocumentGroup[] = []
    
    // Simple content similarity grouping
    for (let i = 0; i < docs.length; i++) {
      for (let j = i + 1; j < docs.length; j++) {
        const similarity = calculateContentSimilarity(docs[i], docs[j])
        if (similarity > 0.8) {
          const existingGroup = groups.find(g => 
            g.documents.some(d => d.id === docs[i].id || d.id === docs[j].id)
          )
          
          if (existingGroup) {
            if (!existingGroup.documents.some(d => d.id === docs[i].id)) {
              existingGroup.documents.push(docs[i])
            }
            if (!existingGroup.documents.some(d => d.id === docs[j].id)) {
              existingGroup.documents.push(docs[j])
            }
          } else {
            groups.push({
              id: `content-${i}-${j}`,
              name: 'Benzer içerik',
              documents: [docs[i], docs[j]],
              commonFields: ['content'],
              relationshipType: 'content',
              confidence: similarity
            })
          }
        }
      }
    }
    
    return groups
  }

  const extractEntities = (content: string): string[] => {
    const entities: string[] = []
    
    // Extract person names
    const personPattern = /\b[A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+\s+[A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+\b/g
    let match
    while ((match = personPattern.exec(content)) !== null) {
      entities.push(match[0])
    }
    
    // Extract organizations
    const orgPattern = /\b[A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+\s+(?:Ltd|A\.Ş\.|Inc|Corp|Şirketi|Hastanesi)\b/g
    while ((match = orgPattern.exec(content)) !== null) {
      entities.push(match[0])
    }
    
    return [...new Set(entities)] // Remove duplicates
  }

  const calculateContentSimilarity = (doc1: DocumentMetadata, doc2: DocumentMetadata): number => {
    const words1 = new Set(doc1.content.toLowerCase().split(/\s+/))
    const words2 = new Set(doc2.content.toLowerCase().split(/\s+/))
    
    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])
    
    return intersection.size / union.size // Jaccard similarity
  }

  const hasExpectedInvoiceFields = (doc: DocumentMetadata): boolean => {
    const content = doc.content.toLowerCase()
    return content.includes('fatura') && 
           (content.includes('tutar') || content.includes('amount')) &&
           (content.includes('tarih') || content.includes('date'))
  }

  const isContentUnusual = (doc: DocumentMetadata, allDocs: DocumentMetadata[]): boolean => {
    const sameCategory = allDocs.filter(d => d.category === doc.category && d.id !== doc.id)
    if (sameCategory.length === 0) return false
    
    const avgSimilarity = sameCategory.reduce((sum, other) => 
      sum + calculateContentSimilarity(doc, other), 0) / sameCategory.length
    
    return avgSimilarity < 0.3 // Very different from others in same category
  }

  const detectValueAnomalies = (doc: DocumentMetadata, allDocs: DocumentMetadata[]): Anomaly | null => {
    if (doc.category !== 'invoice') return null
    
    // Extract amounts from invoice content
    const amountMatch = doc.content.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*(?:TL|₺)/g)
    if (!amountMatch) return null
    
    const amount = parseFloat(amountMatch[0].replace(/[^\d,]/g, '').replace(',', '.'))
    const invoices = allDocs.filter(d => d.category === 'invoice' && d.id !== doc.id)
    
    if (invoices.length > 0) {
      const amounts = invoices.map(inv => {
        const match = inv.content.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*(?:TL|₺)/g)
        return match ? parseFloat(match[0].replace(/[^\d,]/g, '').replace(',', '.')) : 0
      }).filter(a => a > 0)
      
      if (amounts.length > 0) {
        const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length
        const deviation = Math.abs(amount - avgAmount) / avgAmount
        
        if (deviation > 2) { // More than 200% deviation
          return {
            id: `value-${doc.id}`,
            documentId: doc.id,
            type: 'value',
            severity: deviation > 5 ? 'high' : 'medium',
            description: `Fatura tutarı normalden ${deviation > 1 ? 'çok yüksek' : 'yüksek'}`,
            suggestion: 'Tutar doğruluğunu kontrol edin',
            confidence: 0.8
          }
        }
      }
    }
    
    return null
  }

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
    }
  }

  if (!isPremium) {
    return (
      <Card className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Belge ilişkileri analizi Premium özelliğidir. Yükseltme yapmak için Premium sayfasını ziyaret edin.
          </AlertDescription>
        </Alert>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Document Groups */}
      {documentGroups.length > 0 && (
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Belge İlişkileri</h3>
              <Badge variant="secondary">{documentGroups.length} grup</Badge>
            </div>
            
            <div className="grid gap-3">
              {documentGroups.map((group) => (
                <div key={group.id} className="p-3 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{group.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {group.relationshipType}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {group.documents.length} belge • %{(group.confidence * 100).toFixed(0)} güven
                      </div>
                    </div>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedGroup(group)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="mt-2">
                    <Progress value={group.confidence * 100} className="h-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
      
      {/* Anomalies */}
      {anomalies.length > 0 && (
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <h3 className="font-semibold">Tespit Edilen Anomaliler</h3>
                <Badge variant="destructive">{anomalies.length}</Badge>
              </div>
              
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowAnomalies(!showAnomalies)}
              >
                {showAnomalies ? 'Gizle' : 'Göster'}
              </Button>
            </div>
            
            {showAnomalies && (
              <div className="space-y-3">
                {anomalies.map((anomaly) => (
                  <div key={anomaly.id} className={`p-3 border rounded-lg ${getSeverityColor(anomaly.severity)}`}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {anomaly.type.toUpperCase()}
                          </Badge>
                          <Badge 
                            variant={anomaly.severity === 'high' ? 'destructive' : 
                                   anomaly.severity === 'medium' ? 'secondary' : 'default'}
                            className="text-xs"
                          >
                            {anomaly.severity.toUpperCase()}
                          </Badge>
                        </div>
                        
                        <p className="text-sm font-medium">{anomaly.description}</p>
                        <p className="text-xs">{anomaly.suggestion}</p>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        %{(anomaly.confidence * 100).toFixed(0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
      
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Toplam Belge</span>
            </div>
            <div className="text-2xl font-bold">{documents.length}</div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">İlişki Grubu</span>
            </div>
            <div className="text-2xl font-bold">{documentGroups.length}</div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="text-sm font-medium">Anomali</span>
            </div>
            <div className="text-2xl font-bold">{anomalies.length}</div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-sm font-medium">Güven Skoru</span>
            </div>
            <div className="text-2xl font-bold">
              {documentGroups.length > 0 
                ? Math.round(documentGroups.reduce((sum, g) => sum + g.confidence, 0) / documentGroups.length * 100)
                : 0}%
            </div>
          </div>
        </Card>
      </div>
      
      {documents.length === 0 && (
        <Card className="p-8">
          <div className="text-center space-y-2">
            <Network className="w-12 h-12 mx-auto text-muted-foreground" />
            <h3 className="font-medium">Henüz Belge Yok</h3>
            <p className="text-sm text-muted-foreground">
              İlişki analizi için en az 2 belge yüklemeniz gerekiyor
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}