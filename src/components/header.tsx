import { FileText, Crown, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { useNavigate } from "react-router-dom"

interface HeaderProps {
  isPremium?: boolean
  onUpgrade?: () => void
}

export function Header({ isPremium = false, onUpgrade }: HeaderProps) {
  const navigate = useNavigate()
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-ai-gradient rounded-xl">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">DokümanAI</h1>
            <p className="text-xs text-muted-foreground">Akıllı Belge Sınıflandırıcı</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/settings')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Ayarlar
          </Button>
          
          {isPremium ? (
            <Badge className="bg-premium-gradient text-white">
              <Crown className="w-3 h-3 mr-1" />
              Premium
            </Badge>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              className="border-premium-gold/50 text-premium-gold hover:bg-premium-gold/10"
              onClick={onUpgrade}
            >
              <Crown className="w-4 h-4 mr-2" />
              Premium
            </Button>
          )}
          
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}