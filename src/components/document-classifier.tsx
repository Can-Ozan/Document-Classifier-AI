import { useState, useCallback } from "react"
import { Upload, FileText, Sparkles, Crown, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface ClassificationResult {
  label: string
  confidence: number
  category: string
}

interface DocumentClassifierProps {
  isPremium?: boolean
}

export function DocumentClassifier({ isPremium = false }: DocumentClassifierProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<ClassificationResult[]>([])
  const [dragActive, setDragActive] = useState(false)
  const { toast } = useToast()

  const categories = isPremium 
    ? ['Invoice', 'Contract', 'Resume', 'Report', 'Legal', 'Medical', 'Technical', 'Financial', 'Marketing', 'Academic']
    : ['Invoice', 'Contract', 'Resume', 'Report']

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = Array.from(e.dataTransfer.files)
    processFiles(files)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    processFiles(files)
  }

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return

    const file = files[0]
    if (!file.type.includes('text') && !file.type.includes('pdf')) {
      toast({
        title: "Desteklenmeyen dosya türü",
        description: "Lütfen metin veya PDF dosyası yükleyin.",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setResults([])

    try {
      // Simulate file processing with progress
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i)
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Mock classification results (in real app, would use AI model)
      const mockResults: ClassificationResult[] = [
        { label: "Invoice", confidence: 0.89, category: "Financial" },
        { label: "Contract", confidence: 0.76, category: "Legal" },
        { label: "Report", confidence: 0.65, category: "Business" },
        { label: "Resume", confidence: 0.45, category: "HR" }
      ].slice(0, isPremium ? 4 : 2)

      setResults(mockResults)
      toast({
        title: "Sınıflandırma tamamlandı!",
        description: `${file.name} başarıyla analiz edildi.`
      })
    } catch (error) {
      toast({
        title: "Hata oluştu",
        description: "Dosya işlenirken bir hata oluştu.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Upload Area */}
      <Card 
        className={`relative overflow-hidden border-2 border-dashed transition-all duration-300 ${
          dragActive 
            ? 'border-primary bg-ai-gradient-subtle' 
            : 'border-border hover:border-primary/50'
        } ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-ai-gradient rounded-2xl flex items-center justify-center animate-pulse-glow">
            <Upload className="w-8 h-8 text-white" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Belgeyi Yükleyin</h3>
            <p className="text-muted-foreground">
              Dosyayı buraya sürükleyin veya tıklayarak seçin
            </p>
          </div>
          
          <Button 
            onClick={() => document.getElementById('file-input')?.click()}
            className="bg-ai-gradient hover:opacity-90 text-white"
          >
            <FileText className="w-4 h-4 mr-2" />
            Dosya Seç
          </Button>
          
          <input
            id="file-input"
            type="file"
            className="hidden"
            accept=".txt,.pdf,.doc,.docx"
            onChange={handleFileInput}
          />
          
          {!isPremium && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Crown className="w-4 h-4 text-premium-gold" />
                Premium ile daha fazla kategori ve gelişmiş analiz
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Progress */}
      {isProcessing && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary animate-spin" />
              <span className="font-medium">Belge analiz ediliyor...</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Sınıflandırma Sonuçları</h3>
            </div>
            
            <div className="grid gap-3">
              {results.map((result, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-ai-gradient text-white">
                      {result.label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {result.category}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        %{(result.confidence * 100).toFixed(0)} güven
                      </div>
                    </div>
                    <div className="w-20">
                      <Progress 
                        value={result.confidence * 100} 
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {!isPremium && (
              <div className="mt-4 p-4 bg-premium-gradient rounded-lg text-white text-center">
                <Crown className="w-6 h-6 mx-auto mb-2" />
                <p className="font-medium">Premium ile daha detaylı analiz</p>
                <p className="text-sm opacity-90">6 ek kategori ve güvenlik analizi</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}