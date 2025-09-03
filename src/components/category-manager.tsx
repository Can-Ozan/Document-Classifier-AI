import { useState, useEffect } from "react"
import { Plus, Trash2, Edit, Save, X, Brain, Target, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

interface Category {
  id: string
  name: string
  description: string
  keywords: string[]
  extractionFields: ExtractionField[]
  confidenceThreshold: number
  isCustom: boolean
  createdAt: Date
  trainingExamples: number
}

interface ExtractionField {
  id: string
  name: string
  type: 'text' | 'number' | 'date' | 'email' | 'phone'
  required: boolean
  pattern?: string
}

interface CategoryManagerProps {
  isPremium: boolean
  onCategoriesChange: (categories: Category[]) => void
}

export function CategoryManager({ isPremium, onCategoriesChange }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newCategory, setNewCategory] = useState<Partial<Category>>({
    name: '',
    description: '',
    keywords: [],
    extractionFields: [],
    confidenceThreshold: 0.7
  })
  const [keywordInput, setKeywordInput] = useState('')
  const { toast } = useToast()

  // Initialize default categories
  useEffect(() => {
    const defaultCategories: Category[] = [
      {
        id: '1',
        name: 'Fatura/Invoice',
        description: 'Fatura ve mali belgeler',
        keywords: ['fatura', 'invoice', 'amount', 'total', 'miktar', 'tutar', 'payment', 'ödeme'],
        extractionFields: [
          { id: '1', name: 'Fatura No', type: 'text', required: true },
          { id: '2', name: 'Toplam Tutar', type: 'number', required: true },
          { id: '3', name: 'Tarih', type: 'date', required: true },
          { id: '4', name: 'Müşteri Email', type: 'email', required: false }
        ],
        confidenceThreshold: 0.8,
        isCustom: false,
        createdAt: new Date(),
        trainingExamples: 150
      },
      {
        id: '2',
        name: 'Tıbbi Rapor/Medical',
        description: 'Sağlık ve tıbbi belgeler',
        keywords: ['sağlık', 'health', 'medical', 'tıbbi', 'hasta', 'patient', 'doktor', 'doctor'],
        extractionFields: [
          { id: '1', name: 'Hasta Adı', type: 'text', required: true },
          { id: '2', name: 'Tanı', type: 'text', required: true },
          { id: '3', name: 'Tarih', type: 'date', required: true },
          { id: '4', name: 'Doktor Adı', type: 'text', required: false }
        ],
        confidenceThreshold: 0.85,
        isCustom: false,
        createdAt: new Date(),
        trainingExamples: 89
      },
      {
        id: '3',
        name: 'Sözleşme/Contract',
        description: 'Yasal sözleşmeler ve anlaşmalar',
        keywords: ['sözleşme', 'contract', 'agreement', 'terms', 'şartlar', 'imza', 'signature'],
        extractionFields: [
          { id: '1', name: 'Taraflar', type: 'text', required: true },
          { id: '2', name: 'Başlangıç Tarihi', type: 'date', required: true },
          { id: '3', name: 'Bitiş Tarihi', type: 'date', required: false },
          { id: '4', name: 'Değer', type: 'number', required: false }
        ],
        confidenceThreshold: 0.8,
        isCustom: false,
        createdAt: new Date(),
        trainingExamples: 67
      }
    ]
    
    setCategories(defaultCategories)
    onCategoriesChange(defaultCategories)
  }, [onCategoriesChange])

  const addKeyword = () => {
    if (keywordInput.trim()) {
      const target = editingCategory || newCategory
      const currentKeywords = target.keywords || []
      if (!currentKeywords.includes(keywordInput.trim())) {
        if (editingCategory) {
          setEditingCategory({
            ...editingCategory,
            keywords: [...currentKeywords, keywordInput.trim()]
          })
        } else {
          setNewCategory({
            ...newCategory,
            keywords: [...currentKeywords, keywordInput.trim()]
          })
        }
      }
      setKeywordInput('')
    }
  }

  const removeKeyword = (keyword: string) => {
    const target = editingCategory || newCategory
    const updatedKeywords = (target.keywords || []).filter(k => k !== keyword)
    
    if (editingCategory) {
      setEditingCategory({ ...editingCategory, keywords: updatedKeywords })
    } else {
      setNewCategory({ ...newCategory, keywords: updatedKeywords })
    }
  }

  const addExtractionField = () => {
    const newField: ExtractionField = {
      id: Date.now().toString(),
      name: '',
      type: 'text',
      required: false
    }
    
    const target = editingCategory || newCategory
    const currentFields = target.extractionFields || []
    
    if (editingCategory) {
      setEditingCategory({
        ...editingCategory,
        extractionFields: [...currentFields, newField]
      })
    } else {
      setNewCategory({
        ...newCategory,
        extractionFields: [...currentFields, newField]
      })
    }
  }

  const updateExtractionField = (fieldId: string, updates: Partial<ExtractionField>) => {
    const target = editingCategory || newCategory
    const updatedFields = (target.extractionFields || []).map(field =>
      field.id === fieldId ? { ...field, ...updates } : field
    )
    
    if (editingCategory) {
      setEditingCategory({ ...editingCategory, extractionFields: updatedFields })
    } else {
      setNewCategory({ ...newCategory, extractionFields: updatedFields })
    }
  }

  const removeExtractionField = (fieldId: string) => {
    const target = editingCategory || newCategory
    const updatedFields = (target.extractionFields || []).filter(field => field.id !== fieldId)
    
    if (editingCategory) {
      setEditingCategory({ ...editingCategory, extractionFields: updatedFields })
    } else {
      setNewCategory({ ...newCategory, extractionFields: updatedFields })
    }
  }

  const saveCategory = () => {
    const categoryToSave = editingCategory || {
      ...newCategory,
      id: Date.now().toString(),
      isCustom: true,
      createdAt: new Date(),
      trainingExamples: 0
    } as Category

    if (!categoryToSave.name || !categoryToSave.description) {
      toast({
        title: "Eksik Bilgi",
        description: "Kategori adı ve açıklaması gereklidir.",
        variant: "destructive"
      })
      return
    }

    let updatedCategories
    if (editingCategory) {
      updatedCategories = categories.map(cat => 
        cat.id === editingCategory.id ? categoryToSave : cat
      )
    } else {
      updatedCategories = [...categories, categoryToSave]
    }

    setCategories(updatedCategories)
    onCategoriesChange(updatedCategories)
    
    setEditingCategory(null)
    setIsAddingNew(false)
    setNewCategory({
      name: '',
      description: '',
      keywords: [],
      extractionFields: [],
      confidenceThreshold: 0.7
    })

    toast({
      title: "✅ Başarılı",
      description: `Kategori ${editingCategory ? 'güncellendi' : 'eklendi'}.`
    })
  }

  const deleteCategory = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId)
    if (category && !category.isCustom) {
      toast({
        title: "❌ İşlem Başarısız",
        description: "Varsayılan kategoriler silinemez.",
        variant: "destructive"
      })
      return
    }

    const updatedCategories = categories.filter(cat => cat.id !== categoryId)
    setCategories(updatedCategories)
    onCategoriesChange(updatedCategories)
    
    toast({
      title: "🗑️ Silindi",
      description: "Kategori başarıyla silindi."
    })
  }

  const startZeroShotTraining = (categoryId: string) => {
    toast({
      title: "🧠 Zero-Shot Öğrenme Başlatıldı",
      description: "AI modeli yeni kategori için öğrenmeye başladı...",
    })
    
    // Simulate zero-shot learning process
    setTimeout(() => {
      const updatedCategories = categories.map(cat =>
        cat.id === categoryId 
          ? { ...cat, trainingExamples: cat.trainingExamples + Math.floor(Math.random() * 20) + 10 }
          : cat
      )
      setCategories(updatedCategories)
      onCategoriesChange(updatedCategories)
      
      toast({
        title: "✅ Öğrenme Tamamlandı",
        description: "Kategori için zero-shot öğrenme başarıyla tamamlandı."
      })
    }, 3000)
  }

  if (!isPremium) {
    return (
      <Card className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Kategori yönetimi Premium özelliğidir. Yükseltme yapmak için Premium sayfasını ziyaret edin.
          </AlertDescription>
        </Alert>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Kategori Yönetimi</h3>
          <p className="text-sm text-muted-foreground">
            Belge kategorilerini yönetin ve yeni türler ekleyin
          </p>
        </div>
        
        <Dialog open={isAddingNew} onOpenChange={setIsAddingNew}>
          <DialogTrigger asChild>
            <Button className="bg-ai-gradient text-white">
              <Plus className="w-4 h-4 mr-2" />
              Kategori Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Kategori Ekle</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Kategori Adı</Label>
                  <Input
                    id="name"
                    value={newCategory.name || ''}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    placeholder="örn: Tedarikçi Sözleşmesi"
                  />
                </div>
                
                <div>
                  <Label htmlFor="threshold">Güven Eşiği</Label>
                  <Input
                    id="threshold"
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={newCategory.confidenceThreshold || 0.7}
                    onChange={(e) => setNewCategory({ ...newCategory, confidenceThreshold: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  value={newCategory.description || ''}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  placeholder="Bu kategori hangi tür belgeleri içerir?"
                />
              </div>
              
              <div>
                <Label>Anahtar Kelimeler</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder="Anahtar kelime ekle"
                    onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                  />
                  <Button onClick={addKeyword} size="sm">Ekle</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(newCategory.keywords || []).map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeKeyword(keyword)}>
                      {keyword} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Bilgi Çıkarım Alanları</Label>
                  <Button onClick={addExtractionField} size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-1" />
                    Alan Ekle
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {(newCategory.extractionFields || []).map((field) => (
                    <div key={field.id} className="flex gap-2 items-center p-2 border rounded">
                      <Input
                        placeholder="Alan adı"
                        value={field.name}
                        onChange={(e) => updateExtractionField(field.id, { name: e.target.value })}
                      />
                      <select
                        value={field.type}
                        onChange={(e) => updateExtractionField(field.id, { type: e.target.value as any })}
                        className="px-3 py-2 border rounded"
                      >
                        <option value="text">Metin</option>
                        <option value="number">Sayı</option>
                        <option value="date">Tarih</option>
                        <option value="email">Email</option>
                        <option value="phone">Telefon</option>
                      </select>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateExtractionField(field.id, { required: e.target.checked })}
                        />
                        Zorunlu
                      </label>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeExtractionField(field.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={saveCategory} className="bg-ai-gradient text-white">
                  <Save className="w-4 h-4 mr-2" />
                  Kaydet
                </Button>
                <Button variant="outline" onClick={() => setIsAddingNew(false)}>
                  İptal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid gap-4">
        {categories.map((category) => (
          <Card key={category.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{category.name}</h4>
                  {category.isCustom && (
                    <Badge variant="outline" className="text-xs">
                      Özel
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {category.trainingExamples} örnek
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground">{category.description}</p>
                
                <div className="flex flex-wrap gap-1">
                  {category.keywords.slice(0, 5).map((keyword, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                  {category.keywords.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{category.keywords.length - 5} daha
                    </Badge>
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {category.extractionFields.length} bilgi alanı • Güven eşiği: %{(category.confidenceThreshold * 100).toFixed(0)}
                </div>
              </div>
              
              <div className="flex gap-2">
                {category.isCustom && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startZeroShotTraining(category.id)}
                  >
                    <Brain className="w-4 h-4" />
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingCategory(category)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                
                {category.isCustom && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteCategory(category.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {/* Edit Category Modal */}
      {editingCategory && (
        <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Kategori Düzenle: {editingCategory.name}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* ... similar form fields as add modal but with editingCategory data ... */}
              <div className="flex gap-2 pt-4">
                <Button onClick={saveCategory} className="bg-ai-gradient text-white">
                  <Save className="w-4 h-4 mr-2" />
                  Güncelle
                </Button>
                <Button variant="outline" onClick={() => setEditingCategory(null)}>
                  İptal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}